-- Migration 000081: Dedicated events module
-- Removes the previous "events as services" experiment (is_event flag on services,
-- overbooking trigger on bookings) and introduces the dedicated events domain:
--   events                 -> event catalog (capacity, date/time, booking window)
--   event_registrations    -> attendees / registrations (schema for upcoming phases)
-- Events are activated per tenant via the `modules` JSONB column (events: true).

-- ============================================================
-- 1. Undo events bolted onto bookings/services
-- ============================================================
DROP TRIGGER IF EXISTS trg_prevent_event_overbooking ON bookings;
DROP FUNCTION IF EXISTS prevent_event_overbooking();

-- Revert prevent_double_booking to its original form (no event exemption).
CREATE OR REPLACE FUNCTION prevent_double_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM bookings b
    JOIN services s ON s.id = b.service_id
    WHERE b.employee_id = NEW.employee_id
      AND b.date = NEW.date
      AND b.status NOT IN ('cancelled')
      AND b.deleted_at IS NULL
      AND b.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND NEW.start_time < b.end_time
      AND NEW.end_time > b.start_time
  ) THEN
    RAISE EXCEPTION 'El empleado ya tiene una cita en ese horario.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop event columns from services (they moved to the dedicated events table).
ALTER TABLE services
  DROP COLUMN IF EXISTS is_event,
  DROP COLUMN IF EXISTS event_date,
  DROP COLUMN IF EXISTS event_start_time,
  DROP COLUMN IF EXISTS event_end_time,
  DROP COLUMN IF EXISTS reservation_open_date,
  DROP COLUMN IF EXISTS reservation_close_offset_minutes;

-- ============================================================
-- 2. Dedicated events table
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL,
  max_participants INTEGER,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reservation_open_date DATE,
  reservation_close_offset_minutes INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_events_tenant ON events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);

-- ============================================================
-- 3. Event registrations (attendees). Schema ready; UI in a
--    later phase. Lifecycle is own to events:
--    confirmed | waitlisted | cancelled
-- ============================================================
CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  participant_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'waitlisted', 'cancelled')),
  access_token TEXT,
  notes TEXT,
  whatsapp_consent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_tenant ON event_registrations(tenant_id);

-- ============================================================
-- 4. Enable the events module flag by default for new tenants
-- ============================================================
ALTER TABLE tenants
  ALTER COLUMN modules
  SET DEFAULT '{"appointments": true, "digital_menu": false, "crm": false, "events": false}'::jsonb;