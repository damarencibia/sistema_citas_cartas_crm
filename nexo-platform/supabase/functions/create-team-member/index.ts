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
        JSON.stringify({ error: 'Only owners and admins can create team members' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json();
    const { email, password, first_name, last_name, role, phone, color, category_ids } = body;

    if (!email || !password || !first_name || !last_name) {
      return new Response(
        JSON.stringify({ error: 'email, password, first_name, and last_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!['admin', 'employee'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'role must be admin or employee' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Sin pre-check de email duplicado: auth.admin.createUser ya devuelve
    // un error claro y el listUsers global es O(n) + race condition.

    const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        tenant_id: callerTenantId,
        role,
      },
    });

    if (createError) {
      console.error('Auth user creation error:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    await new Promise((r) => setTimeout(r, 200));

    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_user_id', authUser.user.id)
      .single();

    let employeeId: string | null = null;

    if (userProfile) {
      const { data: emp, error: empError } = await supabase
        .from('employees')
        .insert({
          tenant_id: callerTenantId,
          user_id: userProfile.id,
          first_name,
          last_name,
          email: email,
          phone: phone ?? null,
          color: color ?? '#1976D2',
          is_active: true,
        })
        .select('id')
        .single();

      if (empError) {
        console.error('Employee creation error:', empError);
      } else {
        employeeId = emp.id;

        // Vincula el empleado a CATEGORÍAS (nuevo modelo): el admin ya
        // no asigna servicios individuales; el empleado los elige luego
        // en "Mis Servicios". Autohabilitamos los servicios de sus
        // categorías como estado inicial razonable.
        if (category_ids && Array.isArray(category_ids) && category_ids.length > 0) {
          const categoryLinks = category_ids.map((cid: string) => ({
            tenant_id: callerTenantId,
            employee_id: employeeId,
            category_id: cid,
          }));
          const { error: catError } = await supabase
            .from('employee_categories')
            .insert(categoryLinks);
          if (catError) {
            console.error('Category link error:', catError);
          }

          const { data: catServices, error: catServicesError } = await supabase
            .from('services')
            .select('id')
            .in('category_id', category_ids)
            .is('deleted_at', null);

          if (catServicesError) {
            console.error('Category services fetch error:', catServicesError);
          } else if (catServices && catServices.length > 0) {
            const serviceLinks = catServices.map((s) => ({
              employee_id: employeeId,
              service_id: s.id,
            }));
            const { error: seedError } = await supabase
              .from('employee_services')
              .upsert(serviceLinks, { ignoreDuplicates: true });
            if (seedError) {
              console.error('Service seed error:', seedError);
            }
          }
        }

        // Auditoría de creación de credenciales (la contraseña no se guarda)
        await supabase.from('audit_logs').insert({
          tenant_id: callerTenantId,
          user_id: userProfile.id,
          action: 'team_member_created',
          entity_type: 'employee',
          entity_id: employeeId,
          details: { role, created_by: caller.id },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authUser.user.id,
          email: authUser.user.email,
        },
        employee_id: employeeId,
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
