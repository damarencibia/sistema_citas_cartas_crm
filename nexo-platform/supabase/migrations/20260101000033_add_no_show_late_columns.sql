-- Add missing columns that the Booking type expects but were never created:
-- no_show_at: timestamp when a booking was marked as no-show
-- late_minutes: how many minutes late the customer was

ALTER TABLE bookings ADD COLUMN no_show_at TIMESTAMPTZ NULL;
ALTER TABLE bookings ADD COLUMN late_minutes INT NULL;
