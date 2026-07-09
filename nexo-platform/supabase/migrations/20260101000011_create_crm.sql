CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  supabase_user_id UUID,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  notes TEXT,
  total_visits INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_customers_tenant_email ON customers(tenant_id, email) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_created_at ON customers(tenant_id, created_at DESC);
CREATE INDEX idx_customers_total_visits ON customers(tenant_id, total_visits DESC);

CREATE TABLE customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  author_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_notes_customer ON customer_notes(customer_id);
CREATE INDEX idx_customer_notes_tenant ON customer_notes(tenant_id);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) DEFAULT '#1976D2',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_tags_tenant ON tags(tenant_id);

CREATE TABLE customer_tags (
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, tag_id)
);

CREATE TABLE loyalty_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,
  points_per_visit INTEGER NOT NULL DEFAULT 10,
  points_per_currency INTEGER NOT NULL DEFAULT 1,
  currency_unit INTEGER NOT NULL DEFAULT 10000,
  points_to_currency INTEGER NOT NULL DEFAULT 100,
  redemption_unit INTEGER NOT NULL DEFAULT 5000,
  welcome_points INTEGER NOT NULL DEFAULT 50,
  expiry_months INTEGER NOT NULL DEFAULT 6,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  points INTEGER NOT NULL,
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('visit', 'purchase', 'welcome', 'redeem', 'expired', 'adjustment')),
  reference_type VARCHAR(20),
  reference_id UUID,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loyalty_points_customer ON loyalty_points(customer_id);
CREATE INDEX idx_loyalty_points_tenant ON loyalty_points(tenant_id);
CREATE INDEX idx_loyalty_points_expires ON loyalty_points(expires_at) WHERE points > 0;
