-- =============================================================
-- Migration 000063: Multi-slot waitlist preferences
-- =============================================================
-- Adds preferred_times (JSONB array of TIME strings) so a single
-- waitlist entry can hold several preferred occupied slots.
-- promote_from_waitlist now prioritizes entries whose preferred
-- times match the slot that frees up.
-- Declining/expiring an offer only removes THAT slot; the entry
-- stays waiting for the remaining slots (or expires if none left).
-- =============================================================

-- 1. Add preferred_times column
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS preferred_times JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill existing entries (single preferred time)
UPDATE waitlist SET
  preferred_times = jsonb_build_array(preferred_time_start::text)
WHERE preferred_time_start IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_waitlist_preferred_times ON waitlist USING GIN (preferred_times);

-- 2. promote_from_waitlist: prioritize exact preferred-time match,
--    then fall back to position order (legacy flexible entries).
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
    ORDER BY (w2.preferred_times ? p_slot_start::text) DESC, w2.position ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING w.id, w.customer_name, w.customer_email, w.customer_phone,
            w.preference, w.offer_token, w.offered_slot_date,
            w.offered_slot_time, w.offer_expires_at;
END;
$$;

-- 3. accept_waitlist_offer: resolve employee from services.employee_id
--    (service_employees is no longer maintained after migration 000043).
DROP FUNCTION IF EXISTS accept_waitlist_offer(VARCHAR(64));

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

  UPDATE waitlist SET status = 'converted', updated_at = now()
  WHERE id = v_entry.id;

  SELECT s.duration_minutes, s.requires_approval
  INTO v_duration, v_requires_approval
  FROM services s WHERE s.id = v_entry.service_id;

  v_end_time := v_entry.offered_slot_time + (v_duration || ' minutes')::INTERVAL;
  v_initial_status := CASE WHEN v_requires_approval THEN 'pending_approval' ELSE 'confirmed' END;

  IF v_entry.employee_id IS NULL THEN
    SELECT s.employee_id INTO v_entry.employee_id
    FROM services s
    WHERE s.id = v_entry.service_id
      AND s.employee_id IS NOT NULL
    LIMIT 1;
  END IF;

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

  booking_id := v_booking_id;
  error := NULL;
  RETURN NEXT;
END;
$$;

-- 4. decline_waitlist_offer: remove ONLY the offered slot from the entry.
--    If no preferred slots remain the entry expires; otherwise it goes
--    back to 'waiting' to keep waiting for the other slots.
DROP FUNCTION IF EXISTS decline_waitlist_offer(VARCHAR(64));

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
  v_remaining JSONB;
BEGIN
  SELECT id, preferred_times, offered_slot_time INTO v_entry
  FROM waitlist
  WHERE offer_token = p_token
    AND status = 'notified';

  IF NOT FOUND THEN
    success := FALSE;
    error := 'Oferta no encontrada o ya procesada';
    RETURN NEXT;
    RETURN;
  END IF;

  v_remaining := v_entry.preferred_times - COALESCE(v_entry.offered_slot_time::text, '');

  UPDATE waitlist SET
    preferred_times = v_remaining,
    status = CASE WHEN jsonb_array_length(v_remaining) = 0 THEN 'expired' ELSE 'waiting' END,
    offer_token = NULL,
    offered_slot_date = NULL,
    offered_slot_time = NULL,
    offer_expires_at = NULL,
    notified_at = NULL,
    updated_at = now()
  WHERE id = v_entry.id;

  success := TRUE;
  error := NULL;
  RETURN NEXT;
END;
$$;

-- 5. expire_waitlist_offers: same semantics for stale offers.
DROP FUNCTION IF EXISTS expire_waitlist_offers();

CREATE OR REPLACE FUNCTION expire_waitlist_offers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE waitlist w SET
    preferred_times = w.preferred_times - COALESCE(w.offered_slot_time::text, ''),
    status = CASE
      WHEN jsonb_array_length(w.preferred_times - COALESCE(w.offered_slot_time::text, '')) = 0
        THEN 'expired'
      ELSE 'waiting'
    END,
    offer_token = NULL,
    offered_slot_date = NULL,
    offered_slot_time = NULL,
    offer_expires_at = NULL,
    notified_at = NULL,
    updated_at = now()
  WHERE w.status = 'notified'
    AND w.offer_expires_at < now();
END;
$$;

-- 6. Rewrite get_full_slot_grid so each occupied slot's waitlist_count
--    reflects entries whose preferred_times include that slot.
DROP FUNCTION IF EXISTS get_full_slot_grid(UUID, UUID, DATE, INT, UUID);

CREATE OR REPLACE FUNCTION get_full_slot_grid(
  p_tenant_id UUID,
  p_employee_id UUID,
  p_date DATE,
  p_service_duration INT,
  p_service_id UUID DEFAULT NULL
)
RETURNS TABLE (
  start_time TIME,
  end_time TIME,
  slot_type VARCHAR(10),
  status VARCHAR(10),
  capacity_remaining INT,
  waitlist_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dow INT;
  v_has_employee_shift BOOLEAN;
  v_mode VARCHAR(10);
  v_interval INT;
  v_shift_start TIME;
  v_shift_end TIME;
  v_min_advance INT;
  v_advance_days INT;
  v_slot_start TIMESTAMPTZ;
  v_slot_end TIMESTAMPTZ;
  v_slot_end_time TIMESTAMPTZ;
  v_min_ts TIMESTAMPTZ;
  v_max_date DATE;
  v_booked_start TIME;
  v_booked_end TIME;
  v_last_end TIME;
  v_now TIMESTAMPTZ;
  v_source_found BOOLEAN := FALSE;
  v_max_participants INT;
  v_existing_count INT;
  v_resource_id UUID;
  v_fsd RECORD;
  v_tenant_tz TEXT;
  v_local_now TIMESTAMP;
  v_slot_status VARCHAR(10);
  v_wl_count INT;
BEGIN
  v_dow := EXTRACT(DOW FROM p_date)::INT;
  v_now := now();

  SELECT t.timezone INTO v_tenant_tz
  FROM tenants t WHERE t.id = p_tenant_id;
  v_local_now := now() AT TIME ZONE COALESCE(v_tenant_tz, 'UTC');

  v_min_ts := v_local_now + (15 || ' minutes')::INTERVAL;

  SELECT s.min_advance_minutes INTO v_min_advance
  FROM schedules s
  WHERE s.tenant_id = p_tenant_id
    AND s.day_of_week = v_dow
    AND s.is_active = true
    AND (s.employee_id = p_employee_id OR s.employee_id IS NULL)
  ORDER BY s.employee_id NULLS LAST
  LIMIT 1;

  IF v_min_advance IS NOT NULL THEN
    v_min_ts := v_local_now + (v_min_advance || ' minutes')::INTERVAL;
  END IF;

  IF p_service_id IS NOT NULL THEN
    SELECT COALESCE(s.max_participants, 1) INTO v_max_participants
    FROM services s WHERE s.id = p_service_id;

    SELECT sr.resource_id INTO v_resource_id
    FROM service_resources sr
    WHERE sr.tenant_id = p_tenant_id
      AND sr.service_id = p_service_id
    LIMIT 1;
  ELSE
    v_max_participants := 1;
  END IF;
  IF v_max_participants IS NULL THEN v_max_participants := 1; END IF;

  IF EXISTS (
    SELECT 1 FROM holiday_exceptions he
    WHERE he.tenant_id = p_tenant_id AND he.date = p_date AND he.is_closed = true
  ) THEN
    RETURN;
  END IF;

  -- PRIORITY 1: booking_windows
  IF p_service_id IS NOT NULL THEN
    SELECT bw.slot_mode, bw.slot_interval_minutes,
           bw.start_time, bw.end_time
    INTO v_mode, v_interval,
         v_shift_start, v_shift_end
    FROM booking_windows bw
    WHERE bw.tenant_id = p_tenant_id
      AND bw.employee_id = p_employee_id
      AND bw.service_id = p_service_id
      AND p_date BETWEEN bw.start_date AND bw.end_date
      AND bw.is_active = true
    LIMIT 1;
    IF FOUND THEN v_source_found := TRUE; END IF;
  END IF;

  -- PRIORITY 2: fixed_slot_definitions
  IF NOT v_source_found AND EXISTS (
    SELECT 1 FROM fixed_slot_definitions fsd
    WHERE fsd.tenant_id = p_tenant_id
      AND fsd.employee_id = p_employee_id
      AND fsd.day_of_week = v_dow
      AND fsd.is_active = true
  ) THEN
    FOR v_fsd IN
      SELECT fsd.start_time, fsd.end_time
      FROM fixed_slot_definitions fsd
      WHERE fsd.tenant_id = p_tenant_id
        AND fsd.employee_id = p_employee_id
        AND fsd.day_of_week = v_dow
        AND fsd.is_active = true
    LOOP
      FOR v_slot_start IN
        SELECT gs FROM generate_series(
          (p_date || ' ' || v_fsd.start_time::TEXT)::TIMESTAMP,
          (p_date || ' ' || v_fsd.end_time::TEXT)::TIMESTAMP
            - (p_service_duration || ' minutes')::INTERVAL,
          (p_service_duration || ' minutes')::INTERVAL
        ) gs
      LOOP
        v_slot_end_time := v_slot_start + (p_service_duration || ' minutes')::INTERVAL;

        IF v_slot_start < v_min_ts THEN
          v_slot_status := 'past';
        ELSE
          SELECT COALESCE(SUM(eb.participant_count), 0) INTO v_existing_count
          FROM bookings eb
          WHERE eb.tenant_id = p_tenant_id
            AND eb.employee_id = p_employee_id
            AND eb.date = p_date
            AND eb.status NOT IN ('cancelled')
            AND eb.deleted_at IS NULL
            AND v_slot_start::TIME < eb.end_time
            AND v_slot_end_time::TIME > eb.start_time;

          IF v_resource_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM bookings rb
            WHERE rb.tenant_id = p_tenant_id
              AND rb.resource_id = v_resource_id
              AND rb.date = p_date
              AND rb.status NOT IN ('cancelled')
              AND rb.deleted_at IS NULL
              AND v_slot_start::TIME < rb.end_time
              AND v_slot_end_time::TIME > rb.start_time
          ) THEN
            v_slot_status := 'occupied';
          ELSIF v_existing_count < v_max_participants THEN
            v_slot_status := 'available';
            capacity_remaining := GREATEST(0, v_max_participants - v_existing_count);
          ELSE
            v_slot_status := 'occupied';
            capacity_remaining := 0;
          END IF;
        END IF;

        start_time := v_slot_start::TIME;
        end_time := v_slot_end_time::TIME;
        slot_type := 'predefined';
        status := v_slot_status;
        IF v_slot_status = 'occupied' THEN
          SELECT COUNT(*)::INT INTO v_wl_count
          FROM waitlist w
          WHERE w.tenant_id = p_tenant_id
            AND w.service_id = p_service_id
            AND (w.employee_id = p_employee_id OR w.employee_id IS NULL)
            AND w.preferred_date = p_date
            AND (
              w.preferred_times ? (v_slot_start::TIME)::text
              OR w.preferred_time_start = v_slot_start::TIME
            )
            AND w.status = 'waiting';
          waitlist_count := v_wl_count;
        ELSE
          waitlist_count := 0;
        END IF;
        capacity_remaining := COALESCE(capacity_remaining, 0);
        RETURN NEXT;
        v_slot_status := NULL;
        capacity_remaining := 0;
      END LOOP;
    END LOOP;
    RETURN;
  END IF;

  -- PRIORITY 3: schedules
  IF NOT v_source_found THEN
    SELECT EXISTS (
      SELECT 1 FROM schedules s
      WHERE s.tenant_id = p_tenant_id
        AND s.employee_id = p_employee_id
        AND s.day_of_week = v_dow
        AND s.is_active = true
    ) INTO v_has_employee_shift;

    SELECT s.slot_mode, s.slot_interval_minutes,
           s.min_advance_minutes, s.advance_booking_days,
           s.start_time, s.end_time
    INTO v_mode, v_interval,
         v_min_advance, v_advance_days, v_shift_start, v_shift_end
    FROM schedules s
    WHERE s.tenant_id = p_tenant_id
      AND s.day_of_week = v_dow
      AND s.is_active = true
      AND (
        CASE WHEN v_has_employee_shift
          THEN s.employee_id = p_employee_id
          ELSE s.employee_id IS NULL OR s.employee_id = p_employee_id
        END
      )
    ORDER BY s.employee_id NULLS LAST, s.start_time
    LIMIT 1;

    IF NOT FOUND THEN RETURN; END IF;
    v_source_found := TRUE;
  END IF;

  IF v_shift_end <= v_shift_start THEN RETURN; END IF;

  IF v_advance_days IS NOT NULL AND v_advance_days > 0 THEN
    v_max_date := CURRENT_DATE + (v_advance_days || ' days')::INTERVAL;
    IF p_date > v_max_date THEN RETURN; END IF;
  END IF;

  IF v_min_advance IS NOT NULL THEN
    v_min_ts := v_local_now + (v_min_advance || ' minutes')::INTERVAL;
  END IF;

  IF v_mode = 'flexible' THEN
    v_last_end := v_shift_start;

    FOR v_booked_start, v_booked_end IN
      SELECT eb.start_time, eb.end_time
      FROM bookings eb
      WHERE eb.tenant_id = p_tenant_id
        AND eb.employee_id = p_employee_id
        AND eb.date = p_date
        AND eb.status NOT IN ('cancelled')
        AND eb.deleted_at IS NULL
      ORDER BY eb.start_time
    LOOP
      IF v_last_end < v_booked_start THEN
        v_slot_start := (p_date || ' ' || v_last_end::TEXT)::TIMESTAMP;
        v_slot_end := (p_date || ' ' || v_booked_start::TEXT)::TIMESTAMP;
        IF (v_slot_end - v_slot_start) >= (p_service_duration || ' minutes')::INTERVAL
          AND v_slot_start >= v_min_ts
        THEN
          IF v_resource_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM bookings rb
            WHERE rb.tenant_id = p_tenant_id
              AND rb.resource_id = v_resource_id
              AND rb.date = p_date
              AND rb.status NOT IN ('cancelled')
              AND rb.deleted_at IS NULL
              AND v_last_end < rb.end_time
              AND v_booked_start > rb.start_time
          ) THEN
            start_time := v_last_end;
            end_time := v_booked_start;
            slot_type := 'window';
            status := 'available';
            capacity_remaining := v_max_participants;
            waitlist_count := 0;
            RETURN NEXT;
          END IF;
        END IF;
      END IF;
      v_last_end := GREATEST(v_last_end, v_booked_end);
    END LOOP;

    IF v_last_end < v_shift_end THEN
      v_slot_start := (p_date || ' ' || v_last_end::TEXT)::TIMESTAMP;
      v_slot_end := (p_date || ' ' || v_shift_end::TEXT)::TIMESTAMP;
      IF (v_slot_end - v_slot_start) >= (p_service_duration || ' minutes')::INTERVAL
        AND v_slot_start >= v_min_ts
      THEN
        IF v_resource_id IS NULL OR NOT EXISTS (
          SELECT 1 FROM bookings rb
          WHERE rb.tenant_id = p_tenant_id
            AND rb.resource_id = v_resource_id
            AND rb.date = p_date
            AND rb.status NOT IN ('cancelled')
            AND rb.deleted_at IS NULL
            AND v_last_end < rb.end_time
            AND v_shift_end > rb.start_time
        ) THEN
          start_time := v_last_end;
          end_time := v_shift_end;
          slot_type := 'window';
          status := 'available';
          capacity_remaining := v_max_participants;
          waitlist_count := 0;
          RETURN NEXT;
        END IF;
      END IF;
    END IF;

  ELSE
    -- FIXED MODE
    FOR v_slot_start IN
      SELECT gs FROM generate_series(
        (p_date || ' ' || v_shift_start::TEXT)::TIMESTAMP,
        (p_date || ' ' || v_shift_end::TEXT)::TIMESTAMP
          - (p_service_duration || ' minutes')::INTERVAL,
        (p_service_duration || ' minutes')::INTERVAL
      ) gs
    LOOP
      v_slot_end_time := v_slot_start + (p_service_duration || ' minutes')::INTERVAL;

      IF v_slot_start < v_min_ts THEN
        v_slot_status := 'past';
      ELSE
        SELECT COALESCE(SUM(eb.participant_count), 0) INTO v_existing_count
        FROM bookings eb
        WHERE eb.tenant_id = p_tenant_id
          AND eb.employee_id = p_employee_id
          AND eb.date = p_date
          AND eb.status NOT IN ('cancelled')
          AND eb.deleted_at IS NULL
          AND v_slot_start::TIME < eb.end_time
          AND v_slot_end_time::TIME > eb.start_time;

        IF v_resource_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM bookings rb
          WHERE rb.tenant_id = p_tenant_id
            AND rb.resource_id = v_resource_id
            AND rb.date = p_date
            AND rb.status NOT IN ('cancelled')
            AND rb.deleted_at IS NULL
            AND v_slot_start::TIME < rb.end_time
            AND v_slot_end_time::TIME > rb.start_time
        ) THEN
          v_slot_status := 'occupied';
        ELSIF v_existing_count < v_max_participants THEN
          v_slot_status := 'available';
          capacity_remaining := GREATEST(0, v_max_participants - v_existing_count);
        ELSE
          v_slot_status := 'occupied';
          capacity_remaining := 0;
        END IF;
      END IF;

      start_time := v_slot_start::TIME;
      end_time := v_slot_end_time::TIME;
      slot_type := 'auto';
      status := v_slot_status;
      IF v_slot_status = 'occupied' THEN
        SELECT COUNT(*)::INT INTO v_wl_count
        FROM waitlist w
        WHERE w.tenant_id = p_tenant_id
          AND w.service_id = p_service_id
          AND (w.employee_id = p_employee_id OR w.employee_id IS NULL)
          AND w.preferred_date = p_date
          AND (
            w.preferred_times ? (v_slot_start::TIME)::text
            OR w.preferred_time_start = v_slot_start::TIME
          )
          AND w.status = 'waiting';
        waitlist_count := v_wl_count;
      ELSE
        waitlist_count := 0;
      END IF;
      capacity_remaining := COALESCE(capacity_remaining, 0);
      RETURN NEXT;
      v_slot_status := NULL;
      capacity_remaining := 0;
    END LOOP;
  END IF;
END;
$$;
