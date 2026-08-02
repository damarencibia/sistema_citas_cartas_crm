-- =============================================================
-- Migration 000053: Notificar siempre al negocio (owners/admins)
-- por cada reserva creada, no solo cuando requiere aprobación.
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_booking_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_name TEXT;
  v_date_text TEXT;
  v_time_text TEXT;
  v_data JSONB;
  v_recipient RECORD;
  v_uid UUID;
  v_is_approval BOOLEAN := (NEW.status = 'pending_approval');
BEGIN
  SELECT name INTO v_service_name FROM services WHERE id = NEW.service_id;
  v_date_text := TO_CHAR(NEW.date, 'DD/MM/YYYY');
  v_time_text := TO_CHAR(NEW.start_time, 'HH24:MI');
  v_data := jsonb_build_object(
    'booking_id', NEW.id,
    'service_id', NEW.service_id,
    'employee_id', NEW.employee_id,
    'date', NEW.date,
    'start_time', NEW.start_time,
    'customer_name', NEW.customer_name
  );

  -- 1) Siempre notificar a owners/admins del tenant (antes solo en pending_approval)
  FOR v_recipient IN
    SELECT id FROM users
    WHERE tenant_id = NEW.tenant_id
      AND role IN ('owner', 'admin')
      AND deleted_at IS NULL
  LOOP
    PERFORM create_notification(
      NEW.tenant_id,
      v_recipient.id,
      CASE WHEN v_is_approval THEN 'booking_pending_approval' ELSE 'booking_created' END,
      CASE WHEN v_is_approval THEN 'Reserva pendiente de aprobación' ELSE 'Nueva reserva' END,
      format('%s · %s a las %s — %s', COALESCE(v_service_name, 'Servicio'), v_date_text, v_time_text, COALESCE(NEW.customer_name, 'Cliente')),
      v_data
    );
  END LOOP;

  -- 2) Notificar al empleado asignado (solo reservas confirmadas y si no es ya owner/admin)
  IF NOT v_is_approval THEN
    SELECT u.id INTO v_uid
    FROM employees e
    JOIN users u ON u.id = e.user_id
    WHERE e.id = NEW.employee_id
      AND e.deleted_at IS NULL
      AND u.deleted_at IS NULL
    LIMIT 1;

    IF v_uid IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = v_uid
        AND tenant_id = NEW.tenant_id
        AND role IN ('owner', 'admin')
        AND deleted_at IS NULL
    ) THEN
      PERFORM create_notification(
        NEW.tenant_id, v_uid, 'booking_created',
        'Nueva reserva',
        format('%s · %s a las %s — %s', COALESCE(v_service_name, 'Servicio'), v_date_text, v_time_text, COALESCE(NEW.customer_name, 'Cliente')),
        v_data
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
