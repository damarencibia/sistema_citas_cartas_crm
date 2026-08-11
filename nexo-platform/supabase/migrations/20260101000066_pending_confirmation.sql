-- =============================================================
-- Migration 000066: Pending Confirmation status
-- =============================================================
-- Expand bookings status CHECK to include 'pending_confirmation'
-- Bookings created from the public portal arrive with this status
-- until the business confirms them.
-- =============================================================

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'confirmed','in_progress','completed','no_show','cancelled',
    'pending_approval','pending_confirmation'
  ));
