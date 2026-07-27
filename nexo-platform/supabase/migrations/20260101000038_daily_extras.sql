-- Migration 000038: Daily extras table for end-of-day reconciliation
-- Workers can record additional clients served beyond scheduled appointments

CREATE TABLE daily_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  customer_name VARCHAR(150) NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_daily_extras_lookup ON daily_extras(tenant_id, employee_id, date);

ALTER TABLE daily_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_extras_tenant_isolation ON daily_extras
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );
