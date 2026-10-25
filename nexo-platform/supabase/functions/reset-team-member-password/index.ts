import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Genera una contraseña temporal legible (sin caracteres ambiguos)
function generatePassword(length = 10): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const random = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(random, (b) => alphabet[b % alphabet.length]).join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const anonSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerError } = await anonSupabase.auth.getUser();
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const callerTenantId = caller.app_metadata?.tenant_id;
    const callerRole = caller.app_metadata?.role;

    if (!callerTenantId || !['owner', 'admin'].includes(callerRole)) {
      return new Response(
        JSON.stringify({ error: 'Only owners and admins can reset member passwords' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json();
    const { employee_id, password } = body;

    if (!employee_id) {
      return new Response(
        JSON.stringify({ error: 'employee_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const newPassword = password ?? generatePassword();
    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // El empleado debe existir y pertenecer al tenant del caller
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, tenant_id, user_id, email, first_name, last_name, deleted_at')
      .eq('id', employee_id)
      .single();

    if (empError || !employee) {
      return new Response(
        JSON.stringify({ error: 'Employee not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (employee.tenant_id !== callerTenantId) {
      return new Response(
        JSON.stringify({ error: 'Employee does not belong to your tenant' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (employee.deleted_at) {
      return new Response(
        JSON.stringify({ error: 'This employee is deactivated' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Necesita cuenta de auth (perfil de usuario) para tener contraseña
    if (!employee.user_id) {
      return new Response(
        JSON.stringify({ error: 'This employee has no user account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, supabase_user_id, role')
      .eq('id', employee.user_id)
      .single();

    if (profileError || !profile?.supabase_user_id) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // El admin no puede "reapropiarse" de la cuenta del propio owner
    if (profile.role === 'owner') {
      return new Response(
        JSON.stringify({ error: 'Cannot reset the owner password' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      profile.supabase_user_id,
      { password: newPassword },
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // El trigger on_auth_password_updated voltea el flag a false al cambiar
    // la contraseña; aquí la marcamos de nuevo como "credencial compartida
    // pendiente de cambio" porque acaba de ser entregada por el admin.
    await supabase
      .from('users')
      .update({ initial_password_pending: true })
      .eq('id', profile.id);

    // Auditoría: reset administrativo de credenciales (sin guardar la clave)
    await supabase.from('audit_logs').insert({
      tenant_id: callerTenantId,
      user_id: profile.id,
      action: 'password_reset_by_admin',
      entity_type: 'employee',
      entity_id: employee.id,
      details: { reset_by: caller.id, generated: !password },
    });

    return new Response(
      JSON.stringify({
        success: true,
        credentials: {
          email: employee.email,
          password: newPassword,
          generated: !password,
        },
        initial_password_pending: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
