-- =============================================================
-- Migration 000031: Recurring Bookings
-- =============================================================
-- 1. recurring_booking_patterns table
-- 2. recurring_booking_instances table
-- 3. RPC: generate_recurring_instances
-- =============================================================

-- 1. recurring_booking_patterns table
CREATE TABLE recurring_booking_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_name VARCHAR(150),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(30),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  -- Recurrence pattern
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly','biweekly','monthly')),
  day_of_week INT CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_of_month INT CHECK (day_of_month >= 1 AND day_of_month <= 31),
  preferred_time TIME NOT NULL,

  -- Validity period
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_occurrences INT,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','completed','cancelled')),

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (end_date >= start_date)
);

CREATE INDEX idx_recurring_patterns_tenant ON recurring_booking_patterns(tenant_id, status);

ALTER TABLE recurring_booking_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY recurring_patterns_tenant_isolation ON recurring_booking_patterns
  FOR ALL USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- 2. recurring_booking_instances table
CREATE TABLE recurring_booking_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL REFERENCES recurring_booking_patterns(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','booked','skipped','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_instances_pattern ON recurring_booking_instances(pattern_id, status);
CREATE INDEX idx_recurring_instances_date ON recurring_booking_instances(scheduled_date, status);

ALTER TABLE recurring_booking_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY recurring_instances_tenant_isolation ON recurring_booking_instances
  FOR ALL USING (
    pattern_id IN (
      SELECT id FROM recurring_booking_patterns
      WHERE tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    )
  );

-- 3. RPC: generate_recurring_instances
-- Generates future instances from a pattern up to end_date or total_occurrences
CREATE OR REPLACE FUNCTION generate_recurring_instances(
  p_pattern_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pattern RECORD;
  v_current_date DATE;
  v_count INT := 0;
  v_target_dow INT;
  v_target_dom INT;
BEGIN
  SELECT * INTO v_pattern
  FROM recurring_booking_patterns
  WHERE id = p_pattern_id;

  IF NOT FOUND OR v_pattern.status != 'active' THEN
    RETURN 0;
  END IF;

  v_current_date := GREATEST(v_pattern.start_date, CURRENT_DATE + 1);

  WHILE v_current_date <= v_pattern.end_date LOOP
    -- Check if instance already exists
    IF EXISTS (
      SELECT 1 FROM recurring_booking_instances
      WHERE pattern_id = p_pattern_id AND scheduled_date = v_current_date
    ) THEN
      -- Move to next occurrence
      IF v_pattern.frequency = 'weekly' THEN
        v_current_date := v_current_date + 7;
      ELSIF v_pattern.frequency = 'biweekly' THEN
        v_current_date := v_current_date + 14;
      ELSIF v_pattern.frequency = 'monthly' THEN
        v_current_date := v_current_date + INTERVAL '1 month';
      END IF;
      CONTINUE;
    END IF;

    -- Check if this date matches the pattern
    IF v_pattern.frequency IN ('weekly', 'biweekly') AND v_pattern.day_of_week IS NOT NULL THEN
      IF EXTRACT(DOW FROM v_current_date)::INT != v_pattern.day_of_week THEN
        -- Skip to next matching day of week
        v_current_date := v_current_date + 1;
        CONTINUE;
      END IF;
    ELSIF v_pattern.frequency = 'monthly' AND v_pattern.day_of_month IS NOT NULL THEN
      IF EXTRACT(DAY FROM v_current_date)::INT != v_pattern.day_of_month THEN
        v_current_date := v_current_date + 1;
        CONTINUE;
      END IF;
    END IF;

    -- Create instance
    INSERT INTO recurring_booking_instances (pattern_id, scheduled_date, status)
    VALUES (p_pattern_id, v_current_date, 'scheduled');
    v_count := v_count + 1;

    -- Check total occurrences limit
    IF v_pattern.total_occurrences IS NOT NULL AND v_count >= v_pattern.total_occurrences THEN
      EXIT;
    END IF;

    -- Move to next occurrence
    IF v_pattern.frequency = 'weekly' THEN
      v_current_date := v_current_date + 7;
    ELSIF v_pattern.frequency = 'biweekly' THEN
      v_current_date := v_current_date + 14;
    ELSIF v_pattern.frequency = 'monthly' THEN
      v_current_date := v_current_date + INTERVAL '1 month';
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;
