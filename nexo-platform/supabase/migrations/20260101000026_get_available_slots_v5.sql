-- =============================================================
-- Migration 000026: get_available_slots v5
-- =============================================================
-- Multi-mode scheduling engine:
--   Priority 1: booking_windows (date-specific availability)
--   Priority 2: fixed_slot_definitions (admin-defined explicit slots)
--   Priority 3: schedules (recurring day-of-week)
--     - fixed mode: auto-generate at configurable interval
--     - flexible mode: return continuous available windows
-- =============================================================

-- Drop old v4 (4-arg, 2-col return) to avoid overload confusion
DROP FUNCTION IF EXISTS get_available_slots(UUID, UUID, DATE, INT);

CREATE OR REPLACE FUNCTION get_available_slots(
  p_tenant_id UUID,
  p_employee_id UUID,
  p_date DATE,
  p_service_duration INT,
  p_service_id UUID DEFAULT NULL
)
RETURNS TABLE (start_time TIME, end_time TIME, slot_type VARCHAR(10))
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
BEGIN
  v_dow := EXTRACT(DOW FROM p_date)::INT;
  v_now := now();

  -- 0. Holiday check
  IF EXISTS (
    SELECT 1 FROM holiday_exceptions he
    WHERE he.tenant_id = p_tenant_id
      AND he.date = p_date
      AND he.is_closed = true
  ) THEN
    RETURN;
  END IF;

  -- PRIORITY 1: booking_windows (date-specific availability)
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

    IF FOUND THEN
      v_source_found := TRUE;
    END IF;
  END IF;

  -- PRIORITY 2: fixed_slot_definitions (admin-defined explicit slots)
  IF NOT v_source_found AND EXISTS (
    SELECT 1 FROM fixed_slot_definitions fsd
    WHERE fsd.tenant_id = p_tenant_id
      AND fsd.employee_id = p_employee_id
      AND fsd.day_of_week = v_dow
      AND fsd.is_active = true
  ) THEN
    RETURN QUERY
    SELECT fsd.start_time, fsd.end_time, 'predefined'::VARCHAR(10)
    FROM fixed_slot_definitions fsd
    WHERE fsd.tenant_id = p_tenant_id
      AND fsd.employee_id = p_employee_id
      AND fsd.day_of_week = v_dow
      AND fsd.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM bookings eb
        WHERE eb.tenant_id = p_tenant_id
          AND eb.employee_id = p_employee_id
          AND eb.date = p_date
          AND eb.status NOT IN ('cancelled')
          AND eb.deleted_at IS NULL
          AND fsd.start_time < eb.end_time
          AND fsd.end_time > eb.start_time
      )
      AND (
        p_date > CURRENT_DATE
        OR fsd.start_time >= CURRENT_TIME
      );
    RETURN;
  END IF;

  -- PRIORITY 3: schedules (recurring day-of-week)
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

    IF NOT FOUND THEN
      RETURN;
    END IF;

    v_source_found := TRUE;
  END IF;

  -- At this point, v_mode/v_shift_start/v_shift_end are set from either
  -- booking_windows or schedules. Apply buffers and generate slots.

  -- Apply buffers to shift boundaries
  v_shift_start := v_shift_start + (COALESCE(v_buf_before, 0) || ' minutes')::INTERVAL;
  v_shift_end := v_shift_end - (COALESCE(v_buf_after, 0) || ' minutes')::INTERVAL;

  -- Shift must still have room for the service after buffers
  IF v_shift_end <= v_shift_start THEN
    RETURN;
  END IF;

  -- Advance booking: max date check
  IF v_advance_days IS NOT NULL AND v_advance_days > 0 THEN
    v_max_date := CURRENT_DATE + (v_advance_days || ' days')::INTERVAL;
    IF p_date > v_max_date THEN
      RETURN;
    END IF;
  END IF;

  -- Advance booking: min timestamp check
  v_min_ts := v_now + (COALESCE(v_min_advance, 60) || ' minutes')::INTERVAL;

  IF v_mode = 'flexible' THEN
    -- FLEXIBLE MODE: return continuous windows between bookings
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
        IF (v_slot_end - v_slot_start) >= (p_service_duration || ' minutes')::INTERVAL THEN
          IF v_slot_start >= v_min_ts THEN
            start_time := v_last_end;
            end_time := v_booked_start;
            slot_type := 'window';
            RETURN NEXT;
          END IF;
        END IF;
      END IF;
      v_last_end := GREATEST(v_last_end, v_booked_end);
    END LOOP;

    -- Final window after last booking
    IF v_last_end < v_shift_end THEN
      v_slot_start := (p_date || ' ' || v_last_end::TEXT)::TIMESTAMP;
      v_slot_end := (p_date || ' ' || v_shift_end::TEXT)::TIMESTAMP;
      IF (v_slot_end - v_slot_start) >= (p_service_duration || ' minutes')::INTERVAL THEN
        IF v_slot_start >= v_min_ts THEN
          start_time := v_last_end;
          end_time := v_shift_end;
          slot_type := 'window';
          RETURN NEXT;
        END IF;
      END IF;
    END IF;

  ELSE
    -- FIXED MODE: generate series at configurable interval
    FOR v_slot_start IN
      SELECT gs FROM generate_series(
        (p_date || ' ' || v_shift_start::TEXT)::TIMESTAMP,
        (p_date || ' ' || v_shift_end::TEXT)::TIMESTAMP
          - (p_service_duration || ' minutes')::INTERVAL,
        (COALESCE(v_interval, 30) || ' minutes')::INTERVAL
      ) gs
    LOOP
      IF v_slot_start >= v_min_ts THEN
        v_slot_end_time := v_slot_start + (p_service_duration || ' minutes')::INTERVAL;
        IF NOT EXISTS (
          SELECT 1 FROM bookings eb
          WHERE eb.tenant_id = p_tenant_id
            AND eb.employee_id = p_employee_id
            AND eb.date = p_date
            AND eb.status NOT IN ('cancelled')
            AND eb.deleted_at IS NULL
            AND v_slot_start::TIME < eb.end_time
            AND v_slot_end_time::TIME > eb.start_time
        ) THEN
          start_time := v_slot_start::TIME;
          end_time := v_slot_end_time::TIME;
          slot_type := 'auto';
          RETURN NEXT;
        END IF;
      END IF;
    END LOOP;
  END IF;
END;
$$;
