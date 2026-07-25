-- =============================================================
-- Migration 000021: Filter past slots in get_available_slots
-- =============================================================
-- Fixes: when date = today, only returns slots whose start_time
-- is >= CURRENT_TIME. Past slots are no longer shown.
-- =============================================================

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
  v_schedule_start TIME;
  v_schedule_end TIME;
  v_has_schedule BOOLEAN;
BEGIN
  SELECT es.start_time, es.end_time, true
  INTO v_schedule_start, v_schedule_end, v_has_schedule
  FROM schedules es
  WHERE es.tenant_id = p_tenant_id
    AND (es.employee_id = p_employee_id OR es.employee_id IS NULL)
    AND es.day_of_week = EXTRACT(DOW FROM p_date)::SMALLINT
    AND es.is_active = true
  ORDER BY es.employee_id NULLS LAST
  LIMIT 1;

  IF NOT v_has_schedule THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM holiday_exceptions he
    WHERE he.tenant_id = p_tenant_id
      AND he.date = p_date
      AND he.is_closed = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    gs::TIME AS slot_start,
    (gs + (p_service_duration || ' minutes')::INTERVAL)::TIME AS slot_end
  FROM generate_series(
    (p_date::TEXT || ' ' || v_schedule_start::TEXT)::TIMESTAMP,
    (p_date::TEXT || ' ' || v_schedule_end::TEXT)::TIMESTAMP - (p_service_duration || ' minutes')::INTERVAL,
    '30 minutes'::INTERVAL
  ) gs
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
  AND NOT EXISTS (
    SELECT 1 FROM schedule_breaks sb
    JOIN schedules s ON sb.schedule_id = s.id
    WHERE s.tenant_id = p_tenant_id
      AND (s.employee_id = p_employee_id OR s.employee_id IS NULL)
      AND s.day_of_week = EXTRACT(DOW FROM p_date)::SMALLINT
      AND gs::TIME < sb.end_time
      AND (gs + (p_service_duration || ' minutes')::INTERVAL)::TIME > sb.start_time
  )
  AND (
    p_date > CURRENT_DATE
    OR gs::TIME >= CURRENT_TIME
  );
END;
$$;
