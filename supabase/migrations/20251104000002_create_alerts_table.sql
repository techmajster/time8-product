-- =====================================================================================
-- SEAT MANAGEMENT - ALERTS TABLE
-- File: 20251104000002_create_alerts_table.sql
--
-- This migration creates the alerts table for tracking billing discrepancies and
-- system issues related to seat management and subscription synchronization.
--
-- Key Features:
-- - Store critical alerts for admin dashboard visibility
-- - Track resolution status and resolver
-- - Support multiple severity levels
-- - Metadata field for flexible alert details (JSONB)
-- - Performance index for fetching unresolved alerts
--
-- Related Spec: .agent-os/specs/2025-11-04-seat-management-grace-periods/
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- CREATE ALERTS TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Alert classification
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),

    -- Alert content
    message TEXT NOT NULL,

    -- Resolution tracking
    resolved BOOLEAN DEFAULT FALSE NOT NULL,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Flexible metadata for alert-specific details (e.g., subscription_id, organization_id, etc.)
    metadata JSONB
);

-- =====================================================================================
-- ADD PERFORMANCE INDEXES
-- =====================================================================================

-- Primary index for fetching unresolved alerts (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved
  ON alerts(created_at DESC)
  WHERE resolved = FALSE;

-- Index for filtering by severity
CREATE INDEX IF NOT EXISTS idx_alerts_severity
  ON alerts(severity, created_at DESC);

-- Index for filtering resolved alerts
CREATE INDEX IF NOT EXISTS idx_alerts_resolved
  ON alerts(resolved, created_at DESC);

-- GIN index for metadata queries (e.g., find alerts for specific subscription)
CREATE INDEX IF NOT EXISTS idx_alerts_metadata
  ON alerts USING GIN (metadata);

-- =====================================================================================
-- ADD UPDATED TIMESTAMP TRIGGER
-- =====================================================================================

-- Since we have resolved_at, we don't need an updated_at column
-- But add a trigger to automatically set resolved_at when resolved = TRUE

CREATE OR REPLACE FUNCTION set_alert_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
    -- When alert is marked as resolved, set resolved_at timestamp
    IF NEW.resolved = TRUE AND OLD.resolved = FALSE THEN
        NEW.resolved_at := NOW();
    END IF;

    -- If alert is unmarked as resolved, clear resolved_at
    IF NEW.resolved = FALSE AND OLD.resolved = TRUE THEN
        NEW.resolved_at := NULL;
        NEW.resolved_by := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (for reruns)
DROP TRIGGER IF EXISTS set_alert_resolved_at_trigger ON alerts;

-- Create trigger
CREATE TRIGGER set_alert_resolved_at_trigger
    BEFORE UPDATE OF resolved ON alerts
    FOR EACH ROW
    EXECUTE FUNCTION set_alert_resolved_at();

-- =====================================================================================
-- ADD COLUMN COMMENTS FOR DOCUMENTATION
-- =====================================================================================

COMMENT ON TABLE alerts IS
'System alerts for billing discrepancies and seat management issues. Used by reconciliation jobs and admin dashboard.';

COMMENT ON COLUMN alerts.severity IS
'Alert severity: info (informational), warning (needs attention), critical (requires immediate action)';

COMMENT ON COLUMN alerts.message IS
'Human-readable alert message describing the issue';

COMMENT ON COLUMN alerts.resolved IS
'Whether the alert has been resolved. Used for filtering in admin dashboard.';

COMMENT ON COLUMN alerts.resolved_at IS
'When the alert was marked as resolved. Automatically set by trigger.';

COMMENT ON COLUMN alerts.resolved_by IS
'Admin user who resolved the alert. NULL for system auto-resolution.';

COMMENT ON COLUMN alerts.metadata IS
'Flexible JSONB field for alert-specific details like subscription_id, organization_id, expected_value, actual_value, etc.';

-- =====================================================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================================================

-- Enable RLS
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Admins can view all alerts
CREATE POLICY "Admins can view all alerts"
  ON alerts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.user_id = auth.uid()
        AND user_organizations.role = 'admin'
        AND user_organizations.is_active = TRUE
    )
  );

-- Admins can resolve alerts
CREATE POLICY "Admins can resolve alerts"
  ON alerts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.user_id = auth.uid()
        AND user_organizations.role = 'admin'
        AND user_organizations.is_active = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.user_id = auth.uid()
        AND user_organizations.role = 'admin'
        AND user_organizations.is_active = TRUE
    )
  );

-- Service role can manage alerts (for automated systems)
CREATE POLICY "Service role can manage alerts"
  ON alerts
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================================================
-- SEED SOME EXAMPLE ALERT TYPES (COMMENTED OUT - FOR REFERENCE)
-- =====================================================================================

-- Example critical alert structure:
-- INSERT INTO alerts (severity, message, metadata) VALUES (
--   'critical',
--   'Subscription 123 out of sync! LS: 10, DB: 9',
--   '{"subscription_id": "sub_123", "organization_id": "org_456", "lemonsqueezy_quantity": 10, "database_quantity": 9}'::jsonb
-- );

-- Example warning alert structure:
-- INSERT INTO alerts (severity, message, metadata) VALUES (
--   'warning',
--   'Subscription renewal in 24h but not yet synced',
--   '{"subscription_id": "sub_123", "organization_id": "org_456", "renews_at": "2025-12-05T14:43:00Z"}'::jsonb
-- );

COMMIT;

-- =====================================================================================
-- VERIFICATION
-- =====================================================================================

-- Verify table exists with correct columns
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'alerts'
ORDER BY ordinal_position;

-- Verify indexes exist
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'alerts'
ORDER BY indexname;

-- Verify trigger exists
SELECT
    tgname AS trigger_name,
    proname AS function_name
FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgrelid = 'alerts'::regclass
    AND tgname = 'set_alert_resolved_at_trigger';

-- Verify RLS policies exist
SELECT
    polname AS policy_name,
    polcmd AS command,
    polpermissive AS permissive
FROM pg_policy
WHERE polrelid = 'alerts'::regclass
ORDER BY polname;

-- Verify severity check constraint
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
    AND rel.relname = 'alerts'
    AND con.conname LIKE '%severity%'
ORDER BY con.conname;
