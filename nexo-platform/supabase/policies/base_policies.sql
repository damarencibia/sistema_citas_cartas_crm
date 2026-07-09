-- Super admin can access everything
CREATE POLICY super_admin_all ON tenants
  FOR ALL USING ((auth.jwt() ->> 'role')::text = 'super_admin');

-- Tenant users can view their own tenant
CREATE POLICY tenant_select_own ON tenants
  FOR SELECT USING (
    id = (auth.jwt() ->> 'tenant_id')::uuid
    OR (auth.jwt() ->> 'role')::text = 'super_admin'
  );

-- Users: can view own tenant users
CREATE POLICY users_select_tenant ON users
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    OR (auth.jwt() ->> 'role')::text = 'super_admin'
  );

-- Services: tenant isolation
CREATE POLICY services_tenant_isolation ON services
  FOR ALL USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

-- Services: public read for booking
CREATE POLICY services_public_read ON services
  FOR SELECT TO anon
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND is_active = true
    AND deleted_at IS NULL
  );

-- Employees: tenant isolation
CREATE POLICY employees_tenant_isolation ON employees
  FOR ALL USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

-- Bookings: tenant isolation
CREATE POLICY bookings_tenant_isolation ON bookings
  FOR ALL USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

-- Bookings: public insert
CREATE POLICY bookings_public_insert ON bookings
  FOR INSERT TO anon
  WITH CHECK (true);

-- Products: public read
CREATE POLICY products_public_read ON products
  FOR SELECT TO anon
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND is_available = true
    AND deleted_at IS NULL
  );

-- Products: tenant isolation
CREATE POLICY products_tenant_isolation ON products
  FOR ALL USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

-- Orders: tenant isolation
CREATE POLICY orders_tenant_isolation ON orders
  FOR ALL USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Customers: tenant isolation
CREATE POLICY customers_tenant_isolation ON customers
  FOR ALL USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );
