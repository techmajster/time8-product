# Phase 6 Part 2: Multiple Permissive Policies Consolidation

## Overview

Consolidate 240 multiple permissive policy warnings across 15 tables. When multiple permissive RLS policies exist for the same role and action, PostgreSQL must evaluate ALL of them, causing performance degradation.

## Risk Level

**MEDIUM RISK** - Changes RLS policy evaluation logic. Requires careful testing to ensure security is maintained.

## Current Problem

### Advisory Warnings

Supabase has flagged **240 RLS policies** with `WARN` level performance issues:

**Advisory ID:** `multiple_permissive_policies`
**Category:** PERFORMANCE
**Level:** WARN
**Facing:** EXTERNAL

### Performance Impact

**Problem:** Multiple permissive policies for the same role/action force PostgreSQL to evaluate ALL policies using OR logic.

**Example:**
```sql
-- ❌ SLOW: PostgreSQL evaluates BOTH policies for EVERY query
CREATE POLICY "Policy A" ON table_name FOR SELECT USING (condition_a);
CREATE POLICY "Policy B" ON table_name FOR SELECT USING (condition_b);
-- Result: WHERE (condition_a) OR (condition_b)
```

When 3-6 policies exist, PostgreSQL evaluates all of them, even if the first one already grants access.

**Solution:** Consolidate multiple policies into a single policy with OR conditions:
```sql
-- ✅ FAST: Single policy evaluation
CREATE POLICY "Consolidated Policy" ON table_name FOR SELECT
USING (condition_a OR condition_b);
```

### Why This Matters

- **Performance**: Each additional policy adds overhead to query planning and execution
- **Clarity**: Single consolidated policy is easier to understand and maintain
- **Best Practice**: Supabase recommends one policy per role/action combination

---

## Affected Tables and Policy Counts

### Summary by Table

| Table | Total Warnings | Roles Affected | Actions Affected |
|-------|----------------|----------------|------------------|
| company_holidays | 20 | 5 | 4 (DELETE, INSERT, SELECT, UPDATE) |
| customers | 5 | 5 | 1 (SELECT) |
| invitations | 20 | 5 | 4 (DELETE, INSERT, SELECT, UPDATE) |
| leave_balances | 20 | 5 | 4 (DELETE, INSERT, SELECT, UPDATE) |
| leave_requests | 20 | 5 | 4 (DELETE, INSERT, SELECT, UPDATE) |
| leave_types | 20 | 5 | 4 (DELETE, INSERT, SELECT, UPDATE) |
| organization_domains | 20 | 5 | 4 (DELETE, INSERT, SELECT, UPDATE) |
| organization_settings | 20 | 5 | 4 (DELETE, INSERT, SELECT, UPDATE) |
| organizations | 15 | 5 | 3 (DELETE, SELECT, UPDATE) |
| price_variants | 5 | 5 | 1 (SELECT) |
| products | 5 | 5 | 1 (SELECT) |
| profiles | 20 | 5 | 4 (DELETE, INSERT, SELECT, UPDATE) |
| subscriptions | 20 | 5 | 4 (DELETE, INSERT, SELECT, UPDATE) |
| teams | 20 | 5 | 4 (DELETE, INSERT, SELECT, UPDATE) |
| user_organizations | 20 | 5 | 4 (DELETE, INSERT, SELECT, UPDATE) |

**Total:** 240 warnings across 15 tables

### Roles Affected (All Tables)

- `anon`
- `authenticated`
- `authenticator`
- `cli_login_postgres`
- `dashboard_user`

---

## Example: company_holidays Table

### Current State (Multiple Policies)

**SELECT action has 6 policies:**
1. "Admins can manage holidays"
2. "Service role has full access"
3. "Users can view holidays"
4. "Users can view organization holidays"
5. `manage_holidays`
6. `view_holidays`

PostgreSQL evaluates all 6 policies for EVERY SELECT query on company_holidays.

### Proposed Consolidation

**Single consolidated SELECT policy:**
```sql
CREATE POLICY "company_holidays_select_policy"
ON company_holidays FOR SELECT
USING (
  -- Service role has full access
  ((select auth.jwt())->>'role')::text = 'service_role'
  OR
  -- Admins can manage holidays
  EXISTS (
    SELECT 1 FROM user_organizations uo
    WHERE uo.user_id = (select auth.uid())
      AND uo.organization_id = company_holidays.organization_id
      AND uo.role = 'admin'
      AND uo.is_active = true
  )
  OR
  -- Users can view holidays in their organization
  EXISTS (
    SELECT 1 FROM user_organizations uo
    WHERE uo.user_id = (select auth.uid())
      AND uo.organization_id = company_holidays.organization_id
      AND uo.is_active = true
  )
);
```

---

## Migration Strategy

### Step 1: Analyze Current Policies

For each table, query existing policies:

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  polcmd as command,
  polroles as roles,
  pg_get_expr(polqual, polrelid) as using_clause,
  pg_get_expr(polwithcheck, polrelid) as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'company_holidays'
