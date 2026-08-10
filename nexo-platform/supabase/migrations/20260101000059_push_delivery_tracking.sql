-- =============================================================
-- Migration 000059: Telemetría y reintentos de notificaciones push
-- -------------------------------------------------------------
-- 1. Tabla push_deliveries: un job por notificación/recipiente.
-- 2. send_push_notification reescrita: crea el job (pending) y
--    dispara el envío asíncrono vía pg_net a send-push con delivery_id.
-- 3. send-push reporta el resultado (service role) actualizando el
--    job; si hay fallos transitorios, deja el job en 'pending' con
--    next_retry_at. retry_push_deliveries() (pg_cron, cada 5 min)
--    reintenta hasta 5 intentos con backoff.
-- 4. Limpieza de jobs antiguos (> 30 días).
-- =============================================================

-- 1. Tabla de entregas
CREATE TABLE IF NOT EXISTS public.push_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  deleted_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_deliveries_pending
  ON public.push_deliveries(status, next_retry_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_push_deliveries_recipient
  ON public.push_deliveries(recipient_user_id, created_at DESC);

-- 2. RLS: el usuario solo puede ver sus propias entregas
ALTER TABLE public.push_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_deliveries_select ON public.push_deliveries
  FOR SELECT USING (
    recipient_user_id IN (
      SELECT id FROM public.users
      WHERE supabase_user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- 3. send_push_notification reescrita: crea el job y dispara el envío
-- (se elimina la sobrecarga anterior de 5 args para no dejar código muerto)
DROP FUNCTION IF EXISTS public.send_push_notification(UUID, UUID, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.send_push_notification(
  p_tenant_id UUID,
  p_recipient_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_notification_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url TEXT := 'https://yrtzumwegcbjnaxdncps.functions.supabase.co/send-push';
  v_secret TEXT := 'dc3b21c1644ebcea770a9ebb14278f8da6f310fb3941d9c4';
  v_payload JSONB;
  v_delivery_id UUID;
  v_have_subs BOOLEAN;
BEGIN
  IF p_recipient_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.push_subscriptions
    WHERE user_id = p_recipient_user_id
      AND (tenant_id = p_tenant_id OR tenant_id IS NULL)
  ) INTO v_have_subs;

  IF NOT v_have_subs THEN
    RETURN;
  END IF;

  INSERT INTO public.push_deliveries (notification_id, recipient_user_id, tenant_id)
  VALUES (p_notification_id, p_recipient_user_id, p_tenant_id)
  RETURNING id INTO v_delivery_id;

  v_payload := jsonb_build_object(
    'delivery_id', v_delivery_id,
    'recipient_user_id', p_recipient_user_id,
    'tenant_id', p_tenant_id,
    'title', p_title,
    'body', p_body,
    'data', COALESCE(p_data, '{}'::jsonb)
  );

  PERFORM net.http_post(
    url := v_url,
    body := v_payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', v_secret
    )
  );
END;
$$;

-- 4. create_notification: vincular el job con la notificación
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
  v_data JSONB;
BEGIN
  IF p_recipient_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_data := COALESCE(p_data, '{}'::jsonb) || jsonb_build_object('notification_type', p_type);

  INSERT INTO notifications (tenant_id, recipient_user_id, type, title, body, data)
  VALUES (p_tenant_id, p_recipient_user_id, p_type, p_title, p_body, v_data)
  RETURNING id INTO v_id;

  PERFORM public.send_push_notification(p_tenant_id, p_recipient_user_id, p_title, p_body, v_data, v_id);

  RETURN v_id;
END;
$$;

-- 5. Reintentos: redispara jobs pendientes y limpia jobs antiguos
CREATE OR REPLACE FUNCTION public.retry_push_deliveries()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url TEXT := 'https://yrtzumwegcbjnaxdncps.functions.supabase.co/send-push';
  v_secret TEXT := 'dc3b21c1644ebcea770a9ebb14278f8da6f310fb3941d9c4';
  v_count INTEGER := 0;
  v_row RECORD;
  v_payload JSONB;
BEGIN
  FOR v_row IN
    SELECT d.id, d.recipient_user_id, d.tenant_id
    FROM public.push_deliveries d
    WHERE d.status = 'pending'
      AND d.attempts < 5
      AND (d.next_retry_at IS NULL OR d.next_retry_at <= now())
    ORDER BY d.created_at ASC
    LIMIT 100
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.push_subscriptions
      WHERE user_id = v_row.recipient_user_id
        AND (tenant_id = v_row.tenant_id OR tenant_id IS NULL)
    ) THEN
      v_payload := jsonb_build_object(
        'delivery_id', v_row.id,
        'recipient_user_id', v_row.recipient_user_id,
        'tenant_id', v_row.tenant_id,
        'retry', true
      );
      PERFORM net.http_post(
        url := v_url,
        body := v_payload,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-push-secret', v_secret
        )
      );
    ELSE
      -- Sin suscripciones: cerrar el job
      UPDATE public.push_deliveries
      SET status = 'done',
          last_error = 'sin suscripciones activas',
          updated_at = now()
      WHERE id = v_row.id;
    END IF;
    v_count := v_count + 1;
  END LOOP;

  -- Limpiar jobs antiguos (más de 30 días)
  DELETE FROM public.push_deliveries
  WHERE created_at < now() - interval '30 days';

  RETURN v_count;
END;
$$;

-- 6. Cron cada 5 minutos
SELECT cron.schedule(
  'retry-push-deliveries',
  '*/5 * * * *',
  $$SELECT retry_push_deliveries()$$
);
