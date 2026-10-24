-- Super admin can access everything
CREATE POLICY super_admin_all ON tenants
  FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role')::text = 'super_admin');

-- Tenant users can view their own tenant
CREATE POLICY tenant_select_own ON tenants
  FOR SELECT USING (
    id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    OR (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'super_admin'
  );

-- Users: can view own tenant users
CREATE POLICY users_select_tenant ON users
  FOR SELECT USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    OR (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'super_admin'
  );

-- Services: tenant isolation
CREATE POLICY services_tenant_isolation ON services
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

-- Services: public read for booking
CREATE POLICY services_public_read ON services
  FOR SELECT TO anon
  USING (
    is_active = true
    AND deleted_at IS NULL
  );

-- Employees: tenant isolation
CREATE POLICY employees_tenant_isolation ON employees
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

-- Employees: public read for booking page
CREATE POLICY employees_public_read ON employees
  FOR SELECT TO anon
  USING (is_active = true AND deleted_at IS NULL);

-- Employee services: tenant isolation
CREATE POLICY employee_services_tenant_isolation ON employee_services
  FOR ALL USING (
    employee_id IN (
      SELECT id FROM employees
      WHERE tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
      AND deleted_at IS NULL
    )
  );

-- Employee services: public read for booking page
CREATE POLICY employee_services_public_read ON employee_services
  FOR SELECT TO anon
  USING (true);

-- Schedules: tenant isolation
CREATE POLICY schedules_tenant_isolation ON schedules
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- Schedule breaks: tenant isolation via schedule join
CREATE POLICY schedule_breaks_tenant_isolation ON schedule_breaks
  FOR ALL USING (
    schedule_id IN (
      SELECT id FROM schedules
      WHERE tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    )
  );

-- Holiday exceptions: tenant isolation
CREATE POLICY holiday_exceptions_tenant_isolation ON holiday_exceptions
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- Bookings: tenant isolation
CREATE POLICY bookings_tenant_isolation ON bookings
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

-- Bookings: public insert
CREATE POLICY bookings_public_insert ON bookings
  FOR INSERT TO anon
  WITH CHECK (true);

-- Customers: tenant isolation
CREATE POLICY customers_tenant_isolation ON customers
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );
