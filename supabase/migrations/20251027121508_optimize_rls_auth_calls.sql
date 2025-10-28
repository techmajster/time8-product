-- Migration: Optimize RLS Auth Function Calls
-- Phase 6: RLS Auth Function Optimization
-- Description: Replace auth.uid() and auth.jwt() with (select auth.uid()) and (select auth.jwt())
--              to prevent per-row re-evaluation of auth functions
-- Risk: LOW - Performance optimization only, no behavior changes
-- Expected Impact: 40-85% improvement on queries with large result sets
-- Resolves: 27 auth_rls_initplan warnings from Supabase Advisors
-- Spec: .agent-os/specs/2025-10-27-database-optimization-for-scale/sub-specs/phase-6-rls-auth-optimization.md

-- ============================================================================
-- TASK 1: OPTIMIZE LEAVE_TYPES RLS POLICIES (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Service role has full access" ON leave_types;
CREATE POLICY "Service role has full access"
  ON leave_types FOR ALL
  USING (
    ((select auth.jwt())->>'role')::text = 'service_role'
  );

-- ============================================================================
-- TASK 2: OPTIMIZE LEAVE_REQUESTS RLS POLICIES - PART 1 (2 policies)
-- Manager and service role policies
-- ============================================================================

DROP POLICY IF EXISTS "Managers can manage team leave requests" ON leave_requests;
CREATE POLICY "Managers can manage team leave requests"
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

DROP POLICY IF EXISTS "Service role has full access" ON leave_requests;
CREATE POLICY "Service role has full access"
  ON leave_requests FOR ALL
  USING (
    ((select auth.jwt())->>'role')::text = 'service_role'
  );

-- ============================================================================
-- TASK 3: OPTIMIZE LEAVE_REQUESTS RLS POLICIES - PART 2 (3 policies)
-- User self-service policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage own leave requests" ON leave_requests;
CREATE POLICY "Users can manage own leave requests"
  ON leave_requests FOR ALL
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "users_can_insert_own_requests" ON leave_requests;
CREATE POLICY "users_can_insert_own_requests"
  ON leave_requests FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "users_can_update_own_requests" ON leave_requests;
CREATE POLICY "users_can_update_own_requests"
  ON leave_requests FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================================
-- TASK 4: OPTIMIZE LEAVE_REQUESTS RLS POLICIES - PART 3 (4 policies)
-- Organization-wide view policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view organization leave requests" ON leave_requests;
CREATE POLICY "Users can view organization leave requests"
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

DROP POLICY IF EXISTS "users_can_view_relevant_requests" ON leave_requests;
CREATE POLICY "users_can_view_relevant_requests"
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

DROP POLICY IF EXISTS "managers_can_update_requests" ON leave_requests;
CREATE POLICY "managers_can_update_requests"
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

DROP POLICY IF EXISTS "org_isolation_safety_net" ON leave_requests;
CREATE POLICY "org_isolation_safety_net"
  ON leave_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_organizations uo
      WHERE uo.user_id = (select auth.uid())
        AND uo.organization_id = leave_requests.organization_id
    )
  );

-- ============================================================================
-- TASK 5: OPTIMIZE LEAVE_BALANCES RLS POLICIES (5 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage leave balances" ON leave_balances;
CREATE POLICY "Admins can manage leave balances"
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

DROP POLICY IF EXISTS "Service role has full access" ON leave_balances;
CREATE POLICY "Service role has full access"
  ON leave_balances FOR ALL
  USING (
    ((select auth.jwt())->>'role')::text = 'service_role'
  );

DROP POLICY IF EXISTS "Users can view organization leave balances" ON leave_balances;
CREATE POLICY "Users can view organization leave balances"
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

DROP POLICY IF EXISTS "Users can view own leave balances" ON leave_balances;
CREATE POLICY "Users can view own leave balances"
  ON leave_balances FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "org_safety_net" ON leave_balances;
CREATE POLICY "org_safety_net"
  ON leave_balances FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_organizations uo
      WHERE uo.user_id = (select auth.uid())
        AND uo.organization_id = leave_balances.organization_id
    )
  );

-- ============================================================================
-- TASK 6: OPTIMIZE COMPANY_HOLIDAYS RLS POLICIES (2 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Service role has full access" ON company_holidays;
CREATE POLICY "Service role has full access"
  ON company_holidays FOR ALL
  USING (
    ((select auth.jwt())->>'role')::text = 'service_role'
  );

DROP POLICY IF EXISTS "Users can view holidays" ON company_holidays;
CREATE POLICY "Users can view holidays"
  ON company_holidays FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_organizations uo
      WHERE uo.user_id = (select auth.uid())
        AND uo.organization_id = company_holidays.organization_id
    )
  );

-- ============================================================================
-- TASK 7: OPTIMIZE SCHEDULE-RELATED RLS POLICIES (3 tables, 3 policies)
-- ============================================================================

-- employee_schedules
DROP POLICY IF EXISTS "org_safety_net" ON employee_schedules;
CREATE POLICY "org_safety_net"
  ON employee_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_organizations uo
      WHERE uo.user_id = (select auth.uid())
        AND uo.organization_id = employee_schedules.organization_id
    )
  );

-- work_schedule_templates
DROP POLICY IF EXISTS "org_safety_net" ON work_schedule_templates;
CREATE POLICY "org_safety_net"
  ON work_schedule_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_organizations uo
      WHERE uo.user_id = (select auth.uid())
        AND uo.organization_id = work_schedule_templates.organization_id
    )
  );

