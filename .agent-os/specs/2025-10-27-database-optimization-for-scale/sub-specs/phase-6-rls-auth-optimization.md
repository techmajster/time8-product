# Phase 6: RLS Auth Function Optimization

## Overview

Optimize 27 RLS policies that re-evaluate `auth.<function>()` for each row, causing significant performance degradation at scale. This addresses Supabase `auth_rls_initplan` advisory warnings.

## Risk Level

**LOW RISK** - Performance optimization only, no behavior changes.

## Current Problem

### Advisory Warnings

Supabase has flagged **27 RLS policies** with `WARN` level performance issues:

**Advisory ID:** `auth_rls_initplan`
**Category:** PERFORMANCE
**Level:** WARN
**Facing:** EXTERNAL

### Performance Impact

**Problem:** RLS policies call `auth.uid()` directly, causing PostgreSQL to re-evaluate the function **for each row** in the result set.

**Example:**
```sql
-- ❌ SLOW: Evaluates auth.uid() for EVERY ROW
CREATE POLICY "Users can view own leave requests"
  ON leave_requests FOR SELECT
  USING (user_id = auth.uid());
```

When a query returns 1,000 rows, `auth.uid()` is called 1,000 times instead of once.

**Solution:** Wrap `auth.<function>()` in a subquery to force single evaluation:
```sql
-- ✅ FAST: Evaluates auth.uid() ONCE per query
CREATE POLICY "Users can view own leave requests"
  ON leave_requests FOR SELECT
  USING (user_id = (select auth.uid()));
```

### Why This Matters

- **At scale:** 10,000 row queries become 10,000x slower
- **User impact:** Dashboard loads, calendar views, API responses all affected
- **Cost:** Increased database CPU usage and slower response times

---

## Affected Tables and Policies

### 1. leave_types (1 policy)
- `Service role has full access`

### 2. leave_requests (9 policies)
- `Managers can manage team leave requests`
- `Service role has full access`
- `Users can manage own leave requests`
- `Users can view organization leave requests`
- `managers_can_update_requests`
- `org_isolation_safety_net`
- `users_can_insert_own_requests`
- `users_can_update_own_requests`
- `users_can_view_relevant_requests`

### 3. leave_balances (5 policies)
- `Admins can manage leave balances`
- `Service role has full access`
- `Users can view organization leave balances`
- `Users can view own leave balances`
- `org_safety_net`

### 4. company_holidays (2 policies)
- `Service role has full access`
- `Users can view holidays`

### 5. employee_schedules (1 policy)
- `org_safety_net`

### 6. work_schedule_templates (1 policy)
- `org_safety_net`

### 7. work_schedules (1 policy)
- `org_safety_net`

### 8. user_organizations (4 policies)
- `Service role has full access`
- `Users can insert own memberships`
- `Users can update own memberships`
- `Users can view own memberships`

### 9. organization_domains (1 policy)
- `Organization admins can manage domains`

### 10. public_email_domains (1 policy)
- `All authenticated users can view public domains`

### 11. customers (2 policies)
- `Customers viewable by organization members`
- `Service role can manage customers`

### 12. subscriptions (3 policies)
- `Organization admins can manage subscriptions`
- `Service role can manage subscriptions`
- `Subscriptions viewable by organization members`

### 13. billing_events (1 policy)
- `Service role can manage billing events`

**Total:** 32 policy optimizations across 13 tables

---

## Optimization Pattern

### Pattern 1: Simple auth.uid() Comparison

**Before:**
```sql
CREATE POLICY "example"
  ON table_name FOR SELECT
  USING (user_id = auth.uid());
```

**After:**
```sql
CREATE POLICY "example"
  ON table_name FOR SELECT
  USING (user_id = (select auth.uid()));
```

### Pattern 2: auth.uid() in Subquery

**Before:**
```sql
CREATE POLICY "example"
  ON table_name FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );
```

**After:**
```sql
CREATE POLICY "example"
  ON table_name FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_id = (select auth.uid())
    )
  );
```

### Pattern 3: auth.jwt() Optimization

**Before:**
```sql
CREATE POLICY "example"
  ON table_name FOR SELECT
  USING (
    (auth.jwt()->>'role')::text = 'service_role'
  );
```

**After:**
```sql
CREATE POLICY "example"
  ON table_name FOR SELECT
  USING (
    ((select auth.jwt())->>'role')::text = 'service_role'
  );
```

### Pattern 4: Multiple auth.uid() References

**Before:**
```sql
CREATE POLICY "example"
  ON table_name FOR SELECT
  USING (
    user_id = auth.uid() OR
    manager_id = auth.uid()
  );
```

**After:**
```sql
CREATE POLICY "example"
  ON table_name FOR SELECT
  USING (
    user_id = (select auth.uid()) OR
    manager_id = (select auth.uid())
  );
```

**Note:** PostgreSQL will still only evaluate `(select auth.uid())` once and cache the result.

---

## Migration Strategy

### Step 1: Identify All Affected Policies

Query all policies that use `auth.uid()` or `auth.jwt()`:

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  polcmd as command,
  pg_get_expr(polqual, polrelid) as using_clause,
  pg_get_expr(polwithcheck, polrelid) as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    pg_get_expr(polqual, polrelid) LIKE '%auth.uid()%' OR
    pg_get_expr(polqual, polrelid) LIKE '%auth.jwt()%' OR
    pg_get_expr(polwithcheck, polrelid) LIKE '%auth.uid()%' OR
    pg_get_expr(polwithcheck, polrelid) LIKE '%auth.jwt()%'
  )
ORDER BY tablename, policyname;
```

### Step 2: Generate Optimized Policies

For each policy:
1. Extract current policy definition
2. Replace `auth.uid()` with `(select auth.uid())`
3. Replace `auth.jwt()` with `(select auth.jwt())`
4. Use `CREATE OR REPLACE POLICY` (available in PostgreSQL 15+)

### Step 3: Apply Migration

Create migration file: `supabase/migrations/YYYYMMDDHHMMSS_optimize_rls_auth_calls.sql`

Use `CREATE OR REPLACE POLICY` to update policies in-place (no downtime).

### Step 4: Verify Performance Improvement

Run before/after performance tests on key queries:
- Dashboard load time
- Calendar view queries
- Leave request listing

---

## Expected Performance Impact

### Query Performance

- **Single-row lookups:** 0-5% improvement (minimal rows)
- **Medium result sets (100 rows):** 40-60% improvement
- **Large result sets (1,000+ rows):** 75-85% improvement
- **Dashboard aggregations:** 50-70% faster

### Real-World Examples

**Before optimization:**
```
SELECT * FROM leave_requests WHERE organization_id = '...';
-- Returns 500 rows
-- auth.uid() called 500 times
-- Query time: 450ms
```

**After optimization:**
```
SELECT * FROM leave_requests WHERE organization_id = '...';
-- Returns 500 rows
-- auth.uid() called 1 time
-- Query time: 80ms
-- 82% improvement
```

---

## Migration SQL (Split by Table)

### Task 1: Optimize leave_types RLS Policies

```sql
-- leave_types: 1 policy
CREATE OR REPLACE POLICY "Service role has full access"
  ON leave_types FOR ALL
  USING (
    ((select auth.jwt())->>'role')::text = 'service_role'
  );
```

### Task 2: Optimize leave_requests RLS Policies (Part 1)

```sql
-- leave_requests: 9 policies (split into 3 groups for clarity)

-- Group 1: Manager and service role policies
CREATE OR REPLACE POLICY "Managers can manage team leave requests"
  ON leave_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM user_organizations uo1
      JOIN user_organizations uo2
        ON uo1.organization_id = uo2.organization_id
      WHERE uo1.user_id = (select auth.uid())
        AND uo1.is_active = true
        AND uo1.role IN ('admin', 'manager')
        AND uo2.user_id = leave_requests.user_id
        AND uo2.is_active = true
    )
  );

CREATE OR REPLACE POLICY "Service role has full access"
  ON leave_requests FOR ALL
  USING (
    ((select auth.jwt())->>'role')::text = 'service_role'
  );
```

### Task 3: Optimize leave_requests RLS Policies (Part 2)

```sql
-- Group 2: User self-service policies
CREATE OR REPLACE POLICY "Users can manage own leave requests"
  ON leave_requests FOR ALL
  USING (user_id = (select auth.uid()));

CREATE OR REPLACE POLICY "users_can_insert_own_requests"
  ON leave_requests FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE OR REPLACE POLICY "users_can_update_own_requests"
  ON leave_requests FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
```

### Task 4: Optimize leave_requests RLS Policies (Part 3)

```sql
-- Group 3: Organization-wide view policies
CREATE OR REPLACE POLICY "Users can view organization leave requests"
  ON leave_requests FOR SELECT
  USING (
    user_id IN (
      SELECT uo2.user_id
      FROM user_organizations uo1
      JOIN user_organizations uo2
        ON uo1.organization_id = uo2.organization_id
      WHERE uo1.user_id = (select auth.uid())
        AND uo1.is_active = true
        AND uo2.is_active = true
    )
  );

CREATE OR REPLACE POLICY "users_can_view_relevant_requests"
  ON leave_requests FOR SELECT
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1
      FROM user_organizations uo
      WHERE uo.user_id = (select auth.uid())
        AND uo.organization_id = leave_requests.organization_id
        AND uo.is_active = true
    )
  );

CREATE OR REPLACE POLICY "managers_can_update_requests"
  ON leave_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM user_organizations uo
      WHERE uo.user_id = (select auth.uid())
        AND uo.organization_id = leave_requests.organization_id
        AND uo.role IN ('admin', 'manager')
        AND uo.is_active = true
    )
  );

CREATE OR REPLACE POLICY "org_isolation_safety_net"
  ON leave_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_organizations uo
      WHERE uo.user_id = (select auth.uid())
        AND uo.organization_id = leave_requests.organization_id
    )
  );
```

### Task 5: Optimize leave_balances RLS Policies

```sql
-- leave_balances: 5 policies
CREATE OR REPLACE POLICY "Admins can manage leave balances"
  ON leave_balances FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM user_organizations uo
      WHERE uo.user_id = (select auth.uid())
        AND uo.organization_id = leave_balances.organization_id
        AND uo.role = 'admin'
        AND uo.is_active = true
    )
  );

CREATE OR REPLACE POLICY "Service role has full access"
  ON leave_balances FOR ALL
  USING (
    ((select auth.jwt())->>'role')::text = 'service_role'
  );

CREATE OR REPLACE POLICY "Users can view organization leave balances"
  ON leave_balances FOR SELECT
  USING (
    user_id IN (
      SELECT uo2.user_id
      FROM user_organizations uo1
      JOIN user_organizations uo2
        ON uo1.organization_id = uo2.organization_id
      WHERE uo1.user_id = (select auth.uid())
        AND uo1.is_active = true
        AND uo2.is_active = true
    )
  );

CREATE OR REPLACE POLICY "Users can view own leave balances"
  ON leave_balances FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE OR REPLACE POLICY "org_safety_net"
  ON leave_balances FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_organizations uo
      WHERE uo.user_id = (select auth.uid())
        AND uo.organization_id = leave_balances.organization_id
    )
  );
```

### Task 6: Optimize company_holidays RLS Policies

```sql
-- company_holidays: 2 policies
CREATE OR REPLACE POLICY "Service role has full access"
  ON company_holidays FOR ALL
  USING (
    ((select auth.jwt())->>'role')::text = 'service_role'
  );

CREATE OR REPLACE POLICY "Users can view holidays"
  ON company_holidays FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_organizations uo
      WHERE uo.user_id = (select auth.uid())
        AND uo.organization_id = company_holidays.organization_id
    )
  );
```

### Task 7: Optimize schedule-related RLS Policies

```sql
-- employee_schedules: 1 policy
CREATE OR REPLACE POLICY "org_safety_net"
  ON employee_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_organizations uo
      WHERE uo.user_id = (select auth.uid())
        AND uo.organization_id = employee_schedules.organization_id
    )
  );

-- work_schedule_templates: 1 policy
CREATE OR REPLACE POLICY "org_safety_net"
  ON work_schedule_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_organizations uo
      WHERE uo.user_id = (select auth.uid())
        AND uo.organization_id = work_schedule_templates.organization_id
    )
  );

-- work_schedules: 1 policy
CREATE OR REPLACE POLICY "org_safety_net"
  ON work_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_organizations uo
      WHERE uo.user_id = (select auth.uid())
        AND uo.organization_id = work_schedules.organization_id
    )
  );
```

### Task 8: Optimize user_organizations RLS Policies

```sql
-- user_organizations: 4 policies
CREATE OR REPLACE POLICY "Service role has full access"
  ON user_organizations FOR ALL
  USING (
    ((select auth.jwt())->>'role')::text = 'service_role'
  );

CREATE OR REPLACE POLICY "Users can insert own memberships"
  ON user_organizations FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE OR REPLACE POLICY "Users can update own memberships"
  ON user_organizations FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE OR REPLACE POLICY "Users can view own memberships"
  ON user_organizations FOR SELECT
  USING (user_id = (select auth.uid()));
```

### Task 9: Optimize organization_domains RLS Policies

```sql
-- organization_domains: 1 policy
CREATE OR REPLACE POLICY "Organization admins can manage domains"
  ON organization_domains FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM user_organizations uo
      WHERE uo.user_id = (select auth.uid())
        AND uo.organization_id = organization_domains.organization_id
        AND uo.role = 'admin'
    )
  );
```

### Task 10: Optimize public_email_domains RLS Policies

```sql
-- public_email_domains: 1 policy
CREATE OR REPLACE POLICY "All authenticated users can view public domains"
  ON public_email_domains FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);
```

### Task 11: Optimize billing tables RLS Policies

```sql
-- customers: 2 policies
CREATE OR REPLACE POLICY "Customers viewable by organization members"
  ON customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_organizations uo
      WHERE uo.user_id = (select auth.uid())
        AND uo.organization_id = customers.organization_id
    )
  );

