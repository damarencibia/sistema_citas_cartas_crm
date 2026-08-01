-- =============================================================
-- Migration 000050: Sistema de notificaciones in-app (módulo citas)
-- + consentimiento WhatsApp en bookings
-- =============================================================

-- 1. Consentimiento WhatsApp en bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS whatsapp_consent BOOLEAN NOT NULL DEFAULT false;

-- 2. Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(tenant_id, recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_user_id, is_read) WHERE is_read = false;

-- 3. RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select ON notifications
  FOR SELECT USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (
      recipient_user_id IS NULL
      OR recipient_user_id IN (
        SELECT id FROM users
        WHERE supabase_user_id = auth.uid()
          AND deleted_at IS NULL
      )
    )
  );

CREATE POLICY notifications_update ON notifications
  FOR UPDATE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND recipient_user_id IN (
      SELECT id FROM users
      WHERE supabase_user_id = auth.uid()
        AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND recipient_user_id IN (
      SELECT id FROM users
      WHERE supabase_user_id = auth.uid()
        AND deleted_at IS NULL
    )
  );

-- 4. Realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

-- 5. Helper: crear una notificación (SECURITY DEFINER, usado por triggers)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_tenant_id UUID,
  p_recipient_user_id UUID,
  p_type VARCHAR(40),
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_recipient_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO notifications (tenant_id, recipient_user_id, type, title, body, data)
  VALUES (p_tenant_id, p_recipient_user_id, p_type, p_title, p_body, COALESCE(p_data, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 6. Trigger: notificación al crear una reserva
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

  IF NEW.status = 'pending_approval' THEN
    FOR v_recipient IN
      SELECT id FROM users
      WHERE tenant_id = NEW.tenant_id
        AND role IN ('owner', 'admin')
        AND deleted_at IS NULL
    LOOP
      PERFORM create_notification(
        NEW.tenant_id, v_recipient.id, 'booking_pending_approval',
        'Reserva pendiente de aprobación',
        format('%s · %s a las %s — %s', COALESCE(v_service_name, 'Servicio'), v_date_text, v_time_text, COALESCE(NEW.customer_name, 'Cliente')),
        v_data
      );
    END LOOP;
  ELSE
    SELECT u.id INTO v_uid
    FROM employees e
    JOIN users u ON u.id = e.user_id
    WHERE e.id = NEW.employee_id
      AND e.deleted_at IS NULL
      AND u.deleted_at IS NULL
    LIMIT 1;

    IF v_uid IS NOT NULL THEN
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

DROP TRIGGER IF EXISTS trg_booking_notification ON bookings;

CREATE TRIGGER trg_booking_notification
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_notification();

-- 7. Trigger: oferta de lista de espera enviada (notifica al staff que promovió)
CREATE OR REPLACE FUNCTION public.handle_waitlist_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_name TEXT;
  v_data JSONB;
  v_uid UUID;
BEGIN
  SELECT name INTO v_service_name FROM services WHERE id = NEW.service_id;

  SELECT id INTO v_uid
  FROM users
  WHERE supabase_user_id = auth.uid()
    AND tenant_id = NEW.tenant_id
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  v_data := jsonb_build_object(
    'waitlist_id', NEW.id,
    'offer_token', NEW.offer_token,
    'customer_name', NEW.customer_name,
    'date', NEW.offered_slot_date,
    'start_time', NEW.offered_slot_time
  );

  PERFORM create_notification(
    NEW.tenant_id, v_uid, 'waitlist_offer',
    'Oferta de lista de espera enviada',
    format(
      '%s · %s a las %s — %s',
      COALESCE(v_service_name, 'Servicio'),
      TO_CHAR(NEW.offered_slot_date, 'DD/MM/YYYY'),
      TO_CHAR(NEW.offered_slot_time, 'HH24:MI'),
      COALESCE(NEW.customer_name, 'Cliente')
    ),
    v_data
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_waitlist_notification ON waitlist;

CREATE TRIGGER trg_waitlist_notification
  AFTER UPDATE OF status ON waitlist
  FOR EACH ROW
  WHEN (NEW.status = 'notified')
  EXECUTE FUNCTION public.handle_waitlist_notification();
