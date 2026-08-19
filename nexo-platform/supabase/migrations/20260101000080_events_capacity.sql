-- Migration 000080: Events with limited capacity
-- Adds an "is_event" flag and event scheduling fields to services, relaxes the
-- double-booking trigger for events, and adds an atomic capacity guard on insert.

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS is_event BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS event_date DATE NULL,
  ADD COLUMN IF NOT EXISTS event_start_time TIME NULL,
  ADD COLUMN IF NOT EXISTS event_end_time TIME NULL,
  ADD COLUMN IF NOT EXISTS reservation_open_date DATE NULL,
  ADD COLUMN IF NOT EXISTS reservation_close_offset_minutes INTEGER NULL;

-- ============================================================
-- 1. Relax double-booking trigger for events
-- ============================================================
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
      AND NOT s.is_event
  ) THEN
    RAISE EXCEPTION 'El empleado ya tiene una cita en ese horario.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. Capacity guard for events (atomic overbooking prevention)
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_event_overbooking()
RETURNS TRIGGER AS $$
DECLARE
  v_is_event BOOLEAN;
  v_capacity INTEGER;
  v_taken INTEGER;
BEGIN
  SELECT s.is_event, s.max_participants
    INTO v_is_event, v_capacity
  FROM services s WHERE s.id = NEW.service_id;

  IF v_is_event IS DISTINCT FROM true OR v_capacity IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(participant_count), 0)
    INTO v_taken
  FROM bookings
  WHERE service_id = NEW.service_id
    AND date = NEW.date
    AND status NOT IN ('cancelled')
    AND deleted_at IS NULL
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_taken + COALESCE(NEW.participant_count, 1) > v_capacity THEN
    RAISE EXCEPTION 'El evento ha alcanzado su capacidad máxima.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_event_overbooking ON bookings;
CREATE TRIGGER trg_prevent_event_overbooking
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL AND NEW.status NOT IN ('cancelled'))
  EXECUTE FUNCTION prevent_event_overbooking();
