# Phase 2: Fix team-utils.ts SQL Anti-Pattern

## Overview

Replace string-interpolated SQL subquery with parameterized query in `lib/team-utils.ts` to eliminate SQL injection risk and improve query optimization.

## Risk Level

**LOW RISK** - Changes HOW data is fetched, not WHAT is fetched. Results are identical, just safer and faster.

## Current Problem

### Code Location

**File:** `lib/team-utils.ts` (lines 115-124)

### Current Implementation

```typescript
export function applyTeamFilter(
  query: any,
  scope: TeamScope,
  userIdColumn: string = 'user_id'
) {
  if (scope.type === 'organization') {
    return query.eq('organization_id', scope.organizationId)
  }

  if (scope.type === 'team' && scope.teamId) {
    // ❌ SQL INJECTION RISK: String interpolation
    // ❌ UNOPTIMIZABLE: PostgreSQL can't cache query plan
    return query.in(userIdColumn, `(
      SELECT user_id FROM user_organizations
      WHERE team_id = '${scope.teamId}' AND is_active = true
    )`)
  }

  return query
}
```

### Issues

1. **SQL Injection Risk:** `${scope.teamId}` is interpolated directly into SQL
2. **Query Plan Caching:** PostgreSQL must reparse query each time
3. **Index Usage:** Subquery prevents optimal index selection
4. **Performance:** Additional query overhead from subquery materialization

### Current Usage

**File 1:** `/app/leave-requests/page.tsx` (line 116)
```typescript
const teamMemberIds = await getTeamMemberIds(teamScope)
const query = supabaseAdmin
  .from('leave_requests')
  .select('*')
  .eq('organization_id', organizationId)
// Note: applyTeamFilter is not actually used here currently
```

**File 2:** `/app/team/page.tsx` (line 164)
```typescript
const teamMemberIds = await getTeamMemberIds(teamScope)
// Used to filter profiles list
```

**Note:** Analysis shows these pages already call `getTeamMemberIds()` separately, so `applyTeamFilter()` may not be actively used. We'll fix it anyway for future-proofing.

---

## Proposed Solution

### New Implementation

```typescript
/**
 * Applies team filtering to a Supabase query builder
 * Fetches team member IDs first, then filters query with parameterized array
 *
 * @param query - Supabase query builder
 * @param scope - Team scope (organization or team-based)
 * @param userIdColumn - Column name to filter on (default: 'user_id')
 * @returns Modified query with team filtering applied
 */
export async function applyTeamFilter(
  query: any,
  scope: TeamScope,
  userIdColumn: string = 'user_id'
) {
  if (scope.type === 'organization') {
    // Filter by organization (admin/manager with no team, or all users)
    return query.eq('organization_id', scope.organizationId)
  }

  if (scope.type === 'team' && scope.teamId) {
    // ✅ SAFE: Fetch member IDs first
    const memberIds = await getTeamMemberIds(scope)

    // ✅ EDGE CASE: No members found
    if (memberIds.length === 0) {
      // Return query that matches no rows
      return query.eq(userIdColumn, null)
    }

    // ✅ PARAMETERIZED: Uses array of UUIDs, not string interpolation
    // ✅ OPTIMIZABLE: PostgreSQL can cache query plan
    return query.in(userIdColumn, memberIds)
  }

  return query
}
```

### Benefits

1. **Security:** No SQL injection possible
2. **Performance:** PostgreSQL can cache query plan
3. **Index Usage:** Can use indexes on `userIdColumn`
4. **Clarity:** Explicit two-step process is easier to understand
5. **Debugging:** Can inspect `memberIds` array if needed

### Trade-offs

- **Extra Query:** Adds one additional query to fetch member IDs
  - **Mitigation:** `getTeamMemberIds()` can be cached (see Phase 4)
  - **Impact:** Minimal (~20ms overhead vs. 200ms+ savings from better plan)

---

## Testing Strategy

### Unit Tests

Add to existing test file or create new:

```typescript
// __tests__/lib/team-utils.test.ts
import { applyTeamFilter, getUserTeamScope, getTeamMemberIds } from '@/lib/team-utils'

describe('applyTeamFilter', () => {
  it('should filter by organization for organization scope', async () => {
    const mockQuery = {
      eq: jest.fn().mockReturnThis()
    }
    const scope = {
      type: 'organization' as const,
      organizationId: 'org-123'
    }

    await applyTeamFilter(mockQuery, scope)

    expect(mockQuery.eq).toHaveBeenCalledWith('organization_id', 'org-123')
  })

  it('should filter by team member IDs for team scope', async () => {
    const mockQuery = {
      in: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis()
    }
    const scope = {
      type: 'team' as const,
      teamId: 'team-456',
      organizationId: 'org-123'
    }

    // Mock getTeamMemberIds to return test IDs
    jest.spyOn(require('@/lib/team-utils'), 'getTeamMemberIds')
      .mockResolvedValue(['user-1', 'user-2', 'user-3'])

    await applyTeamFilter(mockQuery, scope)

    expect(mockQuery.in).toHaveBeenCalledWith('user_id', ['user-1', 'user-2', 'user-3'])
  })

  it('should handle empty team (no members)', async () => {
    const mockQuery = {
      eq: jest.fn().mockReturnThis()
    }
    const scope = {
      type: 'team' as const,
      teamId: 'empty-team',
      organizationId: 'org-123'
    }

    // Mock getTeamMemberIds to return empty array
    jest.spyOn(require('@/lib/team-utils'), 'getTeamMemberIds')
      .mockResolvedValue([])

    await applyTeamFilter(mockQuery, scope)

    // Should return query matching no rows
    expect(mockQuery.eq).toHaveBeenCalledWith('user_id', null)
  })
})
```

### Integration Tests

```typescript
// __tests__/integration/team-filtering.test.ts
describe('Team Filtering Integration', () => {
  it('should correctly filter leave requests by team', async () => {
    // Create test organization with 2 teams
    // Create test users in each team
    // Create leave requests for each user
    // Verify manager only sees their team's requests
  })

  it('should show all organization data for admins', async () => {
    // Create test organization with teams
    // Create admin user
    // Verify admin sees all leave requests regardless of team
  })
})
```

### Manual QA Checklist

- [ ] Login as manager with team assigned
- [ ] Navigate to `/leave-requests`
- [ ] Verify only team member requests shown
- [ ] Verify count matches expected team size
- [ ] Navigate to `/team`
- [ ] Verify only team members shown
- [ ] Logout and login as admin
- [ ] Verify admin sees all organization data
- [ ] Verify behavior identical to before changes

---

## Rollback Procedure

### Git Revert

```bash
# If issues arise, revert the commit
git revert <commit-hash>
git push origin main

# Redeploy previous version
vercel --prod
```

**Time to rollback:** ~2 minutes

### Manual Rollback

If git revert isn't option, manually restore original code:

```typescript
// Restore original function in lib/team-utils.ts
export function applyTeamFilter(
  query: any,
  scope: TeamScope,
  userIdColumn: string = 'user_id'
) {
  if (scope.type === 'organization') {
    return query.eq('organization_id', scope.organizationId)
  }

  if (scope.type === 'team' && scope.teamId) {
    return query.in(userIdColumn, `(
      SELECT user_id FROM user_organizations
      WHERE team_id = '${scope.teamId}' AND is_active = true
    )`)
  }

  return query
}
```

---

## Affected Pages & APIs

### Direct Impact

- ✅ **lib/team-utils.ts** - Function being modified
- ⚠️ **app/leave-requests/page.tsx** - Uses `getTeamMemberIds()` (not `applyTeamFilter` directly)
- ⚠️ **app/team/page.tsx** - Uses `getTeamMemberIds()` (not `applyTeamFilter` directly)

### No Impact

- ✅ All API endpoints using admin client (bypass RLS anyway)
- ✅ Calendar page (uses separate team filtering logic)
- ✅ Dashboard (doesn't use team filtering)

### Risk Assessment

**Impact if broken:** Manager users would see incorrect team members or no data
**Affected users:** Only managers with team assigned (~10-20% of users)
**Detection time:** Immediate (managers would notice empty lists)
**Recovery time:** 2 minutes (git revert)

---

## Deployment Steps

1. **Create feature branch**
   ```bash
   git checkout -b fix/team-utils-sql-injection
   ```

2. **Make changes to lib/team-utils.ts**

3. **Add unit tests**

4. **Run test suite**
   ```bash
   npm test
   npm test __tests__/lib/team-utils.test.ts
   ```

5. **Manual QA on development**
   - Test as manager
   - Test as admin
   - Test as employee

6. **Create PR with description**
   - Explain SQL injection fix
   - Show before/after code
   - Include test results

7. **Deploy to staging**

8. **Staging verification**
   - Run full integration test suite
   - Manual QA by QA team

9. **Deploy to production**
   - Use Vercel deployment
   - Monitor error rates for 1 hour

10. **Post-deployment validation**
    - Verify no error spikes in logs
    - Check user reports for any issues
    - Run smoke tests on production

---

## Success Criteria

- [ ] No SQL injection vulnerability in team filtering
- [ ] All existing tests pass
- [ ] New unit tests added and passing
- [ ] Manual QA confirms identical behavior
- [ ] No increase in error rates post-deployment
- [ ] Team filtering still works for managers
- [ ] Admins still see all organization data
- [ ] Performance improved or unchanged
