-- =============================================================
-- Migration 000027: Approval Workflow
-- =============================================================
-- 1. Expand bookings status CHECK to include 'pending_approval'
-- 2. booking_approvals table for audit trail
-- =============================================================

-- 1. Expand status CHECK constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'confirmed','in_progress','completed','no_show','cancelled','pending_approval'
  ));

-- 2. booking_approvals table
CREATE TABLE booking_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('approved','rejected')),
  approved_by UUID REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_approvals_tenant ON booking_approvals(tenant_id, created_at);
CREATE INDEX idx_booking_approvals_booking ON booking_approvals(booking_id);

ALTER TABLE booking_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY booking_approvals_tenant_isolation ON booking_approvals
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

CREATE POLICY booking_approvals_insert_auth ON booking_approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );
