-- =============================================================
-- Migration 000085: Notificaciones garantizadas
-- -------------------------------------------------------------
-- Diagnóstico: Web Push no tiene acuse de recibo. push_deliveries
-- marca 'done' cuando FCM acepta el mensaje, aunque el navegador
-- haya sido eliminado por Android y nunca muestre la notificación.
--
-- Sistema de garantía (ver docs/22-notificaciones-garantizadas.md):
--   Nivel A: re-push de notificaciones críticas no leídas tras
--            ~10 min (escalation_level 0 -> 1).
--   Nivel B: email de respaldo (Resend) vía Edge Function
--            send-email-fallback tras ~30 min (1 -> 2).
--   El nivel B lo marca la propia función tras enviar el email.
--
-- Nota: la cabecera 'Urgency: high' del push se añadió en send-push
-- (función Edge, no SQL).
-- =============================================================

-- 1. Columna de estado de escalado
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS escalation_level SMALLINT NOT NULL DEFAULT 0;

-- 2. Función de escalado
CREATE OR REPLACE FUNCTION public.escalate_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_push_url  TEXT := 'https://yrtzumwegcbjnaxdncps.functions.supabase.co/send-push';
  v_email_url TEXT := 'https://yrtzumwegcbjnaxdncps.functions.supabase.co/send-email-fallback';
  v_secret    TEXT := 'dc3b21c1644ebcea770a9ebb14278f8da6f310fb3941d9c4';
  v_count INTEGER := 0;
  v_row RECORD;
  v_payload JSONB;
BEGIN
  -- ---------- Nivel A: re-push de no leídas ----------
  FOR v_row IN
    SELECT n.id, n.tenant_id, n.recipient_user_id, n.title, n.body, n.data
    FROM public.notifications n
    JOIN public.users u
      ON u.id = n.recipient_user_id AND u.deleted_at IS NULL
    JOIN public.tenants t
      ON t.id = n.tenant_id AND t.deleted_at IS NULL
    WHERE n.is_read = false
      AND n.escalation_level = 0
      AND n.type IN ('booking_created', 'booking_pending_approval', 'waitlist_offer')
      AND COALESCE((t.config ->> 'escalation_enabled')::boolean, true)
      AND n.created_at <= now() - make_interval(mins => COALESCE((t.config ->> 'push_repush_minutes')::int, 10))
  LOOP
    -- Re-push solo si hay suscripciones activas; en cualquier caso se
    -- marca nivel 1 para que el email de respaldo progrese después.
    IF EXISTS (
      SELECT 1 FROM public.push_subscriptions
      WHERE user_id = v_row.recipient_user_id
        AND (tenant_id = v_row.tenant_id OR tenant_id IS NULL)
    ) THEN
      v_payload := jsonb_build_object(
        'recipient_user_id', v_row.recipient_user_id,
        'tenant_id', v_row.tenant_id,
        'title', v_row.title,
        'body', v_row.body,
        'data', COALESCE(v_row.data, '{}'::jsonb)
      );

      PERFORM net.http_post(
        url := v_push_url,
        body := v_payload,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-push-secret', v_secret
        )
      );
    END IF;

    UPDATE public.notifications
    SET escalation_level = 1
    WHERE id = v_row.id;

    v_count := v_count + 1;
  END LOOP;

  -- ---------- Nivel B: email de respaldo ----------
  -- La función send-email-fallback marca escalation_level = 2 tras
  -- enviar el email; si falla, la fila sigue en nivel 1 y reintenta.
  FOR v_row IN
    SELECT n.id
    FROM public.notifications n
    JOIN public.users u
      ON u.id = n.recipient_user_id AND u.deleted_at IS NULL
    JOIN public.tenants t
      ON t.id = n.tenant_id AND t.deleted_at IS NULL
    WHERE n.is_read = false
      AND n.escalation_level = 1
      AND n.type IN ('booking_created', 'booking_pending_approval', 'waitlist_offer')
      AND COALESCE((t.config ->> 'escalation_enabled')::boolean, true)
      AND n.created_at <= now() - make_interval(mins => COALESCE((t.config ->> 'push_email_minutes')::int, 30))
  LOOP
    v_payload := jsonb_build_object('notification_id', v_row.id);

    PERFORM net.http_post(
      url := v_email_url,
      body := v_payload,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-push-secret', v_secret
      )
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 3. Cron cada 5 minutos, desfasado del cron de reintentos (*/5)
SELECT cron.unschedule('escalate-notifications')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'escalate-notifications');

SELECT cron.schedule(
  'escalate-notifications',
  '3-58/5 * * * *',
  $$SELECT public.escalate_notifications()$$
);
