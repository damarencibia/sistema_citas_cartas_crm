-- =============================================================
-- Migration 000064: UPDATE policy on tenants for tenant members
-- Without this, authenticated tenant members could not persist
-- business settings (PostgREST silently matches 0 rows).
-- =============================================================

CREATE POLICY "tenant_update_own" ON public.tenants
  FOR UPDATE TO authenticated
  USING ((id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text)::uuid))
  WITH CHECK ((id = ((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text)::uuid));
