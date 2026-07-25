-- =============================================================
-- Migration 000022: Multi-shift schedules + new RPC
-- =============================================================
-- 1. Drops the UNIQUE constraint that limited 1 shift per day
-- 2. Rewrites get_available_slots to support multiple shifts
--    per employee per day
-- =============================================================

-- 1. Remove the one-shift-per-day constraint
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_tenant_employee_day_unique;

-- 2. Rewrite get_available_slots for multi-shift support
CREATE OR REPLACE FUNCTION get_available_slots(
  p_tenant_id UUID,
  p_employee_id UUID,
  p_date DATE,
  p_service_duration INT
)
RETURNS TABLE (start_time TIME, end_time TIME)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shift RECORD;
  v_has_any_shift BOOLEAN := FALSE;
BEGIN
  -- Check for holiday (closed day)
  IF EXISTS (
    SELECT 1 FROM holiday_exceptions he
    WHERE he.tenant_id = p_tenant_id
      AND he.date = p_date
      AND he.is_closed = true
  ) THEN
    RETURN;
  END IF;

  -- Iterate over ALL active shifts for this employee on this day
  FOR v_shift IN
    SELECT es.start_time AS shift_start, es.end_time AS shift_end
    FROM schedules es
    WHERE es.tenant_id = p_tenant_id
      AND (es.employee_id = p_employee_id OR es.employee_id IS NULL)
      AND es.day_of_week = EXTRACT(DOW FROM p_date)::SMALLINT
      AND es.is_active = true
    ORDER BY es.employee_id NULLS LAST, es.start_time
  LOOP
    v_has_any_shift := TRUE;

    -- Generate slots for this shift
    RETURN QUERY
    SELECT
      gs::TIME AS slot_start,
      (gs + (p_service_duration || ' minutes')::INTERVAL)::TIME AS slot_end
    FROM generate_series(
      (p_date::TEXT || ' ' || v_shift.shift_start::TEXT)::TIMESTAMP,
      (p_date::TEXT || ' ' || v_shift.shift_end::TEXT)::TIMESTAMP - (p_service_duration || ' minutes')::INTERVAL,
      '30 minutes'::INTERVAL
    ) gs
    -- Exclude overlapping bookings
    WHERE NOT EXISTS (
      SELECT 1 FROM bookings eb
      WHERE eb.tenant_id = p_tenant_id
        AND eb.employee_id = p_employee_id
        AND eb.date = p_date
        AND eb.status NOT IN ('cancelled')
        AND eb.deleted_at IS NULL
        AND gs::TIME < eb.end_time
        AND (gs + (p_service_duration || ' minutes')::INTERVAL)::TIME > eb.start_time
    )
    -- Exclude past slots when date is today
    AND (
      p_date > CURRENT_DATE
      OR gs::TIME >= CURRENT_TIME
    );
  END LOOP;

  -- If no shifts found, return empty
  IF NOT v_has_any_shift THEN
    RETURN;
  END IF;
END;
$$;
