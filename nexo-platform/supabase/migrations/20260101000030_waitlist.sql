-- =============================================================
-- Migration 000030: Waitlist
-- =============================================================
-- 1. waitlist table
-- 2. RPC: promote_from_waitlist (auto-promote on cancellation)
-- 3. RPC: get_waitlist_count
-- =============================================================

-- 1. waitlist table
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  preferred_date DATE NOT NULL,
  preferred_time_start TIME,
  preferred_time_end TIME,
  customer_name VARCHAR(150) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(30),
  position INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','notified','converted','expired','cancelled')),
  notified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '48 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_waitlist_tenant_status ON waitlist(tenant_id, status, preferred_date);
CREATE INDEX idx_waitlist_lookup ON waitlist(tenant_id, service_id, employee_id, preferred_date, status);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY waitlist_tenant_isolation ON waitlist
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

CREATE POLICY waitlist_insert_auth ON waitlist
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

CREATE POLICY waitlist_public_insert ON waitlist
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY waitlist_public_read ON waitlist
  FOR SELECT TO anon
  USING (true);

-- 2. RPC: promote_from_waitlist
-- Called when a booking is cancelled. Finds the first waiting entry for
-- the same service/employee/date and converts it into a booking.
CREATE OR REPLACE FUNCTION promote_from_waitlist(
  p_tenant_id UUID,
  p_service_id UUID,
  p_employee_id UUID,
  p_date DATE,
  p_slot_start TIME,
  p_slot_end TIME
)
RETURNS TABLE (
  waitlist_id UUID,
  customer_name VARCHAR(150),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(30)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Find the first waiting entry
  RETURN QUERY
  SELECT w.id, w.customer_name, w.customer_email, w.customer_phone
  FROM waitlist w
  WHERE w.tenant_id = p_tenant_id
    AND w.service_id = p_service_id
    AND (w.employee_id = p_employee_id OR w.employee_id IS NULL)
    AND w.preferred_date = p_date
    AND w.status = 'waiting'
    AND w.expires_at > now()
  ORDER BY w.position, w.created_at
  LIMIT 1;

  -- Mark it as converted
  UPDATE waitlist
  SET status = 'converted',
      updated_at = now()
  WHERE id IN (
    SELECT w2.id FROM waitlist w2
    WHERE w2.tenant_id = p_tenant_id
      AND w2.service_id = p_service_id
      AND (w2.employee_id = p_employee_id OR w2.employee_id IS NULL)
      AND w2.preferred_date = p_date
      AND w2.status = 'waiting'
      AND w2.expires_at > now()
    ORDER BY w2.position, w2.created_at
    LIMIT 1
  );
END;
$$;

-- 3. RPC: get_waitlist_count for a specific slot
CREATE OR REPLACE FUNCTION get_waitlist_count(
  p_tenant_id UUID,
  p_service_id UUID,
  p_employee_id UUID,
  p_date DATE
)
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INT
  FROM waitlist w
  WHERE w.tenant_id = p_tenant_id
    AND w.service_id = p_service_id
    AND (w.employee_id = p_employee_id OR w.employee_id IS NULL)
    AND w.preferred_date = p_date
    AND w.status = 'waiting'
    AND w.expires_at > now();
$$;
