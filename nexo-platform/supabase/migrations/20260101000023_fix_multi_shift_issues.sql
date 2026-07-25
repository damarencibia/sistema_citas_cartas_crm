-- =============================================================
-- Migration 000023: Fix multi-shift issues + drop schedule_breaks
-- =============================================================
-- 1. Patches get_available_slots to prefer employee-specific
--    schedules over tenant-wide defaults (no duplicate slots)
-- 2. Drops schedule_breaks table (replaced by multi-shift gaps)
-- =============================================================

-- 1. Rewrite get_available_slots: prefer employee-specific schedules
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
  v_has_employee_shift BOOLEAN := FALSE;
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

  -- Check if employee has any specific schedules for this day
  SELECT EXISTS (
    SELECT 1 FROM schedules es
    WHERE es.tenant_id = p_tenant_id
      AND es.employee_id = p_employee_id
      AND es.day_of_week = EXTRACT(DOW FROM p_date)::SMALLINT
      AND es.is_active = true
  ) INTO v_has_employee_shift;

  -- Iterate over active shifts: employee-specific only, or tenant-wide as fallback
  FOR v_shift IN
    SELECT es.start_time AS shift_start, es.end_time AS shift_end
    FROM schedules es
    WHERE es.tenant_id = p_tenant_id
      AND es.day_of_week = EXTRACT(DOW FROM p_date)::SMALLINT
      AND es.is_active = true
      AND (
        CASE
          WHEN v_has_employee_shift THEN es.employee_id = p_employee_id
          ELSE es.employee_id IS NULL OR es.employee_id = p_employee_id
        END
      )
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

  IF NOT v_has_any_shift THEN
    RETURN;
  END IF;
END;
$$;

-- 2. Drop schedule_breaks table (replaced by multi-shift gaps)
DROP TABLE IF EXISTS schedule_breaks CASCADE;
