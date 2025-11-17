-- =====================================================================================
-- Migration: Add explicit workspace owner flag
-- Purpose : Track a single owner per organization and support ownership transfer
-- =====================================================================================

-- 1. Add is_owner flag to user_organizations (default false)
ALTER TABLE user_organizations
ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN user_organizations.is_owner IS 'Indicates the workspace owner (exactly one per organization)';

-- 2. Backfill owner flag based on original creators (joined_via = ''created'')
WITH ranked_creators AS (
  SELECT
    user_id,
    organization_id,
    ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY joined_at ASC) AS rn
  FROM user_organizations
  WHERE joined_via = 'created'
)
UPDATE user_organizations uo
SET is_owner = true
FROM ranked_creators rc
WHERE uo.user_id = rc.user_id
  AND uo.organization_id = rc.organization_id
  AND rc.rn = 1;

-- 3. Ensure at most one owner per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_organizations_owner_per_org
ON user_organizations(organization_id)
WHERE is_owner = true;

