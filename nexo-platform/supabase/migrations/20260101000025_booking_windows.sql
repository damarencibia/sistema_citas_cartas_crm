-- =============================================================
-- Migration 000025: booking_windows + V2 preparation fields
-- =============================================================
-- 1. booking_windows: date-specific availability overrides
-- 2. V2 fields on bookings (resource_id, custom_duration, approval)
-- 3. V2 fields on services (max_participants, requires_approval)
-- =============================================================

-- 1. Booking windows table
CREATE TABLE booking_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_mode VARCHAR(10) NOT NULL DEFAULT 'fixed'
    CHECK (slot_mode IN ('fixed', 'flexible')),
  slot_interval_minutes INT NOT NULL DEFAULT 30
    CHECK (slot_interval_minutes >= 5 AND slot_interval_minutes <= 480),
  buffer_before_minutes INT NOT NULL DEFAULT 0
    CHECK (buffer_before_minutes >= 0 AND buffer_before_minutes <= 120),
  buffer_after_minutes INT NOT NULL DEFAULT 0
    CHECK (buffer_after_minutes >= 0 AND buffer_after_minutes <= 120),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  CHECK (end_time > start_time)
);

CREATE INDEX idx_booking_windows_lookup
  ON booking_windows(tenant_id, employee_id, service_id, start_date, end_date)
  WHERE is_active = true;

ALTER TABLE booking_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY booking_windows_tenant_isolation ON booking_windows
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

CREATE POLICY booking_windows_public_read ON booking_windows
  FOR SELECT TO anon
  USING (is_active = true);

-- 2. V2 fields on bookings
ALTER TABLE bookings ADD COLUMN resource_id UUID;
ALTER TABLE bookings ADD COLUMN custom_duration_minutes INT
  CHECK (custom_duration_minutes IS NULL OR (custom_duration_minutes >= 5 AND custom_duration_minutes <= 480));
ALTER TABLE bookings ADD COLUMN requires_approval BOOLEAN DEFAULT false;

-- 3. V2 fields on services
ALTER TABLE services ADD COLUMN max_participants INT DEFAULT 1
  CHECK (max_participants >= 1);
ALTER TABLE services ADD COLUMN requires_approval BOOLEAN DEFAULT false;
