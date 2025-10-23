-- =====================================================================================
-- CALENDAR VISIBILITY SETTINGS - GROUP-BASED RESTRICTION
-- File: 20251022000001_add_restrict_calendar_by_group.sql
--
-- This migration adds a setting to control whether calendar visibility is restricted
-- by group membership. When enabled, users can only see calendars of people in their
-- group. When disabled (default), all users in the organization can see each other.
--
-- Key Features:
-- - Admin-controlled toggle for calendar visibility
-- - Default: false (everyone sees everyone)
-- - When true: group members only see their group, non-group members see everyone
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- ADD CALENDAR VISIBILITY COLUMN TO ORGANIZATIONS TABLE
-- =====================================================================================

ALTER TABLE organizations
    ADD COLUMN restrict_calendar_by_group BOOLEAN DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN organizations.restrict_calendar_by_group IS
'When true, users in groups can only see calendars of their group members. Users without groups see everyone. When false (default), all users see all calendars.';

-- =====================================================================================
-- INDEX FOR PERFORMANCE
-- =====================================================================================

CREATE INDEX idx_organizations_restrict_calendar
    ON organizations(restrict_calendar_by_group)
    WHERE restrict_calendar_by_group = true;

COMMIT;

-- Verify column was added successfully
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'restrict_calendar_by_group';
