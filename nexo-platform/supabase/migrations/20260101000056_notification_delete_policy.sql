-- =============================================================
-- Migration 000056: Política RLS de borrado para notificaciones
-- Permite al usuario eliminar sus propias notificaciones desde
-- el cliente (swipe-to-delete).
-- =============================================================

CREATE POLICY notifications_delete ON notifications
  FOR DELETE USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND recipient_user_id IN (
      SELECT id FROM users
      WHERE supabase_user_id = auth.uid()
        AND deleted_at IS NULL
    )
  );