ORDER BY polcmd, policyname;
```

### Step 2: Group by Role and Action

Group policies by:
- Role (anon, authenticated, etc.)
- Action (SELECT, INSERT, UPDATE, DELETE)

### Step 3: Consolidate Logic

For each group, combine USING clauses with OR:
```sql
USING (condition_1 OR condition_2 OR condition_3)
```

### Step 4: Drop Old Policies and Create New

```sql
-- Drop all old policies for this role/action
DROP POLICY IF EXISTS "Policy 1" ON table_name;
DROP POLICY IF EXISTS "Policy 2" ON table_name;
DROP POLICY IF EXISTS "Policy 3" ON table_name;

-- Create single consolidated policy
CREATE POLICY "table_name_action_policy"
ON table_name FOR ACTION
USING (condition_1 OR condition_2 OR condition_3);
```

### Step 5: Verify No Regressions

Test all affected user roles:
- Admins should still have full access
- Managers should still have team access
- Users should still have organization access
- Service role should still bypass RLS

---

## Task Breakdown

### Task 1: Consolidate company_holidays policies (20 warnings)
- 4 actions × 5 roles = 20 policies to consolidate
- Expected result: 4 policies (one per action)

### Task 2: Consolidate invitations policies (20 warnings)
- 4 actions × 5 roles = 20 policies to consolidate
- Expected result: 4 policies (one per action)

### Task 3: Consolidate leave_balances policies (20 warnings)
- 4 actions × 5 roles = 20 policies to consolidate
- Expected result: 4 policies (one per action)

### Task 4: Consolidate leave_requests policies (20 warnings)
- 4 actions × 5 roles = 20 policies to consolidate
- Expected result: 4 policies (one per action)

### Task 5: Consolidate leave_types policies (20 warnings)
- 4 actions × 5 roles = 20 policies to consolidate
- Expected result: 4 policies (one per action)

### Task 6: Consolidate organization_domains policies (20 warnings)
- 4 actions × 5 roles = 20 policies to consolidate
- Expected result: 4 policies (one per action)

### Task 7: Consolidate organization_settings policies (20 warnings)
- 4 actions × 5 roles = 20 policies to consolidate
- Expected result: 4 policies (one per action)

### Task 8: Consolidate profiles policies (20 warnings)
- 4 actions × 5 roles = 20 policies to consolidate
- Expected result: 4 policies (one per action)

### Task 9: Consolidate subscriptions policies (20 warnings)
- 4 actions × 5 roles = 20 policies to consolidate
- Expected result: 4 policies (one per action)

### Task 10: Consolidate teams policies (20 warnings)
- 4 actions × 5 roles = 20 policies to consolidate
- Expected result: 4 policies (one per action)

### Task 11: Consolidate user_organizations policies (20 warnings)
- 4 actions × 5 roles = 20 policies to consolidate
- Expected result: 4 policies (one per action)

### Task 12: Consolidate organizations policies (15 warnings)
- 3 actions × 5 roles = 15 policies to consolidate
- Expected result: 3 policies (one per action)

### Task 13: Consolidate customers policies (5 warnings)
- 1 action × 5 roles = 5 policies to consolidate
- Expected result: 1 policy

### Task 14: Consolidate price_variants policies (5 warnings)
- 1 action × 5 roles = 5 policies to consolidate
- Expected result: 1 policy

### Task 15: Consolidate products policies (5 warnings)
- 1 action × 5 roles = 5 policies to consolidate
- Expected result: 1 policy

**Total:** 15 tasks to eliminate 240 warnings

---

## Expected Performance Impact

### Policy Evaluation Time

- **Before:** 3-6 policy evaluations per query
- **After:** 1 policy evaluation per query
- **Improvement:** 66-83% faster RLS evaluation

### Real-World Impact

**company_holidays SELECT query:**
- Before: 6 policies evaluated = ~12ms RLS overhead
- After: 1 policy evaluated = ~2ms RLS overhead
- **83% improvement**

**leave_requests with large result sets:**
- 1,000 rows × 6 policies = 6,000 policy evaluations
- 1,000 rows × 1 policy = 1,000 policy evaluations
- **83% reduction in evaluations**

---

## Rollback Procedure

If issues arise, restore original policies from backup:

```sql
-- Restore from migration history
-- Each original policy definition is preserved in git history
```

**Important:** Test thoroughly in development before production deployment.

---

## Testing Strategy

### Unit Tests

No application code changes needed, but verify RLS behavior:

1. Test as `anon` role → should see appropriate data
2. Test as `authenticated` user → should see organization data
3. Test as admin → should have full access
4. Test as manager → should have team access
5. Test service role → should bypass RLS entirely

### Performance Tests

1. **Before consolidation:** Benchmark query times with EXPLAIN ANALYZE
2. **After consolidation:** Re-run same queries
3. **Compare:** Document improvement percentages

### Manual QA Checklist

- [ ] Admin can create/edit/delete holidays
- [ ] Users can view organization holidays
- [ ] Users cannot view other organizations' holidays
- [ ] Service role has unrestricted access
- [ ] No permission errors in application logs
- [ ] Dashboard loads correctly for all roles
- [ ] Calendar queries work for all users

---

## Success Criteria

- [ ] All 240 `multiple_permissive_policies` warnings eliminated
- [ ] Zero Supabase advisory warnings for this category
- [ ] No RLS permission errors in application
- [ ] Policy evaluation time reduced by 60%+
- [ ] All existing tests passing
- [ ] Manual QA passing for all user roles

---

## References

- [Supabase: Multiple Permissive Policies](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [RLS Performance Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security)
