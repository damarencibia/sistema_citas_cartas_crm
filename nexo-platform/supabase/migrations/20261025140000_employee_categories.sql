-- =============================================================
-- Migration 000088: Empleados ↔ Categorías (nuevo modelo)
-- -------------------------------------------------------------
-- Decisión (25/10/2026):
--  * El ADMIN vincula empleados a CATEGORÍAS (tabla nueva
--    employee_categories); ya no a servicios individuales.
--  * El EMPLEADO elige qué servicios ofrece (tabla employee_services,
--    ahora gestionada desde "Mis Servicios"): los elige de sus
--    categorías y puede crear servicios propios dentro de ellas.
--  * employee_services pasa a ser la ÚNICA fuente de disponibilidad
--    de reservas: se elimina la columna legacy services.employee_id
--    y accept_waitlist_offer resuelve el empleado por el join.
-- =============================================================

CREATE TABLE employee_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(employee_id, category_id)
);

CREATE INDEX idx_employee_categories_tenant ON employee_categories(tenant_id);
CREATE INDEX idx_employee_categories_employee ON employee_categories(employee_id);
CREATE INDEX idx_employee_categories_category ON employee_categories(category_id);

ALTER TABLE employee_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_categories_tenant_isolation ON employee_categories
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

-- ------------------------------------------------------------
-- Backfill: los vínculos existentes (join table y columna legacy)
-- derivan su categoría al nuevo modelo antes de retirar la columna.
-- ------------------------------------------------------------
INSERT INTO employee_categories (tenant_id, employee_id, category_id)
SELECT DISTINCT e.tenant_id, es.employee_id, s.category_id
FROM employee_services es
JOIN employees e ON e.id = es.employee_id
JOIN services s ON s.id = es.service_id
WHERE s.category_id IS NOT NULL
ON CONFLICT (employee_id, category_id) DO NOTHING;

INSERT INTO employee_categories (tenant_id, employee_id, category_id)
SELECT DISTINCT s.tenant_id, s.employee_id, s.category_id
FROM services s
WHERE s.employee_id IS NOT NULL AND s.category_id IS NOT NULL
ON CONFLICT (employee_id, category_id) DO NOTHING;

-- Y a la inversa: los servicios "asignados" por la columna legacy
-- quedan en employee_services (disponibilidad no se pierde).
INSERT INTO employee_services (employee_id, service_id)
SELECT s.employee_id, s.id
FROM services s
WHERE s.employee_id IS NOT NULL
ON CONFLICT (employee_id, service_id) DO NOTHING;

-- ------------------------------------------------------------
-- Modelo dual fuera: services.employee_id ya no existe
-- ------------------------------------------------------------
DROP INDEX IF EXISTS idx_services_employee;
ALTER TABLE services DROP COLUMN IF EXISTS employee_id;

-- ------------------------------------------------------------
-- accept_waitlist_offer: resolver empleado por employee_services
-- (ya no por services.employee_id)
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS accept_waitlist_offer(VARCHAR(64));

CREATE OR REPLACE FUNCTION accept_waitlist_offer(
  p_token VARCHAR(64)
)
RETURNS TABLE (
  booking_id UUID,
  error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry RECORD;
  v_booking_id UUID;
  v_duration INT;
  v_end_time TIME;
  v_initial_status TEXT;
  v_requires_approval BOOLEAN;
BEGIN
  SELECT w.* INTO v_entry
  FROM waitlist w
  WHERE w.offer_token = p_token
    AND w.status = 'notified'
    AND w.offer_expires_at > now();

  IF NOT FOUND THEN
    error := 'Oferta no encontrada, expirada o ya canjeada';
    booking_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE waitlist SET status = 'converted', updated_at = now()
  WHERE id = v_entry.id;

  SELECT s.duration_minutes, s.requires_approval
  INTO v_duration, v_requires_approval
  FROM services s WHERE s.id = v_entry.service_id;

  v_end_time := v_entry.offered_slot_time + (v_duration || ' minutes')::INTERVAL;
  v_initial_status := CASE WHEN v_requires_approval THEN 'pending_approval' ELSE 'confirmed' END;

  IF v_entry.employee_id IS NULL THEN
    -- Resuelve cualquier empleado activo que realice el servicio
    SELECT es.employee_id INTO v_entry.employee_id
    FROM employee_services es
    JOIN employees e ON e.id = es.employee_id
      AND e.is_active = true
      AND e.deleted_at IS NULL
    WHERE es.service_id = v_entry.service_id
    LIMIT 1;
  END IF;

  INSERT INTO bookings (
    tenant_id, service_id, employee_id,
    date, start_time, end_time,
    customer_name, customer_email, customer_phone,
    source, status, participant_count
  ) VALUES (
    v_entry.tenant_id, v_entry.service_id, v_entry.employee_id,
    v_entry.preferred_date, v_entry.offered_slot_time, v_end_time,
    v_entry.customer_name, v_entry.customer_email, v_entry.customer_phone,
    'online', v_initial_status, 1
  )
  RETURNING id INTO v_booking_id;

  booking_id := v_booking_id;
  error := NULL;
  RETURN NEXT;
END;
$$;
