-- =============================================================
-- Migration 000086: Flujo de registro completo
-- -------------------------------------------------------------
-- 1. El trigger handle_new_user (rama self-registration) ahora:
--    a) Guarda el teléfono del propietario (users.phone y tenants.phone).
--    b) Crea el negocio en trial: plan='trial', trial_ends_at = +14 días.
--    c) Crea la fila employees del owner y la vincula (user_id) —
--       el negocio queda reservable desde el registro (docs 08/22).
-- 2. Rama admin-create_USERS: persiste phone si viene en metadata.
--
-- NOTA API (sin SQL): la verificación de email se desactiva —
-- ya no es requisito para crear la cuenta:
--   PATCH /v1/projects/{ref}/config/auth  →  {"mailer_autoconfirm": true}
-- =============================================================

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

    INSERT INTO users (tenant_id, supabase_user_id, email, phone, first_name, last_name, role)
    VALUES (v_tenant_id, NEW.id, NEW.email, v_phone, v_first_name, v_last_name, v_role);

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
