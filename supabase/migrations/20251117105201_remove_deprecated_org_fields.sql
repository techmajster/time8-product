-- Remove deprecated organization fields
-- This migration removes UI-only fields that are no longer used in admin settings
-- Part of: Admin Settings Figma Redesign spec

BEGIN;

-- Drop deprecated columns that are no longer used in the admin settings UI
-- These fields are being removed as part of the 8-tab to 4-tab consolidation

-- Remove organization slug (no longer used for URLs or identification)
ALTER TABLE organizations DROP COLUMN IF EXISTS slug;

-- Remove Google Workspace integration fields (moved to different implementation)
ALTER TABLE organizations DROP COLUMN IF EXISTS google_domain;
ALTER TABLE organizations DROP COLUMN IF EXISTS require_google_domain;

-- Remove logo URL (logo upload functionality removed from admin settings)
ALTER TABLE organizations DROP COLUMN IF EXISTS logo_url;

-- Note: shift_start_time and shift_end_time columns already exist and will be used
-- for the work hours functionality in phase 2, so we don't need to create new columns

COMMIT;
