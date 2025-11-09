# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-11-08-team-management-interface-redesign/spec.md

## Overview

This spec requires adding a new `approver_id` field to the `user_organizations` table to support per-user leave approver assignment independent of team structure.

## Schema Changes

### 1. Add `approver_id` Column to `user_organizations` Table

**Migration SQL:**

```sql
-- Migration: Add approver_id column to user_organizations table
-- File: supabase/migrations/YYYYMMDDHHMMSS_add_approver_id_to_user_organizations.sql

-- Add the column as nullable (users can have no assigned approver)
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
```

### 2. Column Specifications

**Column:** `approver_id`
- **Type:** UUID
- **Nullable:** YES (users can have no specific approver assigned)
- **Foreign Key:** References `profiles(id)`
- **On Delete:** SET NULL (if approver account is deleted, employee loses assigned approver but remains active)
- **Default:** NULL

### 3. Validation Rules

**Application-Level Validation:**
- If `approver_id` is provided, the referenced user must:
  1. Exist in `profiles` table
  2. Have `role` of 'manager' or 'admin' in the same organization
  3. Be an active member (`is_active = true`) in the organization

**Database-Level Constraints:**
- Foreign key ensures referenced user exists
- No self-reference constraint needed (users generally shouldn't approve their own leave, but this is handled at business logic level)

### 4. Impact on Existing Data

**Current Data:**
- All existing `user_organizations` rows will have `approver_id = NULL` after migration
- This is acceptable behavior - NULL means "use default approval routing"

**No Data Migration Required:**
- Teams can continue using existing approval flows
- Admins can gradually assign approvers as needed
- NULL approver_id falls back to team manager or organization admin

### 5. Query Examples

**Fetch employee with approver details:**
```sql
SELECT
  uo.user_id,
  uo.role,
  uo.team_id,
  uo.approver_id,
  p_user.full_name as employee_name,
  p_approver.full_name as approver_name,
  p_approver.email as approver_email
FROM user_organizations uo
LEFT JOIN profiles p_user ON uo.user_id = p_user.id
LEFT JOIN profiles p_approver ON uo.approver_id = p_approver.id
WHERE uo.organization_id = $1
  AND uo.user_id = $2
  AND uo.is_active = true;
```

**Get all employees managed by a specific approver:**
```sql
SELECT
  uo.user_id,
  p.full_name,
  p.email,
  uo.role,
  t.name as team_name
FROM user_organizations uo
LEFT JOIN profiles p ON uo.user_id = p.id
LEFT JOIN teams t ON uo.team_id = t.id
WHERE uo.organization_id = $1
  AND uo.approver_id = $2
  AND uo.is_active = true
ORDER BY p.full_name;
```

**Update approver for an employee:**
```sql
UPDATE user_organizations
SET approver_id = $1
WHERE organization_id = $2
  AND user_id = $3
  AND is_active = true;
```

### 6. RLS (Row Level Security) Considerations

**Existing RLS Policies:**
- Current `user_organizations` RLS policies should continue to work
- No new policies needed specifically for `approver_id` column

**Policy Review:**
- Ensure policies allow SELECT on `approver_id` for admins and managers
- Ensure policies allow UPDATE on `approver_id` only for admins

### 7. Rollback Plan

If the migration needs to be rolled back:

```sql
-- Rollback migration
DROP INDEX IF EXISTS idx_user_organizations_org_approver;
DROP INDEX IF EXISTS idx_user_organizations_approver_id;
ALTER TABLE user_organizations DROP COLUMN IF EXISTS approver_id;
```

### 8. Testing Checklist

- [ ] Migration runs successfully on development database
- [ ] Column accepts NULL values
- [ ] Foreign key constraint works (insert valid approver_id succeeds)
- [ ] Foreign key constraint prevents invalid user_id references
- [ ] ON DELETE SET NULL works when approver account is deleted
- [ ] Indexes created successfully
- [ ] Query performance is acceptable with new column
- [ ] Existing queries continue to work (backward compatibility)
- [ ] RLS policies allow proper access to new column

## Rationale

**Why add `approver_id` to `user_organizations`?**

1. **Flexibility:** Not all organizations have a strict team-based hierarchy. Some employees may report to managers outside their team.

2. **Override Capability:** Even in team-based structures, there may be exceptions (interim managers, project-based reporting).

3. **Clarity:** Explicit approver assignment removes ambiguity in approval routing.

4. **Backward Compatibility:** NULL values allow existing team-based approval logic to continue working.

**Why nullable?**

- Organizations can gradually adopt per-user approver assignment
- Falls back to existing team-based approval routing when NULL
- Allows flexibility for different organizational structures

**Why reference profiles table instead of user_organizations?**

- Simpler foreign key relationship
- Approver assignment is conceptually "who is the user" not "which organization membership"
- Easier to query and join

## Performance Impact

**Storage:**
- UUID column adds 16 bytes per row
- With 100k users: ~1.6 MB additional storage (negligible)

**Query Performance:**
- Two new indexes optimize common lookup patterns
- Indexes are partial (WHERE approver_id IS NOT NULL) to reduce size
- Expected query time: <5ms for approver lookups

**Write Performance:**
- Minimal impact - single column update
- Index updates are fast with partial indexes
