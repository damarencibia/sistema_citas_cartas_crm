// Edge Function: deactivate-team-member
// Soft-deletea un empleado y desactiva su usuario auth (ban) para que
// no pueda iniciar sesión. Solo owners y admins del mismo tenant pueden
// desactivar. No se permite desactivar a un owner.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
        JSON.stringify({ error: 'Only owners and admins can deactivate team members' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json();
    const { employee_id } = body;

    if (!employee_id) {
      return new Response(
        JSON.stringify({ error: 'employee_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, tenant_id, user_id')
      .eq('id', employee_id)
      .single();

    if (employeeError || !employee) {
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

    let supabaseUserId: string | null = null;
    let userProfileId: string | null = employee.user_id ?? null;

    if (userProfileId) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('id, supabase_user_id, role')
        .eq('id', userProfileId)
        .single();

      if (userProfile) {
        if (userProfile.role === 'owner') {
          return new Response(
            JSON.stringify({ error: 'Cannot deactivate an owner' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        supabaseUserId = userProfile.supabase_user_id ?? null;
      }
    }

    if (supabaseUserId) {
      const { error: banError } = await supabase.auth.admin.updateUserById(supabaseUserId, {
        banned: true,
      } as any);

      if (banError) {
        const { error: softDeleteError } = await supabase.auth.admin.deleteUser(supabaseUserId, {
          shouldSoftDelete: true,
        });
        if (softDeleteError) {
          return new Response(
            JSON.stringify({ error: `Failed to deactivate auth user: ${softDeleteError.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }
    }

    const now = new Date().toISOString();

    if (userProfileId) {
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ is_active: false, deleted_at: now, updated_at: now })
        .eq('id', userProfileId);
      if (userUpdateError) {
        return new Response(
          JSON.stringify({ error: `Failed to deactivate user profile: ${userUpdateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const { error: employeeUpdateError } = await supabase
      .from('employees')
      .update({ is_active: false, deleted_at: now, updated_at: now })
      .eq('id', employee_id);
    if (employeeUpdateError) {
      return new Response(
        JSON.stringify({ error: `Failed to deactivate employee: ${employeeUpdateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, employee_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
