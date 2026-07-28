-- Migration 000045: Disable automatic no-show and auto-start mechanisms
-- The employee is now responsible for manually managing which appointments
-- were attended (scheduled and extras). The auto-detection cron jobs are
-- no longer needed.

-- Unschedule the no-show detection cron job (runs every 1 min)
SELECT cron.unschedule('detect-no-shows');

-- Unschedule the auto-start cron job (runs every 5 min)
SELECT cron.unschedule('auto-start-appointments');
