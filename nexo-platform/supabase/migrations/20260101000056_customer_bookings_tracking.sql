-- =============================================================
-- Migration 000056: Customer booking tracking (magic-link token)
-- 1. customers.access_token + access_token_used_at (un token por
--    cliente+negocio; el mismo enlace lista todas sus reservas)
-- 2. upsert_booking_customer ahora retorna (id, access_token) para
--    que la pantalla de confirmaciÃ³n pueda construir el enlace.
-- 3. get_customer_bookings_by_token: lista reservas del cliente.
-- 4. purge_stale_customer_tokens via pg_cron (3 meses sin uso).
-- =============================================================

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS access_token VARCHAR(32),
  ADD COLUMN IF NOT EXISTS access_token_used_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_access_token
  ON customers (access_token)
  WHERE access_token IS NOT NULL AND deleted_at IS NULL;

-- Backfill para clientes existentes
UPDATE customers
SET access_token = encode(extensions.gen_random_bytes(16), 'hex'),
    access_token_used_at = now()
WHERE access_token IS NULL;

-- El tipo de retorno cambia de UUID a TABLE (id, access_token), por lo que
-- la funciÃ³n existente debe eliminarse antes de redefinirla.
DROP FUNCTION IF EXISTS public.upsert_booking_customer(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.upsert_booking_customer(
  p_tenant_id UUID,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT
)
RETURNS TABLE (id UUID, access_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_token TEXT;
  v_first TEXT;
  v_last TEXT;
  v_parts TEXT[];
BEGIN
  IF NULLIF(btrim(p_customer_email), '') IS NULL THEN
    RETURN;
  END IF;

  v_parts := regexp_split_to_array(btrim(p_customer_name), '\s+');
  IF array_length(v_parts, 1) > 1 THEN
    v_first := v_parts[1];
    v_last := array_to_string(v_parts[2:], ' ');
  ELSE
    v_first := coalesce(v_parts[1], '');
    v_last := '';
  END IF;

  SELECT c.id INTO v_customer_id
  FROM customers c
  WHERE c.tenant_id = p_tenant_id
    AND lower(c.email) = lower(btrim(p_customer_email))
    AND c.deleted_at IS NULL
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    v_token := encode(extensions.gen_random_bytes(16), 'hex');
    INSERT INTO customers AS c (tenant_id, first_name, last_name, email, phone, total_visits, last_visit_at, access_token, access_token_used_at)
    VALUES (p_tenant_id, v_first, v_last, btrim(p_customer_email), NULLIF(btrim(p_customer_phone), ''), 1, now(), v_token, now())
    RETURNING c.id INTO v_customer_id;
  ELSE
    UPDATE customers c
    SET total_visits = c.total_visits + 1,
        last_visit_at = now(),
        phone = COALESCE(NULLIF(btrim(p_customer_phone), ''), c.phone),
        first_name = COALESCE(NULLIF(v_first, ''), c.first_name),
        last_name = COALESCE(NULLIF(v_last, ''), c.last_name),
        access_token = COALESCE(c.access_token, encode(extensions.gen_random_bytes(16), 'hex')),
        access_token_used_at = COALESCE(c.access_token_used_at, now()),
        updated_at = now()
    WHERE c.id = v_customer_id;

    SELECT c.access_token INTO v_token FROM customers c WHERE c.id = v_customer_id;
  END IF;

  RETURN QUERY SELECT v_customer_id, v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_booking_customer(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_customer_bookings_by_token(p_token TEXT)
RETURNS TABLE (
  booking_id UUID,
  tenant_id UUID,
  date DATE,
  start_time TIME,
  end_time TIME,
  status TEXT,
  service_name TEXT,
  employee_name TEXT,
  cancelled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_tenant_id UUID;
  v_email TEXT;
BEGIN
  SELECT c.id, c.tenant_id, c.email INTO v_customer_id, v_tenant_id, v_email
  FROM customers c
  WHERE c.access_token = p_token
    AND c.deleted_at IS NULL
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE customers SET access_token_used_at = now() WHERE id = v_customer_id;

  RETURN QUERY
  SELECT b.id::UUID, b.tenant_id::UUID, b.date, b.start_time, b.end_time,
         b.status::TEXT,
         COALESCE(s.name::TEXT, ''),
         TRIM(COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, ''))::TEXT,
         b.cancelled_at
  FROM bookings b
  LEFT JOIN services s ON s.id = b.service_id
  LEFT JOIN employees e ON e.id = b.employee_id
  WHERE b.tenant_id = v_tenant_id
    AND b.deleted_at IS NULL
    AND (b.customer_id = v_customer_id
         OR (b.customer_id IS NULL AND b.customer_email IS NOT NULL AND lower(b.customer_email) = lower(v_email)))
  ORDER BY b.date DESC, b.start_time DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_bookings_by_token(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.purge_stale_customer_tokens()
RETURNS void
LANGUAGE sql
AS $$
  UPDATE customers
  SET access_token = NULL, access_token_used_at = NULL
  WHERE access_token IS NOT NULL
    AND access_token_used_at < now() - interval '3 months';
$$;

SELECT cron.schedule(
  'purge-stale-customer-tokens',
  '0 3 * * *',
  $$SELECT purge_stale_customer_tokens()$$
);
