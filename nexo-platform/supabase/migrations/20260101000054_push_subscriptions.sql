-- =============================================================
-- Migration 000054: Suscripciones push (Web Push) para notificaciones
-- -------------------------------------------------------------
-- 1. Tabla push_subscriptions (una fila por endpoint suscrito)
-- 2. RLS (el usuario solo gestiona sus propias suscripciones)
-- 3. Funciones SECURITY DEFINER para upsert/delete desde el frontend
-- 4. pg_net: tras crear una notificación, se dispara una petición HTTP
--    al Edge Function `send-push` para entregarla como push real.
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Tabla de suscripciones push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- 2. RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subscriptions_select ON public.push_subscriptions
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM public.users
      WHERE supabase_user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY push_subscriptions_delete ON public.push_subscriptions
  FOR DELETE USING (
    user_id IN (
      SELECT id FROM public.users
      WHERE supabase_user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- 3. Funciones de gestión (frontend con sesión autenticada)
CREATE OR REPLACE FUNCTION public.upsert_push_subscription(
  p_endpoint TEXT,
  p_p256dh TEXT,
  p_auth TEXT,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS public.push_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_sub public.push_subscriptions;
BEGIN
  SELECT id, tenant_id INTO v_user_id, v_tenant_id
  FROM public.users
  WHERE supabase_user_id = auth.uid() AND deleted_at IS NULL
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado no encontrado';
  END IF;

  INSERT INTO public.push_subscriptions (user_id, tenant_id, endpoint, p256dh, auth, user_agent)
  VALUES (v_user_id, v_tenant_id, p_endpoint, p_p256dh, p_auth, p_user_agent)
  ON CONFLICT (endpoint) DO UPDATE
    SET p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent,
        tenant_id = EXCLUDED.tenant_id,
        updated_at = now()
  RETURNING * INTO v_sub;

  RETURN v_sub;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_push_subscription(p_endpoint TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.push_subscriptions
  WHERE endpoint = p_endpoint
    AND user_id IN (
      SELECT id FROM public.users
      WHERE supabase_user_id = auth.uid() AND deleted_at IS NULL
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_push_subscriptions()
RETURNS SETOF public.push_subscriptions
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.push_subscriptions
  WHERE user_id IN (
    SELECT id FROM public.users
    WHERE supabase_user_id = auth.uid() AND deleted_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.upsert_push_subscription(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_push_subscription(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_push_subscriptions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_push_subscription(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_push_subscription(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_push_subscriptions() TO authenticated;

-- 4. Disparo de push al Edge Function
--    IMPORTANTE: el secreto debe coincidir con la variable PUSH_SECRET
--    configurada en la Edge Function `send-push`.
CREATE OR REPLACE FUNCTION public.send_push_notification(
  p_tenant_id UUID,
  p_recipient_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
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
BEGIN
  IF p_recipient_user_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.push_subscriptions
    WHERE user_id = p_recipient_user_id
      AND (tenant_id = p_tenant_id OR tenant_id IS NULL)
  ) THEN
    RETURN;
  END IF;

  v_payload := jsonb_build_object(
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

-- 5. Integrar el push en create_notification (único punto de creación)
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

  -- Disparar el push (asíncrono vía pg_net, no bloquea la transacción)
  PERFORM public.send_push_notification(p_tenant_id, p_recipient_user_id, p_title, p_body, v_data);

  RETURN v_id;
END;
$$;
