-- Fix RLS on services to allow soft-delete (setting deleted_at)
--
-- Root cause: PostgreSQL requires the NEW row produced by an UPDATE to remain
-- "visible" under the SELECT policies. The previous policies filtered
-- deleted_at IS NULL in SELECT/USING, so setting deleted_at made the row
-- invisible and the UPDATE was rejected with
-- "new row violates row-level security policy" (403).
--
-- Fix (mirrors the employees fix, corrected):
--   * services_select enforces tenant isolation only. Soft-deleted rows remain
--     selectable to the API, but the app always queries deleted_at IS NULL.
--   * services_update can only modify non-deleted rows (USING) and may set
--     deleted_at (WITH CHECK checks tenant only).

DROP POLICY IF EXISTS services_tenant_isolation ON services;
DROP POLICY IF EXISTS services_select ON services;
DROP POLICY IF EXISTS services_insert ON services;
DROP POLICY IF EXISTS services_update ON services;
DROP POLICY IF EXISTS services_delete ON services;

-- SELECT: tenant isolation only (allows the soft-delete UPDATE to produce a visible row)
CREATE POLICY services_select ON services
  FOR SELECT USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- INSERT: any row for the tenant
CREATE POLICY services_insert ON services
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- UPDATE: only non-deleted rows can be updated; setting deleted_at (soft delete) allowed
CREATE POLICY services_update ON services
  FOR UPDATE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  )
  WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- DELETE: only non-deleted rows
CREATE POLICY services_delete ON services
  FOR DELETE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );
