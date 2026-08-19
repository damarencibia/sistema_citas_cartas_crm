-- =============================================================
-- Migration 000084: Limpieza proactiva de suscripciones push obsoletas
-- -------------------------------------------------------------
-- Elimina suscripciones push con más de 90 días de antigüedad.
-- Ejecución semanal (domingos 3:00 AM).
-- =============================================================

-- Función de limpieza
CREATE OR REPLACE FUNCTION public.cleanup_stale_push_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM public.push_subscriptions
  WHERE created_at < now() - INTERVAL '90 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Cron semanal: domingos a las 3:00 AM
SELECT cron.schedule(
  'cleanup-stale-push-subscriptions',
  '0 3 * * 0',
  $$SELECT cleanup_stale_push_subscriptions()$$
);
