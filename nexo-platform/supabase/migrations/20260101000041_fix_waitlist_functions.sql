-- Fix waitlist functions (migration 000039 had bugs)

-- 1. Fix promote_from_waitlist: add offer_token to return type
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
  preference VARCHAR(10),
  offer_token VARCHAR(64),
  offered_slot_date DATE,
  offered_slot_time TIME,
  offer_expires_at TIMESTAMPTZ
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
  RETURNING w.id, w.customer_name, w.customer_email, w.customer_phone,
            w.preference, w.offer_token, w.offered_slot_date,
            w.offered_slot_time, w.offer_expires_at;
END;
$$;

-- 2. Fix accept_waitlist_offer: alias bug + create booking directly
CREATE OR REPLACE FUNCTION accept_waitlist_offer(
  p_token VARCHAR(64)
)
RETURNS TABLE (
  booking_id UUID,
  error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry RECORD;
  v_booking_id UUID;
  v_duration INT;
  v_end_time TIME;
  v_initial_status TEXT;
  v_requires_approval BOOLEAN;
BEGIN
  SELECT w.* INTO v_entry
  FROM waitlist w
  WHERE w.offer_token = p_token
    AND w.status = 'notified'
    AND w.offer_expires_at > now();

  IF NOT FOUND THEN
    error := 'Oferta no encontrada, expirada o ya canjeada';
    booking_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Mark waitlist entry as converted
  UPDATE waitlist SET status = 'converted', updated_at = now()
  WHERE id = v_entry.id;

  -- Get service duration and approval requirement
  SELECT s.duration_minutes, s.requires_approval
  INTO v_duration, v_requires_approval
  FROM services s WHERE s.id = v_entry.service_id;

  v_end_time := v_entry.offered_slot_time + (v_duration || ' minutes')::INTERVAL;
  v_initial_status := CASE WHEN v_requires_approval THEN 'pending_approval' ELSE 'confirmed' END;

  -- Resolve employee_id: use entry's or first available for the service
  IF v_entry.employee_id IS NULL THEN
    SELECT se2.employee_id INTO v_entry.employee_id
    FROM service_employees se2
    WHERE se2.service_id = v_entry.service_id
    LIMIT 1;
  END IF;

  -- Create the booking
  INSERT INTO bookings (
    tenant_id, service_id, employee_id,
    date, start_time, end_time,
    customer_name, customer_email, customer_phone,
    source, status, participant_count
  ) VALUES (
    v_entry.tenant_id, v_entry.service_id, v_entry.employee_id,
    v_entry.preferred_date, v_entry.offered_slot_time, v_end_time,
    v_entry.customer_name, v_entry.customer_email, v_entry.customer_phone,
    'online', v_initial_status, 1
  )
  RETURNING id INTO v_booking_id;
  RETURNING id INTO v_booking_id;

  booking_id := v_booking_id;
  error := NULL;
  RETURN NEXT;
END;
$$;

-- 3. Fix decline_waitlist_offer: return TABLE with success + error
CREATE OR REPLACE FUNCTION decline_waitlist_offer(
  p_token VARCHAR(64)
)
RETURNS TABLE (
  success BOOLEAN,
  error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry RECORD;
BEGIN
  SELECT id, tenant_id, service_id, employee_id, preferred_date INTO v_entry
  FROM waitlist
  WHERE offer_token = p_token
    AND status = 'notified';

  IF NOT FOUND THEN
    success := FALSE;
    error := 'Oferta no encontrada o ya procesada';
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE waitlist SET status = 'expired', updated_at = now()
  WHERE id = v_entry.id;

  success := TRUE;
  error := NULL;
  RETURN NEXT;
END;
$$;

-- 4. Fix expire_waitlist_offers to cascade to next person
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
