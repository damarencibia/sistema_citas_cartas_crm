-- Migration 000034: Double-booking prevention trigger + no-show auto-detection

-- ============================================================
-- 1. TRIGGER: Prevent double-booking at DB level
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_double_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE employee_id = NEW.employee_id
      AND date = NEW.date
      AND status NOT IN ('cancelled')
      AND deleted_at IS NULL
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND NEW.start_time < end_time
      AND NEW.end_time > start_time
  ) THEN
    RAISE EXCEPTION 'El empleado ya tiene una cita en ese horario.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_double_booking ON bookings;
CREATE TRIGGER trg_prevent_double_booking
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL AND NEW.status NOT IN ('cancelled'))
  EXECUTE FUNCTION prevent_double_booking();

-- ============================================================
-- 2. TRIGGER: Prevent midnight overflow (end_time > start_time)
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_midnight_overflow()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'El servicio excede el horario laboral (end_time must be after start_time).';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_midnight_overflow ON bookings;
CREATE TRIGGER trg_prevent_midnight_overflow
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION prevent_midnight_overflow();

-- ============================================================
-- 3. CRON: Auto-detect no-shows (confirmed bookings past grace period)
-- ============================================================
CREATE OR REPLACE FUNCTION detect_no_shows()
RETURNS void AS $$
DECLARE
  v_tenant RECORD;
  v_booking RECORD;
  v_config JSONB;
  v_grace_minutes INT;
  v_cutoff TIMESTAMP;
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

    v_cutoff := (v_today || ' ' || '23:59:59')::TIMESTAMP - (v_grace_minutes || ' minutes')::INTERVAL;

    FOR v_booking IN
      SELECT b.id, b.start_time, b.employee_id
      FROM bookings b
      WHERE b.tenant_id = v_tenant.id
        AND b.date = v_today
        AND b.status = 'confirmed'
        AND b.deleted_at IS NULL
        AND (v_today || ' ' || b.start_time)::TIMESTAMP + (v_grace_minutes || ' minutes')::INTERVAL < v_now
    LOOP
      UPDATE bookings
      SET status = 'no_show',
          no_show_at = v_now,
          updated_at = v_now
      WHERE id = v_booking.id;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
