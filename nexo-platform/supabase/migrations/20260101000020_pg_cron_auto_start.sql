-- =============================================================
-- Migration 000020: pg_cron auto-start appointments
-- =============================================================
-- Creates a SQL function that transitions confirmed bookings
-- to in_progress when their start_time has passed (with grace period).
-- Scheduled to run every 5 minutes via pg_cron.
-- =============================================================

-- Ensure extensions are available
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Create the auto-start function
CREATE OR REPLACE FUNCTION public.auto_start_appointments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant RECORD;
  v_booking RECORD;
  v_config JSONB;
  v_grace_minutes INT;
  v_cutoff TIMESTAMPTZ;
  v_today DATE;
  v_now TIMESTAMPTZ;
BEGIN
  v_now := NOW();
  v_today := v_now::date;

  FOR v_tenant IN
    SELECT t.id, t.config
    FROM tenants t
    WHERE t.deleted_at IS NULL
      AND t.status = 'active'
  LOOP
    v_config := COALESCE(v_tenant.config, '{}'::jsonb);

    IF NOT (v_config -> 'appointments' ->> 'auto_start')::boolean THEN
      CONTINUE;
    END IF;

    v_grace_minutes := COALESCE(
      (v_config -> 'appointments' -> 'no_show_policy' ->> 'grace_period_minutes')::int,
      15
    );

    v_cutoff := v_now - (v_grace_minutes || ' minutes')::interval;

    FOR v_booking IN
      SELECT b.id, b.start_time, b.employee_id
      FROM bookings b
      WHERE b.tenant_id = v_tenant.id
        AND b.date = v_today
        AND b.status = 'confirmed'
        AND b.deleted_at IS NULL
        AND (v_today || ' ' || b.start_time)::timestamp <= v_cutoff
    LOOP
      -- Update booking status
      UPDATE bookings
      SET status = 'in_progress',
          updated_at = v_now
      WHERE id = v_booking.id;

      -- Log the status change
      INSERT INTO booking_status_log (
        tenant_id, booking_id, old_status, new_status,
        changed_by, changed_by_name, reason
      ) VALUES (
        v_tenant.id, v_booking.id, 'confirmed', 'in_progress',
        'system', 'Auto-start',
        format('Auto-started after %s min grace period', v_grace_minutes)
      );
    END LOOP;
  END LOOP;
END;
$$;

-- Schedule it to run every 5 minutes
SELECT cron.schedule(
  'auto-start-appointments',
  '*/5 * * * *',
  $$SELECT public.auto_start_appointments()$$
);
