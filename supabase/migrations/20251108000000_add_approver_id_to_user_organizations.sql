-- Migration: Add approver_id column to user_organizations table
-- Date: 2025-11-08
-- Purpose: Enable per-user leave approver assignment independent of team structure
-- Related Spec: .agent-os/specs/2025-11-08-team-management-interface-redesign/

-- Add the approver_id column as nullable (users can have no assigned approver)
ALTER TABLE user_organizations
ADD COLUMN approver_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index for performance on approver lookups
CREATE INDEX idx_user_organizations_approver_id
ON user_organizations(approver_id)
WHERE approver_id IS NOT NULL;

-- Add index for common query pattern (organization + approver)
CREATE INDEX idx_user_organizations_org_approver
ON user_organizations(organization_id, approver_id)
WHERE approver_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_organizations.approver_id IS
'User ID of the manager/admin who approves leave requests for this employee. If NULL, approval routing uses team-based logic.';
