-- =============================================================
-- Migration 000055: TTL de 24 horas para notificaciones
-- Elimina notificaciones con más de 24h para no saturar el
-- almacenamiento de la base de datos.
-- =============================================================

-- 1. Índice para que el borrado por created_at sea eficiente
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- 2. Función de limpieza (SECURITY DEFINER: el owner no está sujeto a RLS,
--    por lo que no se necesita una política DELETE)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM notifications
  WHERE created_at < now() - interval '24 hours';
END;
$$;

-- 3. Job de pg_cron (cada hora)
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 * * * *',
  $$SELECT cleanup_old_notifications()$$
);

-- 4. Limpieza inmediata de notificaciones existentes > 24h
DELETE FROM notifications
WHERE created_at < now() - interval '24 hours';
