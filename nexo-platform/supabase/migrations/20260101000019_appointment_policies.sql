-- =====================================================
-- Migración 000019: Políticas de citas y manejo de no-shows
-- =====================================================

-- 1. Tabla de log de cambios de estado de bookings
CREATE TABLE booking_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  changed_by VARCHAR(20) NOT NULL CHECK (changed_by IN ('employee', 'system', 'customer')),
  changed_by_name VARCHAR(200),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_status_log_booking ON booking_status_log(booking_id);
CREATE INDEX idx_booking_status_log_tenant ON booking_status_log(tenant_id, created_at);

-- 2. Tabla de bloqueos de clientes
CREATE TABLE client_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_email VARCHAR(255) NOT NULL,
  blocked_until DATE NOT NULL,
  reason TEXT,
  no_show_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_blocks_tenant_email ON client_blocks(tenant_id, customer_email);
CREATE INDEX idx_client_blocks_until ON client_blocks(tenant_id, blocked_until);

-- 3. RLS para las nuevas tablas
ALTER TABLE booking_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY booking_status_log_tenant_isolation ON booking_status_log
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

CREATE POLICY client_blocks_tenant_isolation ON client_blocks
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- 4. Función para verificar si un cliente está bloqueado
CREATE OR REPLACE FUNCTION is_client_blocked(
  p_tenant_id UUID,
  p_customer_email VARCHAR
)
RETURNS TABLE (is_blocked BOOLEAN, blocked_until DATE, no_show_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    true AS is_blocked,
    cb.blocked_until,
    cb.no_show_count
  FROM client_blocks cb
  WHERE cb.tenant_id = p_tenant_id
    AND lower(cb.customer_email) = lower(p_customer_email)
    AND cb.blocked_until >= CURRENT_DATE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::DATE, 0;
  END IF;
END;
$$;

-- 5. Función para contar no-shows recientes de un cliente
CREATE OR REPLACE FUNCTION count_recent_no_shows(
  p_tenant_id UUID,
  p_customer_email VARCHAR,
  p_days INT DEFAULT 30
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*)::INT INTO v_count
  FROM bookings
  WHERE tenant_id = p_tenant_id
    AND lower(customer_email) = lower(p_customer_email)
    AND status = 'no_show'
    AND date >= CURRENT_DATE - p_days;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- 6. Actualizar config del tenant existente con defaults de políticas
UPDATE tenants
SET config = jsonb_set(
  COALESCE(config, '{}'::jsonb),
  '{appointments}',
  '{
    "auto_start": false,
    "no_show_policy": {
      "grace_period_minutes": 15,
      "max_no_shows": 2,
      "block_duration_days": 30
    }
  }'::jsonb
)
WHERE config IS NULL OR config -> 'appointments' IS NULL;
