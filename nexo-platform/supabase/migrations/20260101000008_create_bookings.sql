CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID REFERENCES customers(id),
  service_id UUID NOT NULL REFERENCES services(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'in_progress', 'completed', 'no_show', 'cancelled')),
  cancellation_reason TEXT,
  cancelled_by VARCHAR(20) CHECK (cancelled_by IN ('customer', 'employee', 'system')),
  cancelled_at TIMESTAMPTZ,
  customer_name VARCHAR(200),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  notes TEXT,
  source VARCHAR(20) DEFAULT 'online' CHECK (source IN ('online', 'manual', 'phone')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CHECK (end_time > start_time),
  CHECK (cancelled_at IS NULL OR (cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL))
);

CREATE INDEX idx_bookings_tenant_date ON bookings(tenant_id, date);
CREATE INDEX idx_bookings_employee_date ON bookings(employee_id, date);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date_range ON bookings(tenant_id, date, start_time, end_time);
CREATE INDEX idx_bookings_created_at ON bookings(tenant_id, created_at);

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
BEGIN
  RETURN QUERY
  WITH employee_schedule AS (
    SELECT s.start_time, s.end_time
    FROM schedules s
    WHERE s.tenant_id = p_tenant_id
      AND (s.employee_id = p_employee_id OR s.employee_id IS NULL)
      AND s.day_of_week = EXTRACT(DOW FROM p_date)
      AND s.is_active = true
    ORDER BY s.employee_id NULLS LAST
    LIMIT 1
  ),
  existing_bookings AS (
    SELECT start_time, end_time
    FROM bookings
    WHERE tenant_id = p_tenant_id
      AND employee_id = p_employee_id
      AND date = p_date
      AND status NOT IN ('cancelled')
      AND deleted_at IS NULL
  ),
  breaks AS (
    SELECT sb.start_time, sb.end_time
    FROM schedule_breaks sb
    JOIN schedules s ON sb.schedule_id = s.id
    WHERE s.tenant_id = p_tenant_id
      AND (s.employee_id = p_employee_id OR s.employee_id IS NULL)
      AND s.day_of_week = EXTRACT(DOW FROM p_date)
  ),
  holiday AS (
    SELECT 1
    FROM holiday_exceptions
    WHERE tenant_id = p_tenant_id
      AND date = p_date
      AND is_closed = true
  )
  SELECT
    gs::TIME AS slot_start,
    (gs + (p_service_duration || ' minutes')::INTERVAL)::TIME AS slot_end
  FROM generate_series(
    (SELECT start_time FROM employee_schedule),
    (SELECT end_time FROM employee_schedule) - (p_service_duration || ' minutes')::INTERVAL,
    '30 minutes'::INTERVAL
  ) gs
  WHERE NOT EXISTS (SELECT 1 FROM holiday)
    AND NOT EXISTS (
      SELECT 1 FROM existing_bookings eb
      WHERE gs::TIME < eb.end_time AND (gs + (p_service_duration || ' minutes')::INTERVAL)::TIME > eb.start_time
    )
    AND NOT EXISTS (
      SELECT 1 FROM breaks b
      WHERE gs::TIME < b.end_time AND (gs + (p_service_duration || ' minutes')::INTERVAL)::TIME > b.start_time
    );
END;
$$;
