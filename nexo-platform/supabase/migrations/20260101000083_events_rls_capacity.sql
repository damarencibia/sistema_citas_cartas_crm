-- Migration 000083: RLS + capacity trigger for events
-- 1. Enable RLS on events and event_registrations
-- 2. Tenant isolation policies (admin)
-- 3. Public read on active events, public insert on registrations
-- 4. Trigger to auto-downgrade to waitlisted when capacity is full

-- ============================================================
-- 1. Enable RLS
-- ============================================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Admin policies (tenant isolation via JWT)
-- ============================================================
CREATE POLICY events_tenant_isolation ON events
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY event_registrations_tenant_isolation ON event_registrations
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

-- ============================================================
-- 3. Public policies (anon)
-- ============================================================
CREATE POLICY events_public_read ON events
  FOR SELECT TO anon
  USING (
    is_active = true
    AND deleted_at IS NULL
  );

CREATE POLICY event_registrations_public_insert ON event_registrations
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY event_registrations_public_select ON event_registrations
  FOR SELECT TO anon
  USING (
    access_token IS NOT NULL
    AND deleted_at IS NULL
  );

-- ============================================================
-- 4. Capacity trigger: auto-downgrade to waitlisted if full
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_event_overbooking_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_max INTEGER;
  v_current INTEGER;
BEGIN
  -- Only enforce on confirmed inserts/updates
  IF NEW.status != 'confirmed' OR NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT max_participants INTO v_max
  FROM events WHERE id = NEW.event_id;

  IF v_max IS NULL THEN
    RETURN NEW; -- unlimited capacity
  END IF;

  SELECT COALESCE(SUM(participant_count), 0) INTO v_current
  FROM event_registrations
  WHERE event_id = NEW.event_id
    AND status = 'confirmed'
    AND deleted_at IS NULL
    AND id != NEW.id;

  IF v_current + NEW.participant_count > v_max THEN
    NEW.status := 'waitlisted';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_event_overbooking
  BEFORE INSERT OR UPDATE ON event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_event_overbooking_v2();

-- ============================================================
-- 5. Allow anon/exec to insert registrations (bypass RLS for public portal)
-- ============================================================
GRANT INSERT ON event_registrations TO anon;
GRANT SELECT ON events TO anon;