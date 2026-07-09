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
  v_slug TEXT;
  v_suffix INT;
BEGIN
  v_business_name := NEW.raw_user_meta_data ->> 'business_name';
  v_first_name := NEW.raw_user_meta_data ->> 'first_name';
  v_last_name := NEW.raw_user_meta_data ->> 'last_name';

  -- Only create tenant if business_name is provided (registration flow)
  IF v_business_name IS NOT NULL AND v_business_name != '' THEN
    -- Generate unique slug
    v_slug := lower(regexp_replace(v_business_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := regexp_replace(v_slug, '^-|-$', '', 'g');
    v_suffix := 0;

    WHILE EXISTS (SELECT 1 FROM tenants WHERE slug = v_slug) LOOP
      v_suffix := v_suffix + 1;
      v_slug := lower(regexp_replace(v_business_name, '[^a-zA-Z0-9]+', '-', 'g'))
                || '-' || v_suffix::TEXT;
      v_slug := regexp_replace(v_slug, '^-|-$', '', 'g');
    END LOOP;

    INSERT INTO tenants (name, slug, email)
    VALUES (v_business_name, v_slug, NEW.email)
    RETURNING id INTO v_tenant_id;

    INSERT INTO users (tenant_id, supabase_user_id, email, first_name, last_name, role)
    VALUES (v_tenant_id, NEW.id, NEW.email, v_first_name, v_last_name, 'owner');

    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
      'tenant_id', v_tenant_id,
      'role', 'owner'
    )
    WHERE id = NEW.id;

  -- If no business_name, try to find an existing tenant invitation (employee invite flow)
  ELSIF NEW.email IS NOT NULL THEN
    NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
