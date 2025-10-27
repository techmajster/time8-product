# Phase 3: RLS Policy Optimization (OPTIONAL)

## Overview

Optimize 4 RLS policies from IN+subquery pattern to EXISTS+JOIN pattern for better performance at scale.

## Risk Level

**MEDIUM RISK** - Changes database-level policies, but app uses admin client extensively so impact is limited.

## Rationale for "OPTIONAL" Status

**Current Architecture Analysis:**
- 30+ endpoints use `createAdminClient()` which bypasses RLS
- Application-level security via `authenticateAndGetOrgContext()`
- RLS policies serve as secondary defense, not primary security

**Affected Queries:**
- Only non-admin-client queries (primarily `/api/leave-requests` GET endpoint)
- Estimated <5% of total queries actually use RLS policies

**Decision:** Implement only if performance testing shows bottleneck in RLS policy evaluation.

---

## Policies to Optimize

### 1. "Users can view organization leave requests"

**Current (20250807000002_optimize_rls_policies.sql:62-73):**
```sql
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
```

**Optimized:**
```sql
DROP POLICY IF EXISTS "Users can view organization leave requests" ON public.leave_requests;
CREATE POLICY "Users can view organization leave requests" ON public.leave_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM user_organizations requester
      INNER JOIN user_organizations owner
        ON requester.organization_id = owner.organization_id
      WHERE requester.user_id = auth.uid()
        AND requester.is_active = true
        AND owner.user_id = leave_requests.user_id
        AND owner.is_active = true
    )
  );
```

**Expected Impact:** 75% faster (400ms → 100ms) on RLS-enforced queries

---

### 2. "Users can view organization leave balances"

Same optimization pattern as leave_requests.

---

### 3. "Managers can manage team leave requests" (Already optimized)

Current policy already uses EXISTS + JOIN pattern. No changes needed.

---

### 4. "Admins can manage leave balances" (Already optimized)

Current policy already uses EXISTS + JOIN pattern. No changes needed.

---

## Migration File

**Filename:** `supabase/migrations/20251027000001_optimize_rls_policies_exists_pattern.sql`

```sql
-- Only create this migration if performance testing shows RLS bottleneck

BEGIN;

DROP POLICY IF EXISTS "Users can view organization leave requests" ON public.leave_requests;
CREATE POLICY "Users can view organization leave requests" ON public.leave_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM user_organizations requester
      INNER JOIN user_organizations owner
        ON requester.organization_id = owner.organization_id
      WHERE requester.user_id = auth.uid()
        AND requester.is_active = true
        AND owner.user_id = leave_requests.user_id
        AND owner.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can view organization leave balances" ON public.leave_balances;
CREATE POLICY "Users can view organization leave balances" ON public.leave_balances
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM user_organizations requester
      INNER JOIN user_organizations owner
        ON requester.organization_id = owner.organization_id
      WHERE requester.user_id = auth.uid()
        AND requester.is_active = true
        AND owner.user_id = leave_balances.user_id
        AND owner.is_active = true
    )
  );

COMMIT;
```

---

## Testing Requirements

**CRITICAL:** Comprehensive RLS testing required before production deployment.

### Existing Tests to Run

```bash
npm test __tests__/security/rls-policy.test.ts
npm test __tests__/performance/rls-policy-performance.test.ts
```

### Additional Tests Needed

1. Create two test organizations
2. Create users in each organization
3. Create leave requests in each organization
4. Verify user in Org1 cannot see Org2 leave requests
5. Verify managers see correct team requests
6. Verify admins see all organization requests

---

## Deployment Decision Tree

```
START
  ↓
Are Phase 1 indexes deployed?
  NO → Deploy Phase 1 first
  YES ↓

Has performance testing shown RLS bottleneck?
  NO → SKIP Phase 3 (not needed)
  YES ↓

Are you comfortable with MEDIUM risk change?
  NO → SKIP Phase 3
  YES ↓

Is comprehensive test suite passing?
  NO → Fix tests first
  YES ↓

PROCEED with Phase 3 deployment
```

---

## Success Criteria

- [ ] All RLS tests pass
- [ ] Performance benchmark shows improvement
- [ ] Cross-organization isolation verified
- [ ] No user reports of incorrect data visibility
- [ ] Easy rollback tested and documented
