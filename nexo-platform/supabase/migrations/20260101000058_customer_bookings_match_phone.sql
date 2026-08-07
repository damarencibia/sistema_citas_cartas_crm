-- =============================================================
-- Migration 000058: Match bookings by email OR phone in
-- get_customer_bookings_by_token
-- TelÃ©fonos: solo Cuba con prefijo +53 (8 dÃ­gitos de suscriptor).
-- normalize_phone devuelve los Ãºltimos 8 dÃ­gitos para que
-- '+5355173448', '53-5517-3448' y '55173448' sean equivalentes.
-- =============================================================

CREATE OR REPLACE FUNCTION public.normalize_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_phone IS NULL OR btrim(p_phone) = '' THEN NULL
    ELSE NULLIF(right(regexp_replace(p_phone, '\D', '', 'g'), 8), '')
  END;
$$;

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
  v_phone TEXT;
BEGIN
  SELECT c.id, c.tenant_id, c.email, c.phone INTO v_customer_id, v_tenant_id, v_email, v_phone
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
         OR (b.customer_email IS NOT NULL AND lower(b.customer_email) = lower(v_email))
         OR (b.customer_phone IS NOT NULL AND normalize_phone(b.customer_phone) = normalize_phone(v_phone)))
  ORDER BY b.date DESC, b.start_time DESC;
END;
$$;
