-- =============================================================
-- Migration 20261101120000: schedules without slot config
-- =============================================================
-- A shift (`schedules`) stops being a slot generator: it only
-- defines a time range (several ranges per day are supported).
-- The public slot grid is always generated from the duration of
-- the SERVICE being booked, anchored to each shift start with a
-- step equal to that duration, so clients booking different
-- services all pull against the same employee availability.
--
-- Booking-window policy (max advance days / min advance minutes)
-- moves out of `schedules` into the employee profile and is
-- self-managed by the worker in "Mi Horario" (fallback: 7 / 15).
--
-- get_available_slots / get_full_slot_grid are rewritten to:
--   * support multiple shifts per day (morning/afternoon ...);
--     the previous version only used the first shift (LIMIT 1);
--   * always generate the duration grid (fixed/flexible modes
--     are gone for recurring schedules; booking_windows keep
--     their own config, unchanged);
--   * read the advance policy from employees (also removes the
--     stale buffer_* references left by 00061/00070 that pointed
--     at columns dropped back in 00046);
--   * keep per-employee holiday filtering in both functions.
-- Dev-phase: old per-shift values are discarded without migration.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Table changes
-- -------------------------------------------------------------

ALTER TABLE schedules
  DROP COLUMN IF EXISTS slot_mode,
  DROP COLUMN IF EXISTS slot_interval_minutes,
  DROP COLUMN IF EXISTS advance_booking_days,
  DROP COLUMN IF EXISTS min_advance_minutes;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS advance_booking_days INT
    CHECK (advance_booking_days IS NULL OR (advance_booking_days >= 1 AND advance_booking_days <= 365)),
  ADD COLUMN IF NOT EXISTS min_advance_minutes INT
    CHECK (min_advance_minutes IS NULL OR (min_advance_minutes >= 0 AND min_advance_minutes <= 4320));

-- -------------------------------------------------------------
-- 2. replace_schedules: per-shift config fields are ignored;
--    a row is just (day, start, end). Legacy payloads that still
--    send the removed fields are accepted but discarded.
--    Same frame/subordination logic as 20261030120000.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION replace_schedules(
  p_employee_id UUID,
  p_schedules JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id UUID;
  v_role TEXT;
  v_user_id UUID;
  v_item JSONB;
  v_day SMALLINT;
  v_start TIME;
  v_end TIME;
  v_frame_start TIME;
  v_frame_end TIME;
  v_has_frame BOOLEAN;
  v_count INT := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_tenant_id := (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
  v_role := auth.jwt() -> 'app_metadata' ->> 'role';

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant context';
  END IF;

  IF v_role = 'employee' THEN
    IF p_employee_id IS NULL THEN
      RAISE EXCEPTION 'Employees cannot edit the business default schedule';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM employees e
      JOIN users u ON u.id = e.user_id
      WHERE e.id = p_employee_id
        AND e.tenant_id = v_tenant_id
        AND e.deleted_at IS NULL
        AND u.supabase_user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Not authorized to edit this schedule';
    END IF;
  ELSIF v_role IN ('owner', 'admin') THEN
    IF p_employee_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM employees e
      WHERE e.id = p_employee_id
        AND e.tenant_id = v_tenant_id
        AND e.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Employee not found in tenant';
    END IF;
  ELSE
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_employee_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM schedules
      WHERE tenant_id = v_tenant_id
        AND employee_id IS NULL
        AND is_active
    ) INTO v_has_frame;
  END IF;

  DELETE FROM schedules
  WHERE tenant_id = v_tenant_id
    AND employee_id IS NOT DISTINCT FROM p_employee_id;

  IF jsonb_typeof(p_schedules) <> 'array' THEN
    RETURN jsonb_build_object('success', true, 'count', 0);
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_schedules)
  LOOP
    v_day := (v_item ->> 'day_of_week')::SMALLINT;
    v_start := (v_item ->> 'start_time')::TIME;
    v_end := (v_item ->> 'end_time')::TIME;

    IF v_day IS NULL OR v_day NOT BETWEEN 0 AND 6 THEN
      RAISE EXCEPTION 'Invalid day_of_week: %', v_day;
    END IF;
    IF v_start IS NULL OR v_end IS NULL OR v_end <= v_start THEN
      RAISE EXCEPTION 'Invalid time range: % - %', v_start, v_end;
    END IF;

    IF p_employee_id IS NOT NULL AND v_has_frame THEN
      SELECT MIN(start_time), MAX(end_time)
        INTO v_frame_start, v_frame_end
      FROM schedules
      WHERE tenant_id = v_tenant_id
        AND employee_id IS NULL
        AND is_active
        AND day_of_week = v_day;

      IF v_frame_start IS NULL THEN
        RAISE EXCEPTION 'BUSINESS_DAY_CLOSED:%', v_day
          USING ERRCODE = 'check_violation';
      END IF;

      IF v_start < v_frame_start OR v_end > v_frame_end THEN
        RAISE EXCEPTION 'SHIFT_OUT_OF_BUSINESS_HOURS:%:%:%',
          v_day,
          to_char(v_frame_start, 'HH24:MI'),
          to_char(v_frame_end, 'HH24:MI')
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;

    INSERT INTO schedules (
      tenant_id, employee_id, day_of_week, start_time, end_time, is_active
    )
    VALUES (
      v_tenant_id, p_employee_id, v_day, v_start, v_end, true
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION replace_schedules(UUID, JSONB) TO authenticated;

-- -------------------------------------------------------------
-- 3. get_available_slots: public slot grid
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_available_slots(
  p_tenant_id UUID,
  p_employee_id UUID,
  p_date DATE,
  p_service_duration INT,
  p_service_id UUID DEFAULT NULL
)
RETURNS TABLE (start_time TIME, end_time TIME, slot_type VARCHAR(10), capacity_remaining INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dow INT;
  v_tenant_tz TEXT;
  v_local_now TIMESTAMP;
  v_min_ts TIMESTAMPTZ;
  v_max_date DATE;
  v_advance_days INT;
  v_min_advance INT;
  v_has_employee_shift BOOLEAN;
  v_shift RECORD;
  v_shift_start TIME;
  v_shift_end TIME;
  v_slot_start TIMESTAMPTZ;
  v_slot_end_time TIMESTAMPTZ;
  v_slot_end TIMESTAMPTZ;
  v_booked_start TIME;
  v_booked_end TIME;
  v_last_end TIME;
  v_source_found BOOLEAN := FALSE;
  v_mode VARCHAR(10);
  v_interval INT;
  v_max_participants INT;
  v_existing_count INT;
  v_resource_id UUID;
  v_fsd RECORD;
BEGIN
  v_dow := EXTRACT(DOW FROM p_date)::INT;

  SELECT t.timezone INTO v_tenant_tz
  FROM tenants t WHERE t.id = p_tenant_id;
  v_local_now := now() AT TIME ZONE COALESCE(v_tenant_tz, 'UTC');

  -- Advance policy: per employee (self-managed). Fallback 7 days / 15 min.
  v_advance_days := 7;
  v_min_advance := 15;
  SELECT e.advance_booking_days, e.min_advance_minutes
    INTO v_advance_days, v_min_advance
  FROM employees e
  WHERE e.tenant_id = p_tenant_id
    AND e.id = p_employee_id;
  v_advance_days := COALESCE(v_advance_days, 7);
  v_min_advance := COALESCE(v_min_advance, 15);

  v_max_date := CURRENT_DATE + (v_advance_days || ' days')::INTERVAL;
  IF p_date > v_max_date THEN
    RETURN;
  END IF;

  v_min_ts := v_local_now + (v_min_advance || ' minutes')::INTERVAL;

  IF p_service_id IS NOT NULL THEN
    SELECT COALESCE(s.max_participants, 1) INTO v_max_participants
    FROM services s WHERE s.id = p_service_id;

    SELECT sr.resource_id INTO v_resource_id
    FROM service_resources sr
    WHERE sr.tenant_id = p_tenant_id
      AND sr.service_id = p_service_id
    LIMIT 1;
  END IF;
  IF v_max_participants IS NULL THEN v_max_participants := 1; END IF;

  -- 0. Holiday check (global or per-employee)
  IF EXISTS (
    SELECT 1 FROM holiday_exceptions he
    WHERE he.tenant_id = p_tenant_id
      AND he.date = p_date
      AND he.is_closed = true
      AND (he.employee_id IS NULL OR he.employee_id = p_employee_id)
  ) THEN
    RETURN;
  END IF;

  -- PRIORITY 1: booking_windows (date-specific availability).
  -- Keeps its own slot config; slots use raw window boundaries.
  IF p_service_id IS NOT NULL THEN
    SELECT bw.slot_mode, bw.slot_interval_minutes, bw.start_time, bw.end_time
    INTO v_mode, v_interval, v_shift_start, v_shift_end
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

  -- PRIORITY 2: fixed_slot_definitions (subdivided by service duration)
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
        IF v_slot_start >= v_min_ts THEN
          v_slot_end_time := v_slot_start + (p_service_duration || ' minutes')::INTERVAL;

          -- Slot bloqueado manualmente → no bookable
          IF EXISTS (
            SELECT 1 FROM blocked_slots bs
            WHERE bs.tenant_id = p_tenant_id
              AND bs.employee_id = p_employee_id
              AND bs.date = p_date
              AND v_slot_start::TIME < bs.end_time
              AND v_slot_end_time::TIME > bs.start_time
          ) THEN
            CONTINUE;
          END IF;

          -- Count existing participants in this sub-slot
          SELECT COALESCE(SUM(eb.participant_count), 0) INTO v_existing_count
          FROM bookings eb
          WHERE eb.tenant_id = p_tenant_id
            AND eb.employee_id = p_employee_id
            AND eb.date = p_date
            AND eb.status NOT IN ('cancelled')
            AND eb.deleted_at IS NULL
            AND v_slot_start::TIME < eb.end_time
            AND v_slot_end_time::TIME > eb.start_time;

          -- Resource availability check
          IF v_resource_id IS NOT NULL THEN
            IF EXISTS (
              SELECT 1 FROM bookings rb
              WHERE rb.tenant_id = p_tenant_id
                AND rb.resource_id = v_resource_id
                AND rb.date = p_date
                AND rb.status NOT IN ('cancelled')
                AND rb.deleted_at IS NULL
                AND v_slot_start::TIME < rb.end_time
                AND v_slot_end_time::TIME > rb.start_time
            ) THEN
              CONTINUE;
            END IF;
          END IF;

          IF v_existing_count < v_max_participants THEN
            start_time := v_slot_start::TIME;
            end_time := v_slot_end_time::TIME;
            slot_type := 'predefined';
            capacity_remaining := GREATEST(0, v_max_participants - v_existing_count);
            RETURN NEXT;
          END IF;
        END IF;
      END LOOP;
    END LOOP;
    RETURN;
  END IF;

  -- PRIORITY 3: schedules (recurring day-of-week).
  -- Every active shift of the day is offered; NO source-specific
  -- slot config: the grid is anchored to each shift start with a
  -- step equal to the service duration.
  IF NOT v_source_found THEN
    SELECT EXISTS (
      SELECT 1 FROM schedules s
      WHERE s.tenant_id = p_tenant_id
        AND s.employee_id = p_employee_id
        AND s.day_of_week = v_dow
        AND s.is_active = true
    ) INTO v_has_employee_shift;

    -- Fallback: business frame (employee_id NULL) when the worker
    -- has no own shifts for that day.
    IF NOT v_has_employee_shift AND NOT EXISTS (
      SELECT 1 FROM schedules s
      WHERE s.tenant_id = p_tenant_id
        AND s.employee_id IS NULL
        AND s.day_of_week = v_dow
        AND s.is_active = true
    ) THEN
      RETURN;
    END IF;

    FOR v_shift IN
      SELECT s.start_time, s.end_time
      FROM schedules s
      WHERE s.tenant_id = p_tenant_id
        AND s.day_of_week = v_dow
        AND s.is_active = true
        AND (
          CASE WHEN v_has_employee_shift
            THEN s.employee_id = p_employee_id
            ELSE s.employee_id IS NULL
          END
        )
      ORDER BY s.start_time
    LOOP
      v_shift_start := v_shift.start_time;
      v_shift_end := v_shift.end_time;

      IF v_shift_end <= v_shift_start THEN
        CONTINUE;
      END IF;

      FOR v_slot_start IN
        SELECT gs FROM generate_series(
          (p_date || ' ' || v_shift_start::TEXT)::TIMESTAMP,
          (p_date || ' ' || v_shift_end::TEXT)::TIMESTAMP
            - (p_service_duration || ' minutes')::INTERVAL,
          (p_service_duration || ' minutes')::INTERVAL
        ) gs
      LOOP
        IF v_slot_start >= v_min_ts THEN
          v_slot_end_time := v_slot_start + (p_service_duration || ' minutes')::INTERVAL;

          -- Slot bloqueado manualmente → no bookable
          IF EXISTS (
            SELECT 1 FROM blocked_slots bs
            WHERE bs.tenant_id = p_tenant_id
              AND bs.employee_id = p_employee_id
              AND bs.date = p_date
              AND v_slot_start::TIME < bs.end_time
              AND v_slot_end_time::TIME > bs.start_time
          ) THEN
            CONTINUE;
          END IF;

          -- Count existing participants in this time range
          SELECT COALESCE(SUM(eb.participant_count), 0) INTO v_existing_count
          FROM bookings eb
          WHERE eb.tenant_id = p_tenant_id
            AND eb.employee_id = p_employee_id
            AND eb.date = p_date
            AND eb.status NOT IN ('cancelled')
            AND eb.deleted_at IS NULL
            AND v_slot_start::TIME < eb.end_time
            AND v_slot_end_time::TIME > eb.start_time;

          -- Resource availability check
          IF v_resource_id IS NOT NULL THEN
            IF EXISTS (
              SELECT 1 FROM bookings rb
              WHERE rb.tenant_id = p_tenant_id
                AND rb.resource_id = v_resource_id
                AND rb.date = p_date
                AND rb.status NOT IN ('cancelled')
                AND rb.deleted_at IS NULL
                AND v_slot_start::TIME < rb.end_time
                AND v_slot_end_time::TIME > rb.start_time
            ) THEN
              CONTINUE;
            END IF;
          END IF;

          IF v_existing_count < v_max_participants THEN
            start_time := v_slot_start::TIME;
            end_time := v_slot_end_time::TIME;
            slot_type := 'auto';
            capacity_remaining := GREATEST(0, v_max_participants - v_existing_count);
            RETURN NEXT;
          END IF;
        END IF;
      END LOOP;
    END LOOP;
    RETURN;
  END IF;

  -- booking_windows source: keep its fixed/flexible semantics
  -- (windows of free time, or duration grid inside the window).
  IF v_shift_end <= v_shift_start THEN
    RETURN;
  END IF;

  IF v_mode = 'flexible' THEN
    -- FLEXIBLE MODE: return continuous windows between bookings/blocks
    v_last_end := v_shift_start;

    FOR v_booked_start, v_booked_end IN
      SELECT eb.start_time, eb.end_time
      FROM bookings eb
      WHERE eb.tenant_id = p_tenant_id
        AND eb.employee_id = p_employee_id
        AND eb.date = p_date
        AND eb.status NOT IN ('cancelled')
        AND eb.deleted_at IS NULL
      UNION ALL
      SELECT bs.start_time, bs.end_time
      FROM blocked_slots bs
      WHERE bs.tenant_id = p_tenant_id
        AND bs.employee_id = p_employee_id
        AND bs.date = p_date
      ORDER BY 1
    LOOP
      IF v_last_end < v_booked_start THEN
        v_slot_start := (p_date || ' ' || v_last_end::TEXT)::TIMESTAMP;
        v_slot_end := (p_date || ' ' || v_booked_start::TEXT)::TIMESTAMP;
        IF (v_slot_end - v_slot_start) >= (p_service_duration || ' minutes')::INTERVAL THEN
          IF v_slot_start >= v_min_ts THEN
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
              capacity_remaining := v_max_participants;
              RETURN NEXT;
            END IF;
          END IF;
        END IF;
      END IF;
      v_last_end := GREATEST(v_last_end, v_booked_end);
    END LOOP;

    -- Final window after last booking/block
    IF v_last_end < v_shift_end THEN
      v_slot_start := (p_date || ' ' || v_last_end::TEXT)::TIMESTAMP;
      v_slot_end := (p_date || ' ' || v_shift_end::TEXT)::TIMESTAMP;
      IF (v_slot_end - v_slot_start) >= (p_service_duration || ' minutes')::INTERVAL THEN
        IF v_slot_start >= v_min_ts THEN
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
            capacity_remaining := v_max_participants;
            RETURN NEXT;
          END IF;
        END IF;
      END IF;
    END IF;

  ELSE
    -- FIXED MODE: auto-generate slots based on service duration
    FOR v_slot_start IN
      SELECT gs FROM generate_series(
        (p_date || ' ' || v_shift_start::TEXT)::TIMESTAMP,
        (p_date || ' ' || v_shift_end::TEXT)::TIMESTAMP
          - (p_service_duration || ' minutes')::INTERVAL,
        (p_service_duration || ' minutes')::INTERVAL
      ) gs
    LOOP
      IF v_slot_start >= v_min_ts THEN
        v_slot_end_time := v_slot_start + (p_service_duration || ' minutes')::INTERVAL;

        -- Slot bloqueado manualmente → no bookable
        IF EXISTS (
          SELECT 1 FROM blocked_slots bs
          WHERE bs.tenant_id = p_tenant_id
            AND bs.employee_id = p_employee_id
            AND bs.date = p_date
            AND v_slot_start::TIME < bs.end_time
            AND v_slot_end_time::TIME > bs.start_time
        ) THEN
          CONTINUE;
        END IF;

        -- Count existing participants in this time range
        SELECT COALESCE(SUM(eb.participant_count), 0) INTO v_existing_count
        FROM bookings eb
        WHERE eb.tenant_id = p_tenant_id
          AND eb.employee_id = p_employee_id
          AND eb.date = p_date
          AND eb.status NOT IN ('cancelled')
          AND eb.deleted_at IS NULL
          AND v_slot_start::TIME < eb.end_time
          AND v_slot_end_time::TIME > eb.start_time;

        -- Resource availability check
        IF v_resource_id IS NOT NULL THEN
          IF EXISTS (
            SELECT 1 FROM bookings rb
            WHERE rb.tenant_id = p_tenant_id
              AND rb.resource_id = v_resource_id
              AND rb.date = p_date
              AND rb.status NOT IN ('cancelled')
              AND rb.deleted_at IS NULL
              AND v_slot_start::TIME < rb.end_time
              AND v_slot_end_time::TIME > rb.start_time
          ) THEN
            CONTINUE;
          END IF;
        END IF;

        IF v_existing_count < v_max_participants THEN
          start_time := v_slot_start::TIME;
          end_time := v_slot_end_time::TIME;
          slot_type := 'auto';
          capacity_remaining := GREATEST(0, v_max_participants - v_existing_count);
          RETURN NEXT;
        END IF;
      END IF;
    END LOOP;
  END IF;
END;
$$;

-- -------------------------------------------------------------
-- 4. get_full_slot_grid: same model, with status/waitlist counts
--    per candidate for the admin agenda view.
-- -------------------------------------------------------------
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dow INT;
  v_tenant_tz TEXT;
  v_local_now TIMESTAMP;
  v_min_ts TIMESTAMPTZ;
  v_max_date DATE;
  v_advance_days INT;
  v_min_advance INT;
  v_has_employee_shift BOOLEAN;
  v_shift RECORD;
  v_shift_start TIME;
  v_shift_end TIME;
  v_slot_start TIMESTAMPTZ;
  v_slot_end_time TIMESTAMPTZ;
  v_slot_status VARCHAR(10);
  v_source_found BOOLEAN := FALSE;
  v_mode VARCHAR(10);
  v_interval INT;
  v_max_participants INT;
  v_existing_count INT;
  v_resource_id UUID;
  v_fsd RECORD;
  v_wl_count INT;
BEGIN
  v_dow := EXTRACT(DOW FROM p_date)::INT;

  SELECT t.timezone INTO v_tenant_tz
  FROM tenants t WHERE t.id = p_tenant_id;
  v_local_now := now() AT TIME ZONE COALESCE(v_tenant_tz, 'UTC');

  -- Advance policy: per employee (self-managed). Fallback 7 days / 15 min.
  v_advance_days := 7;
  v_min_advance := 15;
  SELECT e.advance_booking_days, e.min_advance_minutes
    INTO v_advance_days, v_min_advance
  FROM employees e
  WHERE e.tenant_id = p_tenant_id
    AND e.id = p_employee_id;
  v_advance_days := COALESCE(v_advance_days, 7);
  v_min_advance := COALESCE(v_min_advance, 15);

  v_max_date := CURRENT_DATE + (v_advance_days || ' days')::INTERVAL;

  v_min_ts := v_local_now + (v_min_advance || ' minutes')::INTERVAL;

  IF p_service_id IS NOT NULL THEN
    SELECT COALESCE(s.max_participants, 1) INTO v_max_participants
    FROM services s WHERE s.id = p_service_id;

    SELECT sr.resource_id INTO v_resource_id
    FROM service_resources sr
    WHERE sr.tenant_id = p_tenant_id
      AND sr.service_id = p_service_id
    LIMIT 1;
  END IF;
  IF v_max_participants IS NULL THEN v_max_participants := 1; END IF;

  IF EXISTS (
    SELECT 1 FROM holiday_exceptions he
    WHERE he.tenant_id = p_tenant_id
      AND he.date = p_date
      AND he.is_closed = true
      AND (he.employee_id IS NULL OR he.employee_id = p_employee_id)
  ) THEN
    RETURN;
  END IF;

  -- PRIORITY 1: booking_windows
  IF p_service_id IS NOT NULL THEN
    SELECT bw.slot_mode, bw.slot_interval_minutes, bw.start_time, bw.end_time
    INTO v_mode, v_interval, v_shift_start, v_shift_end
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
          ELSIF EXISTS (
            SELECT 1 FROM blocked_slots bs
            WHERE bs.tenant_id = p_tenant_id
              AND bs.employee_id = p_employee_id
              AND bs.date = p_date
              AND v_slot_start::TIME < bs.end_time
              AND v_slot_end_time::TIME > bs.start_time
          ) THEN
            v_slot_status := 'occupied';
            capacity_remaining := 0;
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
        IF v_slot_status = 'occupied' AND NOT EXISTS (
          SELECT 1 FROM blocked_slots bs
          WHERE bs.tenant_id = p_tenant_id
            AND bs.employee_id = p_employee_id
            AND bs.date = p_date
            AND v_slot_start::TIME < bs.end_time
            AND v_slot_end_time::TIME > bs.start_time
        ) THEN
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

  -- PRIORITY 3: schedules (recurring day-of-week).
  -- Every active shift of the day is gridded; step = service duration.
  IF NOT v_source_found THEN
    SELECT EXISTS (
      SELECT 1 FROM schedules s
      WHERE s.tenant_id = p_tenant_id
        AND s.employee_id = p_employee_id
        AND s.day_of_week = v_dow
        AND s.is_active = true
    ) INTO v_has_employee_shift;

    IF NOT v_has_employee_shift AND NOT EXISTS (
      SELECT 1 FROM schedules s
      WHERE s.tenant_id = p_tenant_id
        AND s.employee_id IS NULL
        AND s.day_of_week = v_dow
        AND s.is_active = true
    ) THEN
      RETURN;
    END IF;

    FOR v_shift IN
      SELECT s.start_time, s.end_time
      FROM schedules s
      WHERE s.tenant_id = p_tenant_id
        AND s.day_of_week = v_dow
        AND s.is_active = true
        AND (
          CASE WHEN v_has_employee_shift
            THEN s.employee_id = p_employee_id
            ELSE s.employee_id IS NULL
          END
        )
      ORDER BY s.start_time
    LOOP
      v_shift_start := v_shift.start_time;
      v_shift_end := v_shift.end_time;

      IF v_shift_end <= v_shift_start THEN
        CONTINUE;
      END IF;

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
          ELSIF EXISTS (
            SELECT 1 FROM blocked_slots bs
            WHERE bs.tenant_id = p_tenant_id
              AND bs.employee_id = p_employee_id
              AND bs.date = p_date
              AND v_slot_start::TIME < bs.end_time
              AND v_slot_end_time::TIME > bs.start_time
          ) THEN
            v_slot_status := 'occupied';
            capacity_remaining := 0;
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
        IF v_slot_status = 'occupied' AND NOT EXISTS (
          SELECT 1 FROM blocked_slots bs
          WHERE bs.tenant_id = p_tenant_id
            AND bs.employee_id = p_employee_id
            AND bs.date = p_date
            AND v_slot_start::TIME < bs.end_time
            AND v_slot_end_time::TIME > bs.start_time
        ) THEN
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

  -- booking_windows source: fixed/flexible semantics (unchanged)
  IF v_shift_end <= v_shift_start THEN
    RETURN;
  END IF;

  IF v_mode = 'flexible' THEN
    -- FLEXIBLE MODE: continuous windows between bookings/blocks
    DECLARE
      v_booked_start TIME;
      v_booked_end TIME;
      v_last_end TIME;
      v_slot_end TIMESTAMPTZ;
      v_local_slot_start TIMESTAMPTZ;
    BEGIN
      v_last_end := v_shift_start;

      FOR v_booked_start, v_booked_end IN
        SELECT eb.start_time, eb.end_time
        FROM bookings eb
        WHERE eb.tenant_id = p_tenant_id
          AND eb.employee_id = p_employee_id
          AND eb.date = p_date
          AND eb.status NOT IN ('cancelled')
          AND eb.deleted_at IS NULL
        UNION ALL
        SELECT bs.start_time, bs.end_time
        FROM blocked_slots bs
        WHERE bs.tenant_id = p_tenant_id
          AND bs.employee_id = p_employee_id
          AND bs.date = p_date
        ORDER BY 1
      LOOP
        IF v_last_end < v_booked_start THEN
          v_local_slot_start := (p_date || ' ' || v_last_end::TEXT)::TIMESTAMP;
          v_slot_end := (p_date || ' ' || v_booked_start::TEXT)::TIMESTAMP;
          IF (v_slot_end - v_local_slot_start) >= (p_service_duration || ' minutes')::INTERVAL
            AND v_local_slot_start >= v_min_ts
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
        v_local_slot_start := (p_date || ' ' || v_last_end::TEXT)::TIMESTAMP;
        v_slot_end := (p_date || ' ' || v_shift_end::TEXT)::TIMESTAMP;
        IF (v_slot_end - v_local_slot_start) >= (p_service_duration || ' minutes')::INTERVAL
          AND v_local_slot_start >= v_min_ts
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
    END;

  ELSE
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
        ELSIF EXISTS (
          SELECT 1 FROM blocked_slots bs
          WHERE bs.tenant_id = p_tenant_id
            AND bs.employee_id = p_employee_id
            AND bs.date = p_date
            AND v_slot_start::TIME < bs.end_time
            AND v_slot_end_time::TIME > bs.start_time
        ) THEN
          v_slot_status := 'occupied';
          capacity_remaining := 0;
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
      IF v_slot_status = 'occupied' AND NOT EXISTS (
        SELECT 1 FROM blocked_slots bs
        WHERE bs.tenant_id = p_tenant_id
          AND bs.employee_id = p_employee_id
          AND bs.date = p_date
          AND v_slot_start::TIME < bs.end_time
          AND v_slot_end_time::TIME > bs.start_time
      ) THEN
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