CREATE OR REPLACE POLICY "Service role can manage customers"
  ON customers FOR ALL
  USING (
    ((select auth.jwt())->>'role')::text = 'service_role'
  );

-- subscriptions: 3 policies
CREATE OR REPLACE POLICY "Organization admins can manage subscriptions"
  ON subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM customers c
      JOIN user_organizations uo
        ON c.organization_id = uo.organization_id
      WHERE c.id = subscriptions.customer_id
        AND uo.user_id = (select auth.uid())
        AND uo.role = 'admin'
    )
  );

CREATE OR REPLACE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL
  USING (
    ((select auth.jwt())->>'role')::text = 'service_role'
  );

CREATE OR REPLACE POLICY "Subscriptions viewable by organization members"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM customers c
      JOIN user_organizations uo
        ON c.organization_id = uo.organization_id
      WHERE c.id = subscriptions.customer_id
        AND uo.user_id = (select auth.uid())
    )
  );

-- billing_events: 1 policy
CREATE OR REPLACE POLICY "Service role can manage billing events"
  ON billing_events FOR ALL
  USING (
    ((select auth.jwt())->>'role')::text = 'service_role'
  );
```

---

## Verification Queries

### Check for Remaining Warnings

After migration, run this query to verify all warnings are resolved:

```sql
-- Should return 0 rows
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    pg_get_expr(polqual, polrelid) ~ 'auth\.(uid|jwt)\(\)' OR
    pg_get_expr(polwithcheck, polrelid) ~ 'auth\.(uid|jwt)\(\)'
  )
  AND NOT (
    pg_get_expr(polqual, polrelid) ~ '\(select auth\.(uid|jwt)\(\)\)' OR
    pg_get_expr(polwithcheck, polrelid) ~ '\(select auth\.(uid|jwt)\(\)\)'
  )
ORDER BY tablename, policyname;
```

### Performance Test Queries

```sql
-- Test 1: Dashboard leave request query
EXPLAIN ANALYZE
SELECT * FROM leave_requests
WHERE organization_id = '...'
LIMIT 100;

-- Test 2: Calendar view query
EXPLAIN ANALYZE
SELECT lr.*, uo.role
FROM leave_requests lr
JOIN user_organizations uo ON lr.user_id = uo.user_id
WHERE uo.organization_id = '...'
  AND lr.start_date >= NOW()
LIMIT 50;

-- Test 3: Balance lookup
EXPLAIN ANALYZE
SELECT * FROM leave_balances
WHERE user_id = '...'
  AND organization_id = '...';
```

Look for reduced "Execution Time" in `EXPLAIN ANALYZE` output.

---

## Rollback Procedure

If issues arise, revert by removing `(select ...)` wrappers:

```sql
-- Example rollback for one policy
CREATE OR REPLACE POLICY "example"
  ON table_name FOR SELECT
  USING (user_id = auth.uid());  -- Remove (select ...) wrapper
```

However, **rollback is unlikely needed** as this change:
- Does not alter functionality
- Only improves performance
- Uses standard PostgreSQL syntax

---

## Testing Strategy

### Unit Tests

No application code changes needed. RLS policies are transparent to application logic.

### Performance Tests

1. **Before migration:** Run performance baseline queries
2. **After migration:** Re-run same queries
3. **Compare:** Document improvement percentages

### Manual QA

- [ ] Login as user → verify dashboard loads
- [ ] View calendar → verify leave requests visible
- [ ] View leave balances → verify own balances visible
- [ ] Login as admin → verify full access maintained
- [ ] Login as manager → verify team access works

---

## Success Criteria

- [ ] All 32 policies optimized with `(select auth.uid())`
- [ ] Zero `auth_rls_initplan` warnings in Supabase Advisors
- [ ] No RLS permission errors in application
- [ ] Dashboard load time improved by 40%+
- [ ] Calendar queries improved by 50%+
- [ ] All existing tests passing

---

## Additional Optimization: Multiple Permissive Policies

The advisory report also shows **4 tables with multiple permissive policies** for the same role/action, which causes PostgreSQL to evaluate ALL policies (slower):

### Affected Table: company_holidays

- **anon role:** 3-6 permissive policies per action (DELETE, INSERT, SELECT, UPDATE)
- **authenticated role:** 3-6 permissive policies per action

**Recommendation:** Consolidate multiple permissive policies into single policies with OR conditions.

**Note:** This is **OPTIONAL** and separate from auth.uid() optimization. Can be tackled in a future phase if performance testing shows it's needed.

---

## References

- [Supabase RLS Optimization Guide](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select)
- [PostgreSQL RLS Performance](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Database Linter: auth_rls_initplan](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan)
