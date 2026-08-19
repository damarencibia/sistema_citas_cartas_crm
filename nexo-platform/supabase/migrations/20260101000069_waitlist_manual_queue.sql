-- =============================================================
-- Migration 000064: Waitlist como cola manual (sin automatización)
-- -------------------------------------------------------------
-- 1. Se desactiva el cron de expiración de ofertas: el empleado
--    gestiona la cola manualmente y ya no se generan ofertas/tokens.
-- 2. Se elimina waitlist_public_read: el rol anon ya no puede leer
--    la cola de espera de todos los tenants directamente (las
--    consultas públicas se hacen vía RPC SECURITY DEFINER).
-- 3. get_waitlist_count apuntaba a expires_at (renombrada a
--    entry_expires_at en la migración 000039) → quedó rota.
-- 4. mark_waitlist_converted: marca una entrada como convertida
--    cuando el empleado la pasa a la agenda.
-- =============================================================

-- 1. Desactivar cron de expiración de ofertas
DO $$
DECLARE
  v_jobid BIGINT;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'expire-waitlist-offers';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END;
$$;

-- 2. El rol anon ya no puede leer la waitlist directamente
DROP POLICY IF EXISTS waitlist_public_read ON waitlist;

-- 3. Arreglar get_waitlist_count (columna correcta + multi-turno)
DROP FUNCTION IF EXISTS get_waitlist_count(UUID, UUID, UUID, DATE);

CREATE OR REPLACE FUNCTION public.get_waitlist_count(
  p_tenant_id UUID,
  p_service_id UUID,
  p_employee_id UUID,
  p_date DATE
)
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM waitlist w
  WHERE w.tenant_id = p_tenant_id
    AND w.service_id = p_service_id
    AND (w.employee_id = p_employee_id OR w.employee_id IS NULL)
    AND w.preferred_date = p_date
    AND w.status = 'waiting'
    AND w.entry_expires_at > now();
$$;

-- 4. Marcar una entrada como convertida (empleado → agenda)
CREATE OR REPLACE FUNCTION public.mark_waitlist_converted(p_waitlist_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE waitlist
  SET status = 'converted', updated_at = now()
  WHERE id = p_waitlist_id
    AND tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
END;
$$;
