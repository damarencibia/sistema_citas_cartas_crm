-- =============================================================
-- Migration 000070: Bloqueo manual de turnos (blocked_slots)
-- =============================================================
-- 1. Tabla blocked_slots: un empleado puede "mantener ocupado"
--    (en rojo) un rango horario de una fecha sin cliente asignado.
-- 2. RLS de aislamiento por tenant (solo authenticated), siguiendo
--    el patrón waitlist_tenant_isolation.
-- 3. get_full_slot_grid / get_available_slots tratan los bloques
--    como turnos ocupados: el horario queda en rojo también para
--    el booking público.
-- 4. transfer_booking_to_waitlist: RPC transaccional que cancela el
--    turno original y crea el nuevo booking con el primer cliente de
--    la cola (evita el trigger prevent_double_booking y garantiza
--    atomicidad: si algo falla, no cambia nada).
-- =============================================================

-- 1. Tabla blocked_slots
CREATE TABLE blocked_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX idx_blocked_slots_tenant_employee_date
  ON blocked_slots(tenant_id, employee_id, date);

ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;

-- 2. RLS: aislamiento por tenant, solo authenticated
CREATE POLICY blocked_slots_tenant_isolation ON blocked_slots
  FOR ALL TO authenticated
  USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- =============================================================
-- 3. get_available_slots (v11): excluye turnos bloqueados
-- =============================================================
DROP FUNCTION IF EXISTS get_available_slots(UUID, UUID, DATE, INT, UUID);

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

  -- Apply buffers to shift boundaries
  v_shift_start := v_shift_start + (COALESCE(v_buf_before, 0) || ' minutes')::INTERVAL;
  v_shift_end := v_shift_end - (COALESCE(v_buf_after, 0) || ' minutes')::INTERVAL;

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

  -- Override min_ts if schedule has a custom min_advance_minutes (using local time)
  IF v_min_advance IS NOT NULL THEN
    v_min_ts := v_local_now + (v_min_advance || ' minutes')::INTERVAL;
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

-- =============================================================
-- 3b. get_full_slot_grid: marca los bloques como 'occupied'
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_full_slot_grid(p_tenant_id uuid, p_employee_id uuid, p_date date, p_service_duration integer, p_service_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(start_time time without time zone, end_time time without time zone, slot_type character varying, status character varying, capacity_remaining integer, waitlist_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    WHERE he.tenant_id = p_tenant_id
      AND he.date = p_date
      AND he.is_closed = true
      AND (he.employee_id IS NULL OR he.employee_id = p_employee_id)
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
$function$;

-- =============================================================
-- 4. RPC: transferir el turno al primer cliente de la cola
--    (atómico: cancela el original, crea el nuevo booking y marca
--    la entrada como convertida; si algo falla no cambia nada).
-- =============================================================
CREATE OR REPLACE FUNCTION public.transfer_booking_to_waitlist(
  p_booking_id UUID,
  p_waitlist_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_booking RECORD;
  v_entry RECORD;
  v_duration INT;
  v_requires_approval BOOLEAN;
  v_end_time TIME;
  v_status VARCHAR(20);
  v_customer_id UUID;
  v_customer_row RECORD;
  v_new_booking_id UUID;
BEGIN
  v_tenant_id := (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant no identificado';
  END IF;

  SELECT b.* INTO v_booking
  FROM bookings b
  WHERE b.id = p_booking_id
    AND b.tenant_id = v_tenant_id
    AND b.deleted_at IS NULL
    AND b.status NOT IN ('cancelled')
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Turno no encontrado o ya cancelado';
  END IF;

  SELECT w.* INTO v_entry
  FROM waitlist w
  WHERE w.id = p_waitlist_id
    AND w.tenant_id = v_tenant_id
    AND w.status IN ('waiting', 'notified')
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrada de la cola no encontrada';
  END IF;

  SELECT s.duration_minutes, COALESCE(s.requires_approval, false)
    INTO v_duration, v_requires_approval
  FROM services s
  WHERE s.id = v_booking.service_id;
  IF v_duration IS NULL THEN
    RAISE EXCEPTION 'Servicio no encontrado';
  END IF;

  v_duration := COALESCE(v_booking.custom_duration_minutes, v_duration);
  v_end_time := (v_booking.start_time + (v_duration || ' minutes')::INTERVAL)::TIME;
  v_status := CASE WHEN v_requires_approval THEN 'pending_approval' ELSE 'confirmed' END;

  -- Cancelar el turno original (cumple el CHECK cancelled_at ↔ cancellation_reason)
  UPDATE bookings
  SET status = 'cancelled',
      cancelled_by = 'employee',
      cancelled_at = now(),
      cancellation_reason = 'Turno asignado al primer cliente de la cola',
      updated_at = now()
  WHERE id = p_booking_id;

  -- Resolver el cliente (mismo criterio que create() del repositorio)
  v_customer_id := NULL;
  IF NULLIF(btrim(v_entry.customer_email), '') IS NOT NULL THEN
    SELECT * INTO v_customer_row
    FROM public.upsert_booking_customer(
      v_tenant_id,
      v_entry.customer_name,
      v_entry.customer_email,
      COALESCE(v_entry.customer_phone, '')
    );
    v_customer_id := v_customer_row.id;
  END IF;

  -- Crear el nuevo booking (el trigger prevent_double_booking ya no
  -- bloquea porque el original quedó cancelado)
  INSERT INTO bookings (
    tenant_id, service_id, employee_id, date, start_time, end_time,
    customer_id, customer_name, customer_email, customer_phone,
    notes, source, status, participant_count, custom_duration_minutes,
    whatsapp_consent
  ) VALUES (
    v_tenant_id, v_booking.service_id, v_booking.employee_id, v_booking.date,
    v_booking.start_time, v_end_time,
    v_customer_id, v_entry.customer_name, v_entry.customer_email, v_entry.customer_phone,
    v_booking.notes, 'manual', v_status,
    v_booking.participant_count, v_booking.custom_duration_minutes,
    v_booking.whatsapp_consent
  )
  RETURNING id INTO v_new_booking_id;

  -- Marcar la entrada como convertida
  UPDATE waitlist
  SET status = 'converted', updated_at = now()
  WHERE id = p_waitlist_id;

  -- Log del cambio de estado del turno original
  INSERT INTO booking_status_log (
    tenant_id, booking_id, old_status, new_status, changed_by, changed_by_name, reason
  ) VALUES (
    v_tenant_id, p_booking_id, v_booking.status, 'cancelled', 'employee', 'Agenda',
    'Turno asignado al primer cliente de la cola'
  );

  RETURN v_new_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_booking_to_waitlist(UUID, UUID) TO authenticated;
