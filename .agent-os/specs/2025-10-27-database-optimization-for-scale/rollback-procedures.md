# Rollback Procedures

## Phase 1: Composite Indexes

**Time to Rollback:** 3 minutes
**Risk Level:** ZERO RISK - Cannot affect data or functionality

### SQL Rollback

```sql
-- Drop indexes in reverse order of creation
DROP INDEX CONCURRENTLY IF EXISTS idx_leave_requests_pending_org;
DROP INDEX CONCURRENTLY IF EXISTS idx_leave_requests_date_range;
DROP INDEX CONCURRENTLY IF EXISTS idx_user_orgs_team_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_user_orgs_org_active_covering;
DROP INDEX CONCURRENTLY IF EXISTS idx_leave_balances_org_year_user;
DROP INDEX CONCURRENTLY IF EXISTS idx_leave_requests_org_status_created;
```

### Verification

```sql
-- Verify indexes are gone
SELECT indexname FROM pg_indexes
WHERE indexname IN (
  'idx_leave_requests_org_status_created',
  'idx_leave_balances_org_year_user',
  'idx_user_orgs_org_active_covering',
  'idx_user_orgs_team_active',
  'idx_leave_requests_date_range',
  'idx_leave_requests_pending_org'
);
-- Should return 0 rows
```

---

## Phase 2: team-utils.ts

**Time to Rollback:** 2 minutes
**Risk Level:** LOW RISK - Easy git revert

### Git Revert

```bash
# Find the commit hash
git log --oneline | grep "team-utils"

# Revert the commit
git revert <commit-hash>

# Push to production
git push origin main

# Redeploy
vercel --prod
```

### Manual Rollback

If git revert not possible, restore original function:

```typescript
// lib/team-utils.ts - RESTORE THIS VERSION
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

### Verification

1. Login as manager
2. Navigate to /leave-requests
3. Verify team member filtering works
4. Check no errors in console

---

## Phase 3: RLS Policies

**Time to Rollback:** 2 minutes
**Risk Level:** MEDIUM RISK - Affects data visibility

### Create Rollback Migration

**File:** `supabase/migrations/20251027000003_rollback_rls_optimization.sql`

```sql
BEGIN;

-- Restore old "IN + JOIN" pattern for leave_requests
DROP POLICY IF EXISTS "Users can view organization leave requests" ON public.leave_requests;
CREATE POLICY "Users can view organization leave requests" ON public.leave_requests
  FOR SELECT USING (
    user_id IN (
      SELECT uo2.user_id
      FROM public.user_organizations uo1
      JOIN public.user_organizations uo2 ON uo1.organization_id = uo2.organization_id
      WHERE uo1.user_id = auth.uid()
      AND uo1.is_active = true
      AND uo2.is_active = true
    )
  );

-- Restore old policy for leave_balances
DROP POLICY IF EXISTS "Users can view organization leave balances" ON public.leave_balances;
CREATE POLICY "Users can view organization leave balances" ON public.leave_balances
  FOR SELECT USING (
    user_id IN (
      SELECT uo2.user_id
      FROM public.user_organizations uo1
      JOIN public.user_organizations uo2 ON uo1.organization_id = uo2.organization_id
      WHERE uo1.user_id = auth.uid()
      AND uo1.is_active = true
      AND uo2.is_active = true
    )
  );

COMMIT;
```

### Verification

```bash
# Run RLS test suite
npm test __tests__/security/rls-policy.test.ts

# Should all pass
```

---

## Phase 4: Materialized Views

**Time to Rollback:** 1 minute
**Risk Level:** ZERO RISK - Views are optional

### SQL Rollback

```sql
-- Drop materialized views
DROP MATERIALIZED VIEW IF EXISTS mv_org_leave_summaries;
DROP MATERIALIZED VIEW IF EXISTS mv_organization_seat_usage;

-- Drop refresh functions
DROP FUNCTION IF EXISTS refresh_leave_summaries();
DROP FUNCTION IF EXISTS refresh_seat_usage();

-- Remove cron jobs (if using pg_cron)
SELECT cron.unschedule('refresh-seat-usage-nightly');
```

### Verification

```sql
-- Verify views are gone
SELECT matviewname FROM pg_matviews
WHERE schemaname = 'public';
-- Should not contain mv_organization_seat_usage or mv_org_leave_summaries
```

---

## Emergency Rollback (All Phases)

If multiple phases need rollback simultaneously:

```bash
# 1. Restore code (Phase 2)
git revert <team-utils-commit>
git push origin main
vercel --prod

# 2. Rollback database (Phases 1, 3, 4)
# Execute rollback SQL for each phase in reverse order:
# - Phase 4 (views)
# - Phase 3 (RLS)
# - Phase 1 (indexes)

# 3. Verify system health
npm test
# Check error rates in production
# Verify no user reports
```

---

## Post-Rollback Actions

1. **Document the reason** for rollback
2. **Analyze what went wrong** - logs, errors, user reports
3. **Update spec** with findings
4. **Fix issues** before attempting again
5. **Inform team** of rollback and next steps
