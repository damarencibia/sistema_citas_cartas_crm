-- Fix employee auth users that were created by old edge function (v1)
-- Old edge function put tenant_id/role in app_metadata, but the trigger
-- handle_new_user() checks raw_user_meta_data for tenant_id, so no users
-- row was created and raw_app_meta_data was never updated.
--
-- For each auth user with role=employee (or other non-super_admin) that
-- has NO corresponding row in public.users, insert one.

DO $$
DECLARE
  v_rec RECORD;
  v_user_id UUID;
BEGIN
  FOR v_rec IN
    SELECT
      au.id AS auth_user_id,
      au.email,
      au.raw_user_meta_data ->> 'first_name' AS first_name,
      au.raw_user_meta_data ->> 'last_name' AS last_name,
      au.raw_app_meta_data ->> 'tenant_id' AS tenant_id,
      COALESCE(au.raw_app_meta_data ->> 'role', 'employee') AS role
    FROM auth.users au
    WHERE au.raw_app_meta_data ->> 'tenant_id' IS NOT NULL
      AND au.raw_app_meta_data ->> 'role' IS NOT NULL
      AND au.raw_app_meta_data ->> 'role' != 'super_admin'
      AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.supabase_user_id = au.id)
  LOOP
    INSERT INTO public.users (tenant_id, supabase_user_id, email, first_name, last_name, role)
    VALUES (
      v_rec.tenant_id::uuid,
      v_rec.auth_user_id,
      v_rec.email,
      COALESCE(v_rec.first_name, 'Employee'),
      COALESCE(v_rec.last_name, 'User'),
      v_rec.role
    )
    RETURNING id INTO v_user_id;

    -- Update raw_app_meta_data to ensure JWT has correct claims
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
      'tenant_id', v_rec.tenant_id::uuid,
      'role', v_rec.role
    )
    WHERE id = v_rec.auth_user_id;

    -- Link existing employees record if email matches
    UPDATE public.employees
    SET user_id = v_user_id,
        email = COALESCE(employees.email, v_rec.email)
    WHERE user_id IS NULL
      AND tenant_id = v_rec.tenant_id::uuid
      AND (
        email = v_rec.email
        OR (email IS NULL AND first_name ILIKE COALESCE(v_rec.first_name, '') || '%')
      );

    RAISE NOTICE 'Fixed user: % (%), tenant: %, role: %', v_rec.email, v_rec.auth_user_id, v_rec.tenant_id, v_rec.role;
  END LOOP;
END $$;
