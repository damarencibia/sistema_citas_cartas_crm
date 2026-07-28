CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'mdi-tag-outline',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_service_categories_tenant ON service_categories(tenant_id);
CREATE INDEX idx_service_categories_active ON service_categories(tenant_id, is_active) WHERE deleted_at IS NULL;

ALTER TABLE services
  ADD COLUMN category_id UUID REFERENCES service_categories(id),
  ADD COLUMN employee_id UUID REFERENCES employees(id),
  DROP COLUMN IF EXISTS category;

CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_employee ON services(employee_id);
