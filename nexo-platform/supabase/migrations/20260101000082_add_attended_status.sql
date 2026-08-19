-- Migration 000082: Add 'attended' status to event registrations
-- Required for the check-in flow in the event admin panel.

ALTER TABLE event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_status_check;

ALTER TABLE event_registrations
  ADD CONSTRAINT event_registrations_status_check
  CHECK (status IN ('confirmed', 'waitlisted', 'attended', 'cancelled'));