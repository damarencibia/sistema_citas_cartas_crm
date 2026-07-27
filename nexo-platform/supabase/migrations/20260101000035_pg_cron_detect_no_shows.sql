-- Migration 000035: Register pg_cron job for no-show detection + compute late_minutes

-- ============================================================
-- 1. Enhance detect_no_shows() to also compute late_minutes
-- ============================================================
CREATE OR REPLACE FUNCTION detect_no_shows()
RETURNS void AS $$
DECLARE
  v_tenant RECORD;
  v_booking RECORD;
  v_config JSONB;
  v_grace_minutes INT;
  v_scheduled_ts TIMESTAMP;
  v_now TIMESTAMP := now();
  v_today DATE := CURRENT_DATE;
BEGIN
  FOR v_tenant IN SELECT id, config FROM tenants WHERE deleted_at IS NULL
  LOOP
    v_config := v_tenant.config;
    v_grace_minutes := COALESCE(
      (v_config->'appointments'->'no_show_policy'->>'grace_period_minutes')::INT,
      (v_config->'appointments'->>'grace_period_minutes')::INT,
      15
    );

    FOR v_booking IN
      SELECT b.id, b.start_time, b.employee_id
      FROM bookings b
      WHERE b.tenant_id = v_tenant.id
        AND b.date = v_today
        AND b.status = 'confirmed'
        AND b.deleted_at IS NULL
        AND (v_today || ' ' || b.start_time)::TIMESTAMP + (v_grace_minutes || ' minutes')::INTERVAL < v_now
    LOOP
      v_scheduled_ts := (v_today || ' ' || v_booking.start_time)::TIMESTAMP;

      UPDATE bookings
      SET status = 'no_show',
          no_show_at = v_now,
          late_minutes = GREATEST(0, EXTRACT(EPOCH FROM (v_now - v_scheduled_ts)) / 60)::INT,
          updated_at = v_now
      WHERE id = v_booking.id;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. Register pg_cron job (every minute)
-- ============================================================
SELECT cron.schedule(
  'detect-no-shows',
  '* * * * *',
  $$SELECT detect_no_shows()$$
);