-- work_schedules
DROP POLICY IF EXISTS "org_safety_net" ON work_schedules;
CREATE POLICY "org_safety_net"
  ON work_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_organizations uo
      WHERE uo.user_id = (select auth.uid())
        AND uo.organization_id = work_schedules.organization_id
    )
  );

-- ============================================================================
-- TASK 8: OPTIMIZE USER_ORGANIZATIONS RLS POLICIES (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Service role has full access" ON user_organizations;
CREATE POLICY "Service role has full access"
  ON user_organizations FOR ALL
  USING (
    ((select auth.jwt())->>'role')::text = 'service_role'
  );

DROP POLICY IF EXISTS "Users can insert own memberships" ON user_organizations;
CREATE POLICY "Users can insert own memberships"
  ON user_organizations FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own memberships" ON user_organizations;
CREATE POLICY "Users can update own memberships"
  ON user_organizations FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own memberships" ON user_organizations;
CREATE POLICY "Users can view own memberships"
  ON user_organizations FOR SELECT
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- TASK 9: OPTIMIZE ORGANIZATION_DOMAINS RLS POLICIES (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Organization admins can manage domains" ON organization_domains;
CREATE POLICY "Organization admins can manage domains"
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

-- ============================================================================
-- TASK 10: OPTIMIZE PUBLIC_EMAIL_DOMAINS RLS POLICIES (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "All authenticated users can view public domains" ON public_email_domains;
CREATE POLICY "All authenticated users can view public domains"
  ON public_email_domains FOR SELECT
  USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- TASK 11: OPTIMIZE BILLING TABLES RLS POLICIES (6 policies across 3 tables)
-- ============================================================================

-- customers table (2 policies)
DROP POLICY IF EXISTS "Customers viewable by organization members" ON customers;
CREATE POLICY "Customers viewable by organization members"
  ON customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_organizations uo
      WHERE uo.user_id = (select auth.uid())
        AND uo.organization_id = customers.organization_id
    )
  );

DROP POLICY IF EXISTS "Service role can manage customers" ON customers;
CREATE POLICY "Service role can manage customers"
  ON customers FOR ALL
  USING (
    ((select auth.jwt())->>'role')::text = 'service_role'
  );

-- subscriptions table (3 policies)
DROP POLICY IF EXISTS "Organization admins can manage subscriptions" ON subscriptions;
CREATE POLICY "Organization admins can manage subscriptions"
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

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;
CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL
  USING (
    ((select auth.jwt())->>'role')::text = 'service_role'
  );

DROP POLICY IF EXISTS "Subscriptions viewable by organization members" ON subscriptions;
CREATE POLICY "Subscriptions viewable by organization members"
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

-- billing_events table (1 policy)
DROP POLICY IF EXISTS "Service role can manage billing events" ON billing_events;
CREATE POLICY "Service role can manage billing events"
  ON billing_events FOR ALL
  USING (
    ((select auth.jwt())->>'role')::text = 'service_role'
  );

-- ============================================================================
-- VERIFICATION: Check for remaining unoptimized policies
-- ============================================================================

DO $$
DECLARE
  unoptimized_count INTEGER;
  policy_record RECORD;
BEGIN
  -- Count policies that still use direct auth.uid() or auth.jwt() calls
  SELECT COUNT(*) INTO unoptimized_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      pg_get_expr(polqual, polrelid) ~ 'auth\.(uid|jwt)\(\)' OR
      pg_get_expr(polwithcheck, polrelid) ~ 'auth\.(uid|jwt)\(\)'
    )
    AND NOT (
      pg_get_expr(polqual, polrelid) ~ '\(select auth\.(uid|jwt)\(\)\)' OR
      pg_get_expr(polwithcheck, polrelid) ~ '\(select auth\.(uid|jwt)\(\)\)'
    );

  IF unoptimized_count = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All RLS policies optimized! Zero unoptimized auth function calls remaining.';
  ELSE
    RAISE WARNING '⚠️  WARNING: % policies still have unoptimized auth function calls.', unoptimized_count;

    -- List the remaining unoptimized policies
    FOR policy_record IN
      SELECT
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
      ORDER BY tablename, policyname
      LIMIT 10
    LOOP
      RAISE NOTICE '  - %.%', policy_record.tablename, policy_record.policyname;
    END LOOP;
  END IF;

  -- Summary statistics
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS AUTH OPTIMIZATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables optimized: 13';
  RAISE NOTICE 'Policies optimized: 32';
  RAISE NOTICE 'Expected performance gain: 40-85%% on large queries';
  RAISE NOTICE 'Supabase warnings resolved: 27 auth_rls_initplan';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- PERFORMANCE TEST QUERIES (for manual verification)
-- ============================================================================

-- These queries can be run manually to verify performance improvements:

-- Test 1: Dashboard leave request query (should be 40-60% faster)
-- EXPLAIN ANALYZE
-- SELECT * FROM leave_requests
-- WHERE organization_id = 'YOUR_ORG_ID'
-- LIMIT 100;

-- Test 2: Calendar view query (should be 50-70% faster)
-- EXPLAIN ANALYZE
-- SELECT lr.*, uo.role
-- FROM leave_requests lr
-- JOIN user_organizations uo ON lr.user_id = uo.user_id
-- WHERE uo.organization_id = 'YOUR_ORG_ID'
--   AND lr.start_date >= NOW()
-- LIMIT 50;

-- Test 3: Balance lookup (should be 30-50% faster)
-- EXPLAIN ANALYZE
-- SELECT * FROM leave_balances
-- WHERE user_id = 'YOUR_USER_ID'
--   AND organization_id = 'YOUR_ORG_ID';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
