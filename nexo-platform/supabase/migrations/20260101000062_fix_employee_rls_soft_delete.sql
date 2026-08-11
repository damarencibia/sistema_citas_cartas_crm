-- Fix RLS on employees to allow soft-delete (setting deleted_at)
-- The previous FOR ALL USING policy blocked UPDATE because
-- USING also validates the new row, where deleted_at is no longer null.

DROP POLICY IF EXISTS employees_tenant_isolation ON employees;

-- SELECT: only non-deleted rows
CREATE POLICY employees_select ON employees
  FOR SELECT USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

-- INSERT: any row for the tenant
CREATE POLICY employees_insert ON employees
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- UPDATE: allow setting deleted_at (soft delete)
-- USING checks the existing row (must be non-deleted)
-- WITH CHECK validates the new row (tenant_id only, allows deleted_at to be set)
CREATE POLICY employees_update ON employees
  FOR UPDATE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  )
  WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- DELETE: only non-deleted rows
CREATE POLICY employees_delete ON employees
  FOR DELETE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );
