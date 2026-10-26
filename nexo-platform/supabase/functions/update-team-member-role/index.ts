import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Cambia el rol de un miembro del equipo (excepto el owner):
// actualiza users.role Y el claim del JWT (app_metadata.role).
// Requiere que el empleado vuelva a iniciar sesión para que el
// nuevo claim esté en su token.
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
        JSON.stringify({ error: 'Only owners and admins can change member roles' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json();
    const { employee_id, role } = body;

    if (!employee_id || !['admin', 'employee'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'employee_id and role (admin|employee) are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // El empleado debe existir y pertenecer al tenant del caller
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, tenant_id, user_id, first_name, last_name, deleted_at')
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

    // El owner no cambia de rol
    if (profile.role === 'owner') {
      return new Response(
        JSON.stringify({ error: 'Cannot change the owner role' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (profile.role === role) {
      return new Response(JSON.stringify({ success: true, unchanged: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Perfil en la app
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ role })
      .eq('id', profile.id);

    if (userUpdateError) {
      console.error('Users role update error:', userUpdateError);
      return new Response(
        JSON.stringify({ error: 'Could not update user role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Claim del JWT: el rol debe estar en app_metadata para el RLS
    const { error: claimError } = await supabase.auth.admin.updateUserById(
      profile.supabase_user_id,
      { app_metadata: { role, tenant_id: callerTenantId } },
    );

    if (claimError) {
      console.error('App metadata update error:', claimError);
      return new Response(
        JSON.stringify({ error: 'Role updated in profile but claims could not be refreshed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 3. Auditoría
    await supabase.from('audit_logs').insert({
      tenant_id: callerTenantId,
      user_id: profile.id,
      action: 'team_member_role_changed',
      entity_type: 'employee',
      entity_id: employee.id,
      details: { previous_role: profile.role, new_role: role, changed_by: caller.id },
    });

    return new Response(
      JSON.stringify({ success: true, previous_role: profile.role, new_role: role }),
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
