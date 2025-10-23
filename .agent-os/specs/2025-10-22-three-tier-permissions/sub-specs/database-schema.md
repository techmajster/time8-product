# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-10-22-three-tier-permissions/spec.md

## Summary

**No database schema changes required.** The existing multi-organization architecture already supports the three-tier permission system.

## Existing Schema Review

### user_organizations Table

The `user_organizations` table (created in migration `20250127000000_multi_organization_support.sql`) already includes the required role column:

```sql
CREATE TABLE user_organizations (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Role within this specific organization
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'employee')),

    -- ... other columns
);
```

### Role Enum Values

The existing role constraint perfectly matches our requirements:
- `admin` - Full CRUD access to all features
- `manager` - READ-ONLY access to Team/Groups, leave management capabilities
- `employee` - Access to personal features only

### Indexes

Existing indexes support efficient role-based queries:
```sql
CREATE INDEX idx_user_organizations_role
ON user_organizations(organization_id, role);
```

This index will optimize queries filtering by organization and role.

## Row Level Security (RLS) Policies

### Current RLS Policies

The existing RLS policies already provide appropriate access control:

```sql
-- Organization admins can view all memberships
CREATE POLICY "Organization admins can view all memberships"
ON user_organizations
FOR SELECT USING (
    organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid() AND role IN ('admin') AND is_active = true
    )
);

-- Organization admins can manage memberships
CREATE POLICY "Organization admins can manage memberships"
ON user_organizations
FOR ALL USING (
    organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid() AND role IN ('admin') AND is_active = true
    )
);
```

### RLS Policy Analysis

**Current State:**
- Only admins can manage user_organizations records ✓
- Managers and employees can view their own memberships ✓
- Managers cannot modify user roles ✓

**No RLS changes needed** - the existing policies correctly restrict role assignment to admins only.

## Future Considerations

If we add permission audit logging in Phase 7, we may need:

```sql
-- Future migration for Phase 7: Permission Audit Trail
CREATE TABLE IF NOT EXISTS permission_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    old_role TEXT,
    new_role TEXT NOT NULL CHECK (new_role IN ('admin', 'manager', 'employee')),

    reason TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Note:** The above is for future reference only and not part of the current spec.

## Verification Queries

### Check User Roles in Organization

```sql
-- Get all users with their roles in a specific organization
SELECT
    p.id,
    p.full_name,
    p.email,
    uo.role,
    uo.is_active
FROM user_organizations uo
JOIN profiles p ON p.id = uo.user_id
WHERE uo.organization_id = 'YOUR_ORG_ID'
ORDER BY uo.role, p.full_name;
```

### Count Users by Role

```sql
-- Count users by role in each organization
SELECT
    o.name AS organization_name,
    uo.role,
    COUNT(*) AS user_count
FROM user_organizations uo
JOIN organizations o ON o.id = uo.organization_id
WHERE uo.is_active = true
GROUP BY o.name, uo.role
ORDER BY o.name, uo.role;
```

### Find All Admins

```sql
-- List all admin users across organizations
SELECT
    p.full_name,
    p.email,
    o.name AS organization_name
FROM user_organizations uo
JOIN profiles p ON p.id = uo.user_id
JOIN organizations o ON o.id = uo.organization_id
WHERE uo.role = 'admin'
  AND uo.is_active = true
ORDER BY o.name, p.full_name;
```

## Migration Notes

**No migration required for this feature.** The database schema is already complete and ready to support the three-tier permission system.

The implementation will focus on:
1. Application-level permission checks
2. UI component conditional rendering
3. Route protection middleware
4. Client-side role management utilities

All of these are code-level changes that do not require database schema modifications.
