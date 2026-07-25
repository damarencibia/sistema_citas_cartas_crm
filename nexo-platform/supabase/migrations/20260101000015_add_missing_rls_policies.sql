-- employee_services: tenant isolation via employee FK
CREATE POLICY employee_services_tenant_isolation ON employee_services
  FOR ALL USING (
    employee_id IN (
      SELECT id FROM employees
      WHERE tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
      AND deleted_at IS NULL
    )
  );

-- employee_services: public read for booking page
CREATE POLICY employee_services_public_read ON employee_services
  FOR SELECT TO anon
  USING (true);

-- schedules: tenant isolation
CREATE POLICY schedules_tenant_isolation ON schedules
  FOR ALL USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- schedule_breaks: tenant isolation via schedule join
CREATE POLICY schedule_breaks_tenant_isolation ON schedule_breaks
  FOR ALL USING (
    schedule_id IN (
      SELECT id FROM schedules
      WHERE tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- holiday_exceptions: tenant isolation
CREATE POLICY holiday_exceptions_tenant_isolation ON holiday_exceptions
  FOR ALL USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- employees: public read for booking page (active only)
CREATE POLICY employees_public_read ON employees
  FOR SELECT TO anon
  USING (is_active = true AND deleted_at IS NULL);
