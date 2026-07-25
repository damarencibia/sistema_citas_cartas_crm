-- =============================================================
-- Migration 000029: Resource Booking
-- =============================================================
-- 1. resources table (rooms, equipment, vehicles)
-- 2. service_resources junction (which services need which resources)
-- 3. FK on bookings.resource_id
-- 4. RPC v8: get_available_slots with resource availability
-- =============================================================

-- 1. resources table
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'room'
    CHECK (type IN ('room', 'equipment', 'vehicle', 'other')),
  capacity INT NOT NULL DEFAULT 1 CHECK (capacity >= 1),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resources_tenant ON resources(tenant_id, is_active);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY resources_tenant_isolation ON resources
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- 2. service_resources junction
CREATE TABLE service_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(service_id, resource_id)
);

CREATE INDEX idx_service_resources_tenant ON service_resources(tenant_id);

ALTER TABLE service_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_resources_tenant_isolation ON service_resources
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- 3. FK on bookings.resource_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_bookings_resource'
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT fk_bookings_resource
      FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. RPC v8: resource-aware get_available_slots
-- For services that require resources, verify the resource is not double-booked
-- Only drops v5 (the 5-arg version), keeps any other overloads safe
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
BEGIN
  v_dow := EXTRACT(DOW FROM p_date)::INT;
  v_now := now();

  -- Get max_participants and required resource for the service
  IF p_service_id IS NOT NULL THEN
    SELECT COALESCE(s.max_participants, 1) INTO v_max_participants
    FROM services s WHERE s.id = p_service_id;

    -- Check if service requires a specific resource
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

  -- PRIORITY 2: fixed_slot_definitions (admin-defined explicit slots)
  IF NOT v_source_found AND EXISTS (
    SELECT 1 FROM fixed_slot_definitions fsd
    WHERE fsd.tenant_id = p_tenant_id
      AND fsd.employee_id = p_employee_id
      AND fsd.day_of_week = v_dow
      AND fsd.is_active = true
  ) THEN
    RETURN QUERY
    SELECT fsd.start_time, fsd.end_time, 'predefined'::VARCHAR(10),
           GREATEST(0, v_max_participants - COALESCE(
             (SELECT SUM(eb.participant_count)
              FROM bookings eb
              WHERE eb.tenant_id = p_tenant_id
                AND eb.employee_id = p_employee_id
                AND eb.date = p_date
                AND eb.status NOT IN ('cancelled')
                AND eb.deleted_at IS NULL
                AND fsd.start_time < eb.end_time
                AND fsd.end_time > eb.start_time
             ), 0))::INT
    FROM fixed_slot_definitions fsd
    WHERE fsd.tenant_id = p_tenant_id
      AND fsd.employee_id = p_employee_id
      AND fsd.day_of_week = v_dow
      AND fsd.is_active = true
      AND (
        SELECT COALESCE(SUM(eb.participant_count), 0)
        FROM bookings eb
        WHERE eb.tenant_id = p_tenant_id
          AND eb.employee_id = p_employee_id
          AND eb.date = p_date
          AND eb.status NOT IN ('cancelled')
          AND eb.deleted_at IS NULL
          AND fsd.start_time < eb.end_time
          AND fsd.end_time > eb.start_time
      ) < v_max_participants
      AND (
        p_date > CURRENT_DATE
        OR fsd.start_time >= CURRENT_TIME
      )
      -- Resource availability: no conflicting booking for same resource
      AND (
        v_resource_id IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM bookings rb
          WHERE rb.tenant_id = p_tenant_id
            AND rb.resource_id = v_resource_id
            AND rb.date = p_date
            AND rb.status NOT IN ('cancelled')
            AND rb.deleted_at IS NULL
            AND fsd.start_time < rb.end_time
            AND fsd.end_time > rb.start_time
        )
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
            -- Resource check for flexible windows
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

    -- Final window after last booking
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
