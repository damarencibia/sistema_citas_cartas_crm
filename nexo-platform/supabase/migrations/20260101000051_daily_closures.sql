-- Migration 000051: Daily closures for end-of-day accounting
-- Stores a snapshot of the day totals when the worker closes their day.
-- It is NOT a hard lock: workers may reopen the day and edit records.

CREATE TABLE daily_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  total_bookings INTEGER NOT NULL DEFAULT 0,
  attended INTEGER NOT NULL DEFAULT 0,
  no_shows INTEGER NOT NULL DEFAULT 0,
  extras INTEGER NOT NULL DEFAULT 0,
  total_attended INTEGER NOT NULL DEFAULT 0,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reopened_at TIMESTAMPTZ,
  UNIQUE (tenant_id, employee_id, date)
);

CREATE INDEX idx_daily_closures_lookup ON daily_closures(tenant_id, employee_id, date);

ALTER TABLE daily_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_closures_tenant_isolation ON daily_closures
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );
