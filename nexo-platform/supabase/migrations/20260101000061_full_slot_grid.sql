-- Migration 000061: Full slot grid with occupied slots + waitlist count
-- Based on get_available_slots v10, returns ALL slots (not just available)
-- with status and waitlist_count for the new grid UI.

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
  v_buf_before INT;
  v_buf_after INT;
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

  -- Override min_advance_minutes from schedule (applies to ALL slot sources: booking_windows, fixed_slot_definitions, schedules)
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

  -- Holiday check
  IF EXISTS (
    SELECT 1 FROM holiday_exceptions he
    WHERE he.tenant_id = p_tenant_id AND he.date = p_date AND he.is_closed = true
  ) THEN
    RETURN;
  END IF;

  -- PRIORITY 1: booking_windows
  IF p_service_id IS NOT NULL THEN
    SELECT bw.slot_mode, bw.slot_interval_minutes,
           bw.buffer_before_minutes, bw.buffer_after_minutes,
           bw.start_time, bw.end_time
    INTO v_mode, v_interval, v_buf_before, v_buf_after,
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
            AND w.preferred_time_start = v_slot_start::TIME
            AND w.preference = 'exact'
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
           s.buffer_before_minutes, s.buffer_after_minutes,
           s.min_advance_minutes, s.advance_booking_days,
           s.start_time, s.end_time
    INTO v_mode, v_interval, v_buf_before, v_buf_after,
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

  v_shift_start := v_shift_start + (COALESCE(v_buf_before, 0) || ' minutes')::INTERVAL;
  v_shift_end := v_shift_end - (COALESCE(v_buf_after, 0) || ' minutes')::INTERVAL;

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
          AND w.preferred_time_start = v_slot_start::TIME
          AND w.preference = 'exact'
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
