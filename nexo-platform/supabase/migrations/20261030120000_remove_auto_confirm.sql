-- =============================================================
-- Migration 20261030120000: remove auto-confirm logic
-- =============================================================
-- The per-shift `schedules.auto_confirm` flag is removed. The
-- initial status of a portal booking is now decided by a single
-- mechanism: `services.requires_approval` -> 'pending_approval'
-- (the "Por aprobar" tab); everything else is born 'confirmed'.
--
-- The 'pending_confirmation' status is retired:
--   * any surviving rows are migrated to 'confirmed';
--   * the CHECK constraint no longer allows it.
--
-- Dead RPCs from the old queue-assignment flow (the waitlist is a
-- passive registry now) are dropped:
--   * transfer_booking_to_waitlist(...)         (000071)
--   * confirm_booking_attendance(...)           (000071)
-- =============================================================

ALTER TABLE schedules DROP COLUMN IF EXISTS auto_confirm;

UPDATE bookings SET status = 'confirmed' WHERE status = 'pending_confirmation';

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'confirmed','in_progress','completed','no_show','cancelled','pending_approval'
  ));

DROP FUNCTION IF EXISTS public.transfer_booking_to_waitlist(UUID, UUID);
DROP FUNCTION IF EXISTS public.confirm_booking_attendance(TEXT, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS public.confirm_booking_attendance(UUID, BOOLEAN);

-- replace_schedules: same frame/subordination logic as 20261028120000,
-- without the removed auto_confirm field. Legacy payloads that still
-- send the field are accepted but ignored.
CREATE OR REPLACE FUNCTION replace_schedules(
  p_employee_id UUID,
  p_schedules JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id UUID;
  v_role TEXT;
  v_user_id UUID;
  v_item JSONB;
  v_day SMALLINT;
  v_start TIME;
  v_end TIME;
  v_mode VARCHAR(10);
  v_interval INT;
  v_advance INT;
  v_min_advance INT;
  v_frame_start TIME;
  v_frame_end TIME;
  v_has_frame BOOLEAN;
  v_count INT := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_tenant_id := (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
  v_role := auth.jwt() -> 'app_metadata' ->> 'role';

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant context';
  END IF;

  IF v_role = 'employee' THEN
    IF p_employee_id IS NULL THEN
      RAISE EXCEPTION 'Employees cannot edit the business default schedule';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM employees e
      JOIN users u ON u.id = e.user_id
      WHERE e.id = p_employee_id
        AND e.tenant_id = v_tenant_id
        AND e.deleted_at IS NULL
        AND u.supabase_user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Not authorized to edit this schedule';
    END IF;
  ELSIF v_role IN ('owner', 'admin') THEN
    IF p_employee_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM employees e
      WHERE e.id = p_employee_id
        AND e.tenant_id = v_tenant_id
        AND e.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Employee not found in tenant';
    END IF;
  ELSE
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_employee_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM schedules
      WHERE tenant_id = v_tenant_id
        AND employee_id IS NULL
        AND is_active
    ) INTO v_has_frame;
  END IF;

  DELETE FROM schedules
  WHERE tenant_id = v_tenant_id
    AND employee_id IS NOT DISTINCT FROM p_employee_id;

  IF jsonb_typeof(p_schedules) <> 'array' THEN
    RETURN jsonb_build_object('success', true, 'count', 0);
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_schedules)
  LOOP
    v_day := (v_item ->> 'day_of_week')::SMALLINT;
    v_start := (v_item ->> 'start_time')::TIME;
    v_end := (v_item ->> 'end_time')::TIME;
    v_mode := COALESCE(v_item ->> 'slot_mode', 'fixed');
    v_interval := COALESCE((v_item ->> 'slot_interval_minutes')::INT, 30);
    v_advance := COALESCE((v_item ->> 'advance_booking_days')::INT, 7);
    v_min_advance := COALESCE((v_item ->> 'min_advance_minutes')::INT, 15);

    IF v_day IS NULL OR v_day NOT BETWEEN 0 AND 6 THEN
      RAISE EXCEPTION 'Invalid day_of_week: %', v_day;
    END IF;
    IF v_start IS NULL OR v_end IS NULL OR v_end <= v_start THEN
      RAISE EXCEPTION 'Invalid time range: % - %', v_start, v_end;
    END IF;

    IF p_employee_id IS NOT NULL AND v_has_frame THEN
      SELECT MIN(start_time), MAX(end_time)
        INTO v_frame_start, v_frame_end
      FROM schedules
      WHERE tenant_id = v_tenant_id
        AND employee_id IS NULL
        AND is_active
        AND day_of_week = v_day;

      IF v_frame_start IS NULL THEN
        RAISE EXCEPTION 'BUSINESS_DAY_CLOSED:%', v_day
          USING ERRCODE = 'check_violation';
      END IF;

      IF v_start < v_frame_start OR v_end > v_frame_end THEN
        RAISE EXCEPTION 'SHIFT_OUT_OF_BUSINESS_HOURS:%:%:%',
          v_day,
          to_char(v_frame_start, 'HH24:MI'),
          to_char(v_frame_end, 'HH24:MI')
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;

    INSERT INTO schedules (
      tenant_id, employee_id, day_of_week, start_time, end_time,
      is_active, slot_mode, slot_interval_minutes,
      advance_booking_days, min_advance_minutes
    )
    VALUES (
      v_tenant_id, p_employee_id, v_day, v_start, v_end,
      true, v_mode, v_interval, v_advance, v_min_advance
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION replace_schedules(UUID, JSONB) TO authenticated;
