# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-08-13-auth-onboarding-revamp/spec.md

This specification covers database requirements for the four onboarding scenarios using the existing multi-organization structure.

## Schema Changes

### No New Tables Required

The current database schema supports all required functionality through existing tables:
- `auth.users` (Supabase managed) - includes `email_confirmed_at` for verification tracking
- `invitations` - existing table with `token`, `status`, `expires_at`, `accepted_at` fields
- `user_organizations` - multi-org membership table with `role`, `is_default`, `joined_via` fields
- `organizations` - organization data with slug uniqueness constraint
- `organization_settings` - per-organization configuration table
- `organization_domains` - domain-based features (future use)

### Potential Index Optimizations

**Existing Indexes to Verify:**
```sql
-- Check if these optimized indexes from migration 20250807000002 are active:
CREATE INDEX IF NOT EXISTS idx_invitations_email_lower 
  ON invitations(LOWER(email));

CREATE INDEX IF NOT EXISTS idx_user_organizations_user_org_active 
  ON user_organizations(user_id, organization_id, is_active);
```

**Additional Suggested Indexes:**
```sql
-- Optimize invitation lookups by token
CREATE INDEX IF NOT EXISTS idx_invitations_token_status 
  ON invitations(token, status) 
  WHERE status = 'pending';

-- Optimize user organization lookups with default flag
CREATE INDEX IF NOT EXISTS idx_user_organizations_default 
  ON user_organizations(user_id, is_default) 
  WHERE is_default = true;
```

## Data Migration Considerations

### Email Verification State Handling

**Current State Analysis:**
- Existing users may have `email_confirmed_at` = NULL if created through custom signup
- Users created via invitation signup have `email_confirmed_at` set
- Need to handle mixed verification states during rollout

**Migration Strategy:**
```sql
-- No data migration required - handle verification state at application level
-- Existing unverified users will go through verification flow
-- Existing verified users continue normal flow
```

### Invitation Status Cleanup

**Validation Query:**
```sql
-- Check for invitations that need status cleanup
SELECT 
  COUNT(*) as total_invitations,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN expires_at < NOW() AND status = 'pending' THEN 1 END) as expired_pending
FROM invitations;
```

**Optional Cleanup:**
```sql
-- Mark expired invitations (optional - can be handled at application level)
UPDATE invitations 
SET status = 'expired' 
WHERE expires_at < NOW() AND status = 'pending';
```

## Schema Integrity Checks

### User Organizations Consistency

**Verify Default Organization Logic:**
```sql
-- Check users with multiple default organizations (should be 0)
SELECT user_id, COUNT(*) as default_count
FROM user_organizations 
WHERE is_default = true 
GROUP BY user_id 
HAVING COUNT(*) > 1;

-- Check users with no default organization but multiple orgs (should be 0)  
SELECT uo1.user_id, COUNT(*) as org_count
FROM user_organizations uo1
LEFT JOIN user_organizations uo2 ON uo1.user_id = uo2.user_id AND uo2.is_default = true
WHERE uo2.user_id IS NULL AND uo1.is_active = true
GROUP BY uo1.user_id
HAVING COUNT(*) > 1;
```

### Invitation Data Integrity

**Verify Invitation Constraints:**
```sql
-- Check for invitations without expiration dates (should be 0)
SELECT COUNT(*) FROM invitations WHERE expires_at IS NULL;

-- Check for duplicate pending invitations for same email/org (should be 0)
SELECT email, organization_id, COUNT(*)
FROM invitations 
WHERE status = 'pending'
GROUP BY email, organization_id 
HAVING COUNT(*) > 1;
```

## Performance Considerations

### Query Optimization Patterns

**User Scenario Detection:**
```sql
-- Optimized query for user onboarding scenario detection
-- This pattern will be used in /api/user/organization-status
WITH user_orgs AS (
  SELECT organization_id, role, is_default
  FROM user_organizations 
  WHERE user_id = $1 AND is_active = true
),
pending_invites AS (
  SELECT COUNT(*) as invite_count
  FROM invitations 
  WHERE LOWER(email) = LOWER($2) 
    AND status = 'pending' 
    AND expires_at > NOW()
)
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM user_orgs) THEN 'has_organizations'
    WHEN (SELECT invite_count FROM pending_invites) > 0 THEN 'has_invitations'  
    ELSE 'no_invitations'
  END as scenario;
```

**Invitation Lookup Optimization:**
```sql  
-- Efficient invitation lookup with organization details
SELECT 
  i.id, i.email, i.full_name, i.role, i.expires_at,
  o.name as organization_name,
  t.name as team_name
FROM invitations i
JOIN organizations o ON i.organization_id = o.id
LEFT JOIN teams t ON i.team_id = t.id
WHERE i.token = $1 
  AND i.status = 'pending' 
  AND i.expires_at > NOW();
```

## Rationale

**Multi-Organization Support:**
The existing schema fully supports the four onboarding scenarios. The `user_organizations` table enables multi-membership with proper role assignment, default organization tracking, and join method recording (`joined_via` field).

**Invitation Processing:**
The `invitations` table supports token-based direct signup with expiration tracking and status management. The existing RLS policies ensure users can only access appropriate invitation data.

**Index Strategy:**  
Suggested indexes optimize the most frequent onboarding queries: scenario detection, invitation token validation, and user organization lookups with proper filtering on active memberships.

**Data Consistency:**
Database constraints (unique default organization per user, foreign key relationships) provide data integrity, while RLS policies enforce multi-tenant security. Application logic handles business rules for invitation processing and organization creation.