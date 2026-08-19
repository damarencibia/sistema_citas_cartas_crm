-- =============================================================
-- Migration 000071: Notificación al asignar turno de cola
-- =============================================================
-- 1. transfer_booking_to_waitlist v2: ahora retorna
--    (new_booking_id, customer_access_token) para que el frontend
--    pueda avisar (WhatsApp / enlace mágico) al cliente recién
--    asignado. Además el nuevo turno nace 'pending_confirmation':
--    el cliente debe confirmar asistencia en Mis Reservas.
-- 2. confirm_booking_attendance: RPC público (anon) que valida el
--    access_token del cliente contra el turno; 'true' confirma
--    (confirmed), 'false' cancela (cancelled_by='customer').
-- =============================================================

-- 1. transfer_booking_to_waitlist v2
DROP FUNCTION IF EXISTS public.transfer_booking_to_waitlist(UUID, UUID);

CREATE OR REPLACE FUNCTION public.transfer_booking_to_waitlist(
  p_booking_id UUID,
  p_waitlist_id UUID
)
RETURNS TABLE (new_booking_id UUID, customer_access_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_booking RECORD;
  v_entry RECORD;
  v_duration INT;
  v_end_time TIME;
  v_customer_id UUID;
  v_customer_token TEXT;
  v_customer_row RECORD;
  v_new_booking_id UUID;
BEGIN
  v_tenant_id := (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant no identificado';
  END IF;

  SELECT b.* INTO v_booking
  FROM bookings b
  WHERE b.id = p_booking_id
    AND b.tenant_id = v_tenant_id
    AND b.deleted_at IS NULL
    AND b.status NOT IN ('cancelled')
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Turno no encontrado o ya cancelado';
  END IF;

  SELECT w.* INTO v_entry
  FROM waitlist w
  WHERE w.id = p_waitlist_id
    AND w.tenant_id = v_tenant_id
    AND w.status IN ('waiting', 'notified')
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrada de la cola no encontrada';
  END IF;

  SELECT s.duration_minutes
    INTO v_duration
  FROM services s
  WHERE s.id = v_booking.service_id;
  IF v_duration IS NULL THEN
    RAISE EXCEPTION 'Servicio no encontrado';
  END IF;

  v_duration := COALESCE(v_booking.custom_duration_minutes, v_duration);
  v_end_time := (v_booking.start_time + (v_duration || ' minutes')::INTERVAL)::TIME;

  -- Cancelar el turno original (cumple el CHECK cancelled_at ↔ cancellation_reason)
  UPDATE bookings
  SET status = 'cancelled',
      cancelled_by = 'employee',
      cancelled_at = now(),
      cancellation_reason = 'Turno asignado al primer cliente de la cola',
      updated_at = now()
  WHERE id = p_booking_id;

  -- Resolver el cliente (mismo criterio que create() del repositorio)
  v_customer_id := NULL;
  v_customer_token := NULL;
  IF NULLIF(btrim(v_entry.customer_email), '') IS NOT NULL THEN
    SELECT * INTO v_customer_row
    FROM public.upsert_booking_customer(
      v_tenant_id,
      v_entry.customer_name,
      v_entry.customer_email,
      COALESCE(v_entry.customer_phone, '')
    );
    v_customer_id := v_customer_row.id;
    v_customer_token := v_customer_row.access_token;
  END IF;

  -- Crear el nuevo booking (el trigger prevent_double_booking ya no
  -- bloquea porque el original quedó cancelado). Nace
  -- 'pending_confirmation': el cliente confirma asistencia en el
  -- enlace mágico que le envía el negocio.
  INSERT INTO bookings (
    tenant_id, service_id, employee_id, date, start_time, end_time,
    customer_id, customer_name, customer_email, customer_phone,
    notes, source, status, participant_count, custom_duration_minutes,
    whatsapp_consent
  ) VALUES (
    v_tenant_id, v_booking.service_id, v_booking.employee_id, v_booking.date,
    v_booking.start_time, v_end_time,
    v_customer_id, v_entry.customer_name, v_entry.customer_email, v_entry.customer_phone,
    v_booking.notes, 'manual', 'pending_confirmation',
    v_booking.participant_count, v_booking.custom_duration_minutes,
    v_booking.whatsapp_consent
  )
  RETURNING id INTO v_new_booking_id;

  -- Marcar la entrada como convertida
  UPDATE waitlist
  SET status = 'converted', updated_at = now()
  WHERE id = p_waitlist_id;

  -- Log del cambio de estado del turno original
  INSERT INTO booking_status_log (
    tenant_id, booking_id, old_status, new_status, changed_by, changed_by_name, reason
  ) VALUES (
    v_tenant_id, p_booking_id, v_booking.status, 'cancelled', 'employee', 'Agenda',
    'Turno asignado al primer cliente de la cola'
  );

  new_booking_id := v_new_booking_id;
  customer_access_token := v_customer_token;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_booking_to_waitlist(UUID, UUID) TO authenticated;

-- =============================================================
-- 2. confirm_booking_attendance: confirmación del cliente
-- =============================================================
CREATE OR REPLACE FUNCTION public.confirm_booking_attendance(
  p_token TEXT,
  p_booking_id UUID,
  p_attends BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_booking RECORD;
  v_new_status VARCHAR(20);
BEGIN
  IF NULLIF(btrim(p_token), '') IS NULL THEN
    RAISE EXCEPTION 'Enlace no válido';
  END IF;

  SELECT b.* INTO v_booking
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  WHERE b.id = p_booking_id
    AND c.access_token = p_token
    AND b.deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva no encontrada o enlace no válido';
  END IF;

  IF v_booking.status <> 'pending_confirmation' THEN
    RAISE EXCEPTION 'La reserva ya no está pendiente de confirmación';
  END IF;

  IF p_attends THEN
    v_new_status := 'confirmed';
    UPDATE bookings
    SET status = 'confirmed', updated_at = now()
    WHERE id = p_booking_id;
  ELSE
    v_new_status := 'cancelled';
    UPDATE bookings
    SET status = 'cancelled',
        cancelled_by = 'customer',
        cancelled_at = now(),
        cancellation_reason = 'El cliente declinó el turno asignado de la cola',
        updated_at = now()
    WHERE id = p_booking_id;
  END IF;

  INSERT INTO booking_status_log (
    tenant_id, booking_id, old_status, new_status, changed_by, changed_by_name, reason
  ) VALUES (
    v_booking.tenant_id, p_booking_id, v_booking.status, v_new_status, 'customer',
    v_booking.customer_name,
    CASE WHEN p_attends
      THEN 'Confirmación de asistencia del cliente'
      ELSE 'Cliente no podrá asistir al turno asignado'
    END
  );

  RETURN p_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_booking_attendance(TEXT, UUID, BOOLEAN) TO anon, authenticated;