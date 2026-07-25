-- 000032: Walk-in queue support
-- Expand source CHECK to include 'walk_in'
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_source_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_source_check
  CHECK (source IN ('online','manual','phone','walk_in'));

-- Walk-in queue table
CREATE TABLE IF NOT EXISTS walkin_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_name VARCHAR(150) NOT NULL,
  customer_phone VARCHAR(30),
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  position INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','serving','completed','cancelled','no_show')),
  estimated_wait_minutes INT,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_serving_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_walkin_queue_tenant_status ON walkin_queue(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_walkin_queue_position ON walkin_queue(tenant_id, position) WHERE status = 'waiting';

-- RLS
ALTER TABLE walkin_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY walkin_queue_tenant_isolation ON walkin_queue
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

CREATE POLICY walkin_queue_authenticated_insert ON walkin_queue
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE walkin_queue;
