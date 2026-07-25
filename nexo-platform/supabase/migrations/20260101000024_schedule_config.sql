-- =============================================================
-- Migration 000024: Schedule slot configuration + fixed_slot_definitions
-- =============================================================
-- 1. Adds slot_mode, interval, buffers, and advance settings
--    to each schedule row (per-shift configuration)
-- 2. Creates fixed_slot_definitions for admin-defined explicit slots
-- =============================================================

-- 1. New columns on schedules
ALTER TABLE schedules ADD COLUMN slot_mode VARCHAR(10) NOT NULL DEFAULT 'fixed'
  CHECK (slot_mode IN ('fixed', 'flexible'));

ALTER TABLE schedules ADD COLUMN slot_interval_minutes INT NOT NULL DEFAULT 30
  CHECK (slot_interval_minutes >= 5 AND slot_interval_minutes <= 480);

ALTER TABLE schedules ADD COLUMN buffer_before_minutes INT NOT NULL DEFAULT 0
  CHECK (buffer_before_minutes >= 0 AND buffer_before_minutes <= 120);

ALTER TABLE schedules ADD COLUMN buffer_after_minutes INT NOT NULL DEFAULT 0
  CHECK (buffer_after_minutes >= 0 AND buffer_after_minutes <= 120);

ALTER TABLE schedules ADD COLUMN advance_booking_days INT NOT NULL DEFAULT 7
  CHECK (advance_booking_days >= 1 AND advance_booking_days <= 365);

ALTER TABLE schedules ADD COLUMN min_advance_minutes INT NOT NULL DEFAULT 60
  CHECK (min_advance_minutes >= 0 AND min_advance_minutes <= 4320);

-- 2. Fixed slot definitions (admin-defined explicit slots)
CREATE TABLE fixed_slot_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL CHECK (end_time > start_time),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fixed_slots_lookup
  ON fixed_slot_definitions(tenant_id, employee_id, day_of_week)
  WHERE is_active = true;

ALTER TABLE fixed_slot_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY fixed_slots_tenant_isolation ON fixed_slot_definitions
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

CREATE POLICY fixed_slots_public_read ON fixed_slot_definitions
  FOR SELECT TO anon
  USING (is_active = true);
