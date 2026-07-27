-- Migration: Waitlist enhancements for intelligent auto-promotion
-- Adds: preference type, offer tracking columns, public accept/decline token

-- 1. Add preference column (exact time vs flexible)
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS preference VARCHAR(10) NOT NULL DEFAULT 'exact'
  CHECK (preference IN ('exact', 'flexible'));

-- 2. Add offer tracking columns
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS offered_slot_date DATE;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS offered_slot_time TIME;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS offer_expires_at TIMESTAMPTZ;
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS offer_token VARCHAR(64);

-- 3. Rename expires_at → entry_expires_at (distinguish from offer expiry)
ALTER TABLE waitlist RENAME COLUMN expires_at TO entry_expires_at;

-- 4. Index for active offers lookup
CREATE INDEX IF NOT EXISTS idx_waitlist_active_offers
  ON waitlist(tenant_id, status)
  WHERE status = 'notified';

-- 5. Index for flexible matching (same date, any time)
CREATE INDEX IF NOT EXISTS idx_waitlist_flexible_lookup
  ON waitlist(tenant_id, service_id, preferred_date, status)
  WHERE preference = 'flexible' AND status = 'waiting';

-- 6. Unique constraint on offer_token (for public accept/decline links)
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_offer_token
  ON waitlist(offer_token)
  WHERE offer_token IS NOT NULL;

-- 7. Update promote_from_waitlist RPC to set offer fields instead of direct conversion
DROP FUNCTION IF EXISTS promote_from_waitlist(UUID, UUID, UUID, DATE, TIME, TIME);

CREATE OR REPLACE FUNCTION promote_from_waitlist(
  p_tenant_id UUID,
  p_service_id UUID,
  p_employee_id UUID,
  p_date DATE,
  p_slot_start TIME,
  p_slot_end TIME
)
RETURNS TABLE (
  id UUID,
  customer_name VARCHAR(150),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(30),
  preference VARCHAR(10)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE waitlist w SET
    status = 'notified',
    notified_at = now(),
    offered_slot_date = p_date,
    offered_slot_time = p_slot_start,
    offer_expires_at = now() + INTERVAL '15 minutes',
    offer_token = encode(gen_random_bytes(32), 'hex'),
    updated_at = now()
  WHERE w.id = (
    SELECT w2.id FROM waitlist w2
    WHERE w2.tenant_id = p_tenant_id
      AND w2.service_id = p_service_id
      AND (w2.employee_id = p_employee_id OR w2.employee_id IS NULL)
      AND w2.preferred_date = p_date
      AND w2.status = 'waiting'
      AND w2.entry_expires_at > now()
    ORDER BY w2.preference DESC, w2.position ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING w.id, w.customer_name, w.customer_email, w.customer_phone, w.preference;
END;
$$;

-- 8. Function to accept a waitlist offer (public link)
CREATE OR REPLACE FUNCTION accept_waitlist_offer(
  p_offer_token VARCHAR(64)
)
RETURNS TABLE (
  waitlist_id UUID,
  tenant_id UUID,
  service_id UUID,
  employee_id UUID,
  preferred_date DATE,
  offered_slot_time TIME,
  customer_name VARCHAR(150),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(30)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry RECORD;
BEGIN
  SELECT w.* INTO v_entry
  FROM waitlist w
  WHERE w.offer_token = p_offer_token
    AND w.status = 'notified'
    AND w.offer_expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Oferta no encontrada o expirada';
  END IF;

  UPDATE waitlist SET status = 'converted', updated_at = now()
  WHERE w.id = v_entry.id;

  RETURN QUERY
  SELECT v_entry.id, v_entry.tenant_id, v_entry.service_id, v_entry.employee_id,
         v_entry.preferred_date, v_entry.offered_slot_time,
         v_entry.customer_name, v_entry.customer_email, v_entry.customer_phone;
END;
$$;

-- 9. Function to decline a waitlist offer (public link)
CREATE OR REPLACE FUNCTION decline_waitlist_offer(
  p_offer_token VARCHAR(64)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry RECORD;
BEGIN
  SELECT id, tenant_id, service_id, employee_id, preferred_date INTO v_entry
  FROM waitlist
  WHERE offer_token = p_offer_token
    AND status = 'notified';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE waitlist SET status = 'expired', updated_at = now()
  WHERE id = v_entry.id;

  RETURN TRUE;
END;
$$;

-- 10. Function to expire stale offers (runs via pg_cron every minute)
CREATE OR REPLACE FUNCTION expire_waitlist_offers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE waitlist SET status = 'expired', updated_at = now()
  WHERE status = 'notified'
    AND offer_expires_at < now();
END;
$$;
