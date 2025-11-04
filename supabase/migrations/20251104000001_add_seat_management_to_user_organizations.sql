-- =====================================================================================
-- SEAT MANAGEMENT - USER_ORGANIZATIONS TABLE EXTENSIONS
-- File: 20251104000001_add_seat_management_to_user_organizations.sql
--
-- This migration extends the user_organizations table to support user removal with
-- grace periods and archival. It adds a status enum and removal tracking.
--
-- Key Features:
-- - Add status enum to track user lifecycle (active, pending_removal, archived)
-- - Track removal effective date for grace period enforcement
-- - Performance indexes for seat counting and archival queries
-- - Maintain backward compatibility with existing is_active boolean
--
-- Related Spec: .agent-os/specs/2025-11-04-seat-based-subscription-grace-periods/
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- CREATE STATUS ENUM TYPE
-- =====================================================================================

-- Create enum type for user organization status
-- Note: Using DO block to handle case where enum already exists
DO $$
BEGIN
    -- Create the enum type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_organization_status') THEN
        CREATE TYPE user_organization_status AS ENUM (
            'active',           -- User has full access to organization
            'pending_removal',  -- User marked for removal, keeps access until removal_effective_date
            'archived'          -- User removed, no access, data preserved for historical purposes
        );
    END IF;

    -- Add enum values if they don't exist (for case where enum exists but values missing)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'user_organization_status'::regtype
        AND enumlabel = 'pending_removal'
    ) THEN
        ALTER TYPE user_organization_status ADD VALUE 'pending_removal';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'user_organization_status'::regtype
        AND enumlabel = 'archived'
    ) THEN
        ALTER TYPE user_organization_status ADD VALUE 'archived';
    END IF;
END $$;

-- =====================================================================================
-- ADD NEW COLUMNS TO USER_ORGANIZATIONS TABLE
-- =====================================================================================

-- Status: Granular lifecycle tracking for users
ALTER TABLE user_organizations
ADD COLUMN IF NOT EXISTS status user_organization_status NOT NULL DEFAULT 'active';

-- Removal effective date: When user will be archived (typically subscription renewal date)
ALTER TABLE user_organizations
ADD COLUMN IF NOT EXISTS removal_effective_date TIMESTAMPTZ;

-- =====================================================================================
-- DATA MIGRATION: SYNC STATUS WITH EXISTING IS_ACTIVE
-- =====================================================================================

-- Set status based on existing is_active boolean for backward compatibility
UPDATE user_organizations
SET status = CASE
    WHEN is_active = TRUE THEN 'active'::user_organization_status
    WHEN is_active = FALSE THEN 'archived'::user_organization_status
    ELSE 'active'::user_organization_status
END
WHERE status = 'active'; -- Only update rows that haven't been explicitly set

-- =====================================================================================
-- ADD PERFORMANCE INDEXES
-- =====================================================================================

-- Index for finding users pending removal (used by webhook handler at renewal)
CREATE INDEX IF NOT EXISTS idx_user_organizations_pending_removal
  ON user_organizations(organization_id, status, removal_effective_date)
  WHERE status = 'pending_removal';

-- Index for finding archived users (for reactivation and admin views)
CREATE INDEX IF NOT EXISTS idx_user_organizations_archived
  ON user_organizations(organization_id, status)
  WHERE status = 'archived';

-- Index for seat counting (active + pending_removal users count toward seat limits)
CREATE INDEX IF NOT EXISTS idx_user_organizations_active_and_pending
  ON user_organizations(organization_id, status)
  WHERE status IN ('active', 'pending_removal');

-- Index for finding users ready for archival (status check + date check)
CREATE INDEX IF NOT EXISTS idx_user_organizations_ready_for_archival
  ON user_organizations(organization_id, status, removal_effective_date)
  WHERE status = 'pending_removal';

-- =====================================================================================
-- ADD COLUMN COMMENTS FOR DOCUMENTATION
-- =====================================================================================

COMMENT ON COLUMN user_organizations.status IS
'Lifecycle status: active (full access), pending_removal (access until removal_effective_date), archived (no access, data preserved)';

COMMENT ON COLUMN user_organizations.removal_effective_date IS
'When the user will be archived. Typically set to subscription renewal date. User retains access until this date.';

COMMENT ON TYPE user_organization_status IS
'User lifecycle states for seat management: active (has access), pending_removal (grace period), archived (removed but data preserved)';

-- =====================================================================================
-- MAINTAIN BACKWARD COMPATIBILITY
-- =====================================================================================

-- Create a trigger to keep is_active in sync with status for any existing code
-- that still relies on the boolean field

CREATE OR REPLACE FUNCTION sync_user_organization_is_active()
RETURNS TRIGGER AS $$
BEGIN
    -- When status changes, update is_active accordingly
    NEW.is_active := (NEW.status IN ('active', 'pending_removal'));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (for reruns)
DROP TRIGGER IF EXISTS sync_user_organization_is_active_trigger ON user_organizations;

-- Create trigger
CREATE TRIGGER sync_user_organization_is_active_trigger
    BEFORE INSERT OR UPDATE OF status ON user_organizations
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_organization_is_active();

-- =====================================================================================
-- UPDATE RLS POLICIES TO RESPECT STATUS
-- =====================================================================================

-- Note: Existing RLS policies check is_active = true
-- Since we maintain is_active via trigger, no policy changes needed
-- But for explicit status-based policies in the future:

-- Example (commented out, as existing policies work via is_active):
-- CREATE POLICY "Users can view active and pending org memberships"
--   ON user_organizations FOR SELECT
--   USING (
--     user_id = auth.uid()
--     AND status IN ('active', 'pending_removal')
--   );

COMMIT;

-- =====================================================================================
-- VERIFICATION
-- =====================================================================================

-- Verify new columns exist
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'user_organizations'
    AND column_name IN ('status', 'removal_effective_date')
ORDER BY column_name;

-- Verify enum type and values
SELECT
    t.typname AS enum_name,
    e.enumlabel AS enum_value,
    e.enumsortorder AS sort_order
FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
    AND t.typname = 'user_organization_status'
ORDER BY e.enumsortorder;

-- Verify indexes exist
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'user_organizations'
    AND indexname IN (
        'idx_user_organizations_pending_removal',
        'idx_user_organizations_archived',
        'idx_user_organizations_active_and_pending',
        'idx_user_organizations_ready_for_archival'
    )
ORDER BY indexname;

-- Verify trigger exists
SELECT
    tgname AS trigger_name,
    proname AS function_name
FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgrelid = 'user_organizations'::regclass
    AND tgname = 'sync_user_organization_is_active_trigger';

-- Show sample data distribution by status
SELECT
    status,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE is_active = TRUE) as is_active_true_count
FROM user_organizations
GROUP BY status
ORDER BY status;
