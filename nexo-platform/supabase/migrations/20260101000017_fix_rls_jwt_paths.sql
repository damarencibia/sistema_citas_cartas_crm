-- Fix all RLS policies: use auth.jwt() -> 'app_metadata' ->> instead of auth.jwt() ->>
-- In Supabase, raw_app_meta_data is nested under 'app_metadata' in the JWT, not at top level.

-- === TENANTS ===
DROP POLICY IF EXISTS super_admin_all ON tenants;
DROP POLICY IF EXISTS tenant_select_own ON tenants;

CREATE POLICY super_admin_all ON tenants
  FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role')::text = 'super_admin');

CREATE POLICY tenant_select_own ON tenants
  FOR SELECT USING (
    id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    OR (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'super_admin'
  );

-- === USERS ===
DROP POLICY IF EXISTS users_select_tenant ON users;

CREATE POLICY users_select_tenant ON users
  FOR SELECT USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    OR (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'super_admin'
  );

-- === SERVICES ===
DROP POLICY IF EXISTS services_tenant_isolation ON services;
DROP POLICY IF EXISTS services_public_read ON services;

CREATE POLICY services_tenant_isolation ON services
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY services_public_read ON services
  FOR SELECT TO anon
  USING (
    is_active = true
    AND deleted_at IS NULL
  );

-- === EMPLOYEES ===
DROP POLICY IF EXISTS employees_tenant_isolation ON employees;
DROP POLICY IF EXISTS employees_public_read ON employees;

CREATE POLICY employees_tenant_isolation ON employees
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY employees_public_read ON employees
  FOR SELECT TO anon
  USING (is_active = true AND deleted_at IS NULL);

-- === EMPLOYEE SERVICES ===
DROP POLICY IF EXISTS employee_services_tenant_isolation ON employee_services;
DROP POLICY IF EXISTS employee_services_public_read ON employee_services;

CREATE POLICY employee_services_tenant_isolation ON employee_services
  FOR ALL USING (
    employee_id IN (
      SELECT id FROM employees
      WHERE tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
      AND deleted_at IS NULL
    )
  );

CREATE POLICY employee_services_public_read ON employee_services
  FOR SELECT TO anon
  USING (true);

-- === SCHEDULES ===
DROP POLICY IF EXISTS schedules_tenant_isolation ON schedules;

CREATE POLICY schedules_tenant_isolation ON schedules
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- === SCHEDULE BREAKS ===
DROP POLICY IF EXISTS schedule_breaks_tenant_isolation ON schedule_breaks;

CREATE POLICY schedule_breaks_tenant_isolation ON schedule_breaks
  FOR ALL USING (
    schedule_id IN (
      SELECT id FROM schedules
      WHERE tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    )
  );

-- === HOLIDAY EXCEPTIONS ===
DROP POLICY IF EXISTS holiday_exceptions_tenant_isolation ON holiday_exceptions;

CREATE POLICY holiday_exceptions_tenant_isolation ON holiday_exceptions
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- === BOOKINGS ===
DROP POLICY IF EXISTS bookings_tenant_isolation ON bookings;
DROP POLICY IF EXISTS bookings_public_insert ON bookings;

CREATE POLICY bookings_tenant_isolation ON bookings
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY bookings_public_insert ON bookings
  FOR INSERT TO anon
  WITH CHECK (true);

-- === PRODUCTS ===
DROP POLICY IF EXISTS products_tenant_isolation ON products;
DROP POLICY IF EXISTS products_public_read ON products;

CREATE POLICY products_tenant_isolation ON products
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY products_public_read ON products
  FOR SELECT TO anon
  USING (
    is_available = true
    AND deleted_at IS NULL
  );

-- === ORDERS ===
DROP POLICY IF EXISTS orders_tenant_isolation ON orders;

CREATE POLICY orders_tenant_isolation ON orders
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- === CUSTOMERS ===
DROP POLICY IF EXISTS customers_tenant_isolation ON customers;

CREATE POLICY customers_tenant_isolation ON customers
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );
