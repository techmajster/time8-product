-- Optimize RLS policies for better performance
-- Based on the RLS audit report findings

BEGIN;

-- ============================
-- STEP 1: ADD CRITICAL INDEXES
-- ============================

-- User organizations lookup (most critical)
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_org_active 
  ON user_organizations(user_id, organization_id, is_active);

-- Leave requests - critical for RLS performance  
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id 
  ON leave_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_leave_requests_user_status_date 
  ON leave_requests(user_id, status, start_date);

-- Leave balances
CREATE INDEX IF NOT EXISTS idx_leave_balances_user_id 
  ON leave_balances(user_id);

CREATE INDEX IF NOT EXISTS idx_leave_balances_user_type 
  ON leave_balances(user_id, leave_type);

-- Organization-scoped table indexes
CREATE INDEX IF NOT EXISTS idx_teams_organization_id 
  ON teams(organization_id);

CREATE INDEX IF NOT EXISTS idx_invitations_organization_id 
  ON invitations(organization_id);

CREATE INDEX IF NOT EXISTS idx_leave_types_organization_id 
  ON leave_types(organization_id);

CREATE INDEX IF NOT EXISTS idx_company_holidays_organization_id 
  ON company_holidays(organization_id);

-- Email lookup optimization
CREATE INDEX IF NOT EXISTS idx_invitations_email_lower 
  ON invitations(LOWER(email));

-- Additional performance indexes from database-schema.md
CREATE INDEX IF NOT EXISTS idx_leave_requests_org_status_date 
  ON leave_requests(user_id, status, start_date) 
  WHERE status IN ('approved', 'pending');

CREATE INDEX IF NOT EXISTS idx_organization_members_org_role 
  ON user_organizations(organization_id, role) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_leave_requests_org_date_range 
  ON leave_requests(user_id, start_date, end_date);

-- ============================
-- STEP 2: OPTIMIZE RLS POLICIES
-- ============================

-- LEAVE_REQUESTS table - optimize the cross-join policy
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

-- Optimize the manager policy to be more efficient
DROP POLICY IF EXISTS "Managers can manage team leave requests" ON public.leave_requests;
CREATE POLICY "Managers can manage team leave requests" ON public.leave_requests
  FOR ALL USING (
    -- Check if the current user is admin/manager and has access to this leave request's user
    EXISTS (
      SELECT 1 
      FROM public.user_organizations current_user_org
      JOIN public.user_organizations target_user_org ON current_user_org.organization_id = target_user_org.organization_id
      WHERE current_user_org.user_id = auth.uid()
      AND current_user_org.is_active = true
      AND current_user_org.role IN ('admin', 'manager')
      AND target_user_org.user_id = leave_requests.user_id
      AND target_user_org.is_active = true
      AND (
        -- Admin can manage all users in their organization
        current_user_org.role = 'admin'
        OR 
        -- Manager can only manage users in their team
        (current_user_org.role = 'manager' AND current_user_org.team_id = target_user_org.team_id)
      )
    )
  );

-- LEAVE_BALANCES table - optimize the cross-join policy
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

-- Optimize admin access to leave balances  
DROP POLICY IF EXISTS "Admins can manage leave balances" ON public.leave_balances;
CREATE POLICY "Admins can manage leave balances" ON public.leave_balances
  FOR ALL USING (
    EXISTS (
      SELECT 1 
      FROM public.user_organizations admin_org
      JOIN public.user_organizations target_org ON admin_org.organization_id = target_org.organization_id
      WHERE admin_org.user_id = auth.uid()
      AND admin_org.is_active = true
      AND admin_org.role = 'admin'
      AND target_org.user_id = leave_balances.user_id
      AND target_org.is_active = true
    )
  );

-- ============================
-- STEP 3: CREATE HELPER VIEWS FOR COMMON PATTERNS
-- ============================

-- Create a view for user's organization access to reduce policy complexity
CREATE OR REPLACE VIEW user_org_access AS
SELECT DISTINCT
  uo1.user_id as accessing_user_id,
  uo2.user_id as target_user_id,
  uo1.organization_id,
  uo1.role as accessing_user_role,
  uo1.team_id as accessing_user_team,
  uo2.role as target_user_role,
  uo2.team_id as target_user_team
FROM user_organizations uo1
JOIN user_organizations uo2 ON uo1.organization_id = uo2.organization_id
WHERE uo1.is_active = true AND uo2.is_active = true;

-- Grant access to the view
GRANT SELECT ON user_org_access TO authenticated;
GRANT SELECT ON user_org_access TO service_role;

-- ============================
-- STEP 4: CREATE PERFORMANCE MONITORING FUNCTIONS
-- ============================

-- Function to check RLS policy performance
CREATE OR REPLACE FUNCTION check_rls_performance()
RETURNS TABLE (
  table_name text,
  policy_name text,
  avg_execution_time numeric,
  sample_queries_run integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function would analyze query performance in a real implementation
  -- For now, return a placeholder structure
  RETURN QUERY
  SELECT 
    'leave_requests'::text as table_name,
    'optimized_policies'::text as policy_name,
    50.0::numeric as avg_execution_time,
    100::integer as sample_queries_run;
END;
$$;

-- Function to get index usage statistics
CREATE OR REPLACE FUNCTION get_rls_index_usage()
RETURNS TABLE (
  index_name text,
  table_name text,
  idx_scan bigint,
  idx_tup_read bigint,
  idx_tup_fetch bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    indexrelname::text as index_name,
    tablename::text as table_name,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
  FROM pg_stat_user_indexes
  WHERE indexrelname LIKE 'idx_%'
  ORDER BY idx_scan DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_rls_performance() TO service_role;
GRANT EXECUTE ON FUNCTION get_rls_index_usage() TO service_role;

COMMIT;

-- ============================
-- VERIFICATION QUERIES
-- ============================

-- Verify that new indexes were created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE indexname LIKE 'idx_%'
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Check RLS is still enabled on all tables
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'organizations', 'user_organizations', 'teams', 
    'invitations', 'leave_requests', 'leave_balances', 
    'leave_types', 'company_holidays'
  )
ORDER BY tablename;

-- Test basic policy functionality
SELECT 'RLS optimization complete. Test queries can now be run.' as status;