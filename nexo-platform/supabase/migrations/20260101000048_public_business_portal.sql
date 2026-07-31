-- =============================================================
-- Migration 000048: Public business portal
-- 1. tenants_public_read: anon can look up a business by slug
-- 2. upsert_booking_customer RPC (SECURITY DEFINER): dedup customers
--    by email + tenant_id when a booking is created
-- =============================================================

CREATE POLICY tenants_public_read ON tenants
  FOR SELECT TO anon
  USING (status IN ('trial', 'active') AND deleted_at IS NULL);

CREATE OR REPLACE FUNCTION public.upsert_booking_customer(
  p_tenant_id UUID,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_first TEXT;
  v_last TEXT;
  v_parts TEXT[];
BEGIN
  IF NULLIF(btrim(p_customer_email), '') IS NULL THEN
    RETURN NULL;
  END IF;

  v_parts := regexp_split_to_array(btrim(p_customer_name), '\s+');
  IF array_length(v_parts, 1) > 1 THEN
    v_first := v_parts[1];
    v_last := array_to_string(v_parts[2:], ' ');
  ELSE
    v_first := coalesce(v_parts[1], '');
    v_last := '';
  END IF;

  SELECT id INTO v_customer_id
  FROM customers
  WHERE tenant_id = p_tenant_id
    AND lower(email) = lower(btrim(p_customer_email))
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    INSERT INTO customers (tenant_id, first_name, last_name, email, phone, total_visits, last_visit_at)
    VALUES (p_tenant_id, v_first, v_last, btrim(p_customer_email), NULLIF(btrim(p_customer_phone), ''), 1, now())
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE customers
    SET total_visits = total_visits + 1,
        last_visit_at = now(),
        phone = COALESCE(NULLIF(btrim(p_customer_phone), ''), phone),
        first_name = COALESCE(NULLIF(v_first, ''), first_name),
        last_name = COALESCE(NULLIF(v_last, ''), last_name),
        updated_at = now()
    WHERE id = v_customer_id;
  END IF;

  RETURN v_customer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_booking_customer TO anon, authenticated;
