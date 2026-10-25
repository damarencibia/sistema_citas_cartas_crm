-- =============================================================
-- Migration 000087: Flujo de credenciales de empleados
-- -------------------------------------------------------------
-- Objetivo (doc 08-authentication, decisión 25/10/2026):
--   El owner/admin asigna una contraseña inicial visible al crear
--   a un empleado y la comparte mano a mano (o por WhatsApp).
--   Cuando el empleado cambia su propia contraseña, el admin pierde
--   el estado de "credencial compartida" de esa cuenta.
--
-- Mecánica sin guardar contraseñas en claro (Supabase usa bcrypt):
--   1. users.initial_password_pending = true  → creado por admin,
--      contraseña compartida aún vigente.
--   2. Trigger AFTER UPDATE OF encrypted_password en auth.users
--      (cualquier cambio de contraseña: cambio propio, recovery o
--      reset por admin) voltea el flag a false y lo audita.
--   3. handle_new_user rama "admin crea miembro" nace con el flag
--      en true (la rama self-registration del owner nace false).
-- =============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS initial_password_pending BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN users.initial_password_pending IS
  'true mientras la contraseña inicial asignada por el admin sigue vigente; se apaga cuando ese usuario cambia su contraseña.';

-- ------------------------------------------------------------
-- Cualquier cambio de contraseña apaga el flag + audit log
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_auth_password_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_row public.users%ROWTYPE;
BEGIN
  SELECT * INTO v_user_row FROM public.users WHERE supabase_user_id = NEW.id;

  IF NOT FOUND THEN
    RETURN NEW; -- usuario de auth sin perfil en la app
  END IF;

  IF v_user_row.initial_password_pending THEN
    UPDATE public.users SET initial_password_pending = false WHERE id = v_user_row.id;

    INSERT INTO public.audit_logs (tenant_id, user_id, action, entity_type, entity_id, details)
    VALUES (
      v_user_row.tenant_id,
      v_user_row.id,
      'initial_password_cleared',
      'user',
      v_user_row.id,
      jsonb_build_object(
        'reason', 'password_changed',
        'auth_user', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_password_updated ON auth.users;
CREATE TRIGGER on_auth_password_updated
  AFTER UPDATE OF encrypted_password ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_password_update();

-- ------------------------------------------------------------
-- handle_new_user: la rama "admin crea miembro" nace pendiente
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_business_name TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_phone TEXT;
  v_role TEXT;
  v_slug TEXT;
  v_suffix INT;
  v_user_id UUID;
BEGIN
  v_business_name := NEW.raw_user_meta_data ->> 'business_name';
  v_first_name := NEW.raw_user_meta_data ->> 'first_name';
  v_last_name := NEW.raw_user_meta_data ->> 'last_name';
  v_phone := NEW.raw_user_meta_data ->> 'phone';

  -- Branch 1: Owner self-registration (business_name proporcionado)
  IF v_business_name IS NOT NULL AND v_business_name != '' THEN
    v_slug := lower(regexp_replace(v_business_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := regexp_replace(v_slug, '^-|-$', '', 'g');
    v_suffix := 0;

    WHILE EXISTS (SELECT 1 FROM tenants WHERE slug = v_slug) LOOP
      v_suffix := v_suffix + 1;
      v_slug := lower(regexp_replace(v_business_name, '[^a-zA-Z0-9]+', '-', 'g'))
                || '-' || v_suffix::TEXT;
      v_slug := regexp_replace(v_slug, '^-|-$', '', 'g');
    END LOOP;

    -- Trial de 14 días (doc 00-modelo de negocio)
    INSERT INTO tenants (name, slug, email, phone, plan_id, status, trial_ends_at)
    VALUES (v_business_name, v_slug, NEW.email, v_phone, 'trial', 'trial', now() + interval '14 days')
    RETURNING id INTO v_tenant_id;

    INSERT INTO users (tenant_id, supabase_user_id, email, phone, first_name, last_name, role)
    VALUES (v_tenant_id, NEW.id, NEW.email, v_phone, v_first_name, v_last_name, 'owner')
    RETURNING id INTO v_user_id;

    -- El owner es staff desde el minuto 0: agenda y portal público funcionan
    INSERT INTO employees (tenant_id, user_id, first_name, last_name, email, phone)
    VALUES (v_tenant_id, v_user_id, COALESCE(v_first_name, 'Propietario'), COALESCE(v_last_name, ''), NEW.email, v_phone);

    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
      'tenant_id', v_tenant_id,
      'role', 'owner'
    )
    WHERE id = NEW.id;

  -- Branch 2: Admin/owner crea a un miembro del equipo (tenant_id en metadata)
  ELSIF (NEW.raw_user_meta_data ->> 'tenant_id') IS NOT NULL THEN
    v_tenant_id := (NEW.raw_user_meta_data ->> 'tenant_id')::uuid;
    v_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'employee');

    INSERT INTO users (tenant_id, supabase_user_id, email, phone, first_name, last_name, role, initial_password_pending)
    VALUES (v_tenant_id, NEW.id, NEW.email, v_phone, v_first_name, v_last_name, v_role, true);

    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
      'tenant_id', v_tenant_id,
      'role', v_role
    )
    WHERE id = NEW.id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
