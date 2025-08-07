-- Enable RLS and add multi-organization policies
-- This migration fixes the critical security issue where RLS was disabled on all tables

BEGIN;

-- 1. ENABLE RLS ON ALL TABLES
-- ============================

-- User & Organization tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Leave management tables
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;

-- 2. CREATE RLS POLICIES
-- ======================

-- PROFILES TABLE
-- Users can only see/update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Service role can manage all profiles (for admin operations)
DROP POLICY IF EXISTS "Service role has full access" ON public.profiles;
CREATE POLICY "Service role has full access" ON public.profiles
  FOR ALL USING (auth.role() = 'service_role');

-- USER_ORGANIZATIONS TABLE
-- Users can see their own organization memberships
DROP POLICY IF EXISTS "Users can view own organizations" ON public.user_organizations;
CREATE POLICY "Users can view own organizations" ON public.user_organizations
  FOR SELECT USING (auth.uid() = user_id);

-- Users can see other members in their organizations
DROP POLICY IF EXISTS "Users can view organization members" ON public.user_organizations;
CREATE POLICY "Users can view organization members" ON public.user_organizations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Service role full access
DROP POLICY IF EXISTS "Service role has full access" ON public.user_organizations;
CREATE POLICY "Service role has full access" ON public.user_organizations
  FOR ALL USING (auth.role() = 'service_role');

-- ORGANIZATIONS TABLE
-- Users can view organizations they belong to
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
CREATE POLICY "Users can view their organizations" ON public.organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Service role full access
DROP POLICY IF EXISTS "Service role has full access" ON public.organizations;
CREATE POLICY "Service role has full access" ON public.organizations
  FOR ALL USING (auth.role() = 'service_role');

-- TEAMS TABLE
-- Users can view teams in their organization
DROP POLICY IF EXISTS "Users can view organization teams" ON public.teams;
CREATE POLICY "Users can view organization teams" ON public.teams
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Managers and admins can manage teams
DROP POLICY IF EXISTS "Managers can manage teams" ON public.teams;
CREATE POLICY "Managers can manage teams" ON public.teams
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND role IN ('admin', 'manager')
    )
  );

-- Service role full access
DROP POLICY IF EXISTS "Service role has full access" ON public.teams;
CREATE POLICY "Service role has full access" ON public.teams
  FOR ALL USING (auth.role() = 'service_role');

-- INVITATIONS TABLE
-- Admins can manage invitations for their organization
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;
CREATE POLICY "Admins can manage invitations" ON public.invitations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND role = 'admin'
    )
  );

-- Users can view their own invitations
DROP POLICY IF EXISTS "Users can view own invitations" ON public.invitations;
CREATE POLICY "Users can view own invitations" ON public.invitations
  FOR SELECT USING (
    LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Service role full access
DROP POLICY IF EXISTS "Service role has full access" ON public.invitations;
CREATE POLICY "Service role has full access" ON public.invitations
  FOR ALL USING (auth.role() = 'service_role');

-- LEAVE_REQUESTS TABLE
-- Users can view leave requests in their organization
DROP POLICY IF EXISTS "Users can view organization leave requests" ON public.leave_requests;
CREATE POLICY "Users can view organization leave requests" ON public.leave_requests
  FOR SELECT USING (
    user_id IN (
      SELECT uo.user_id 
      FROM public.user_organizations uo
      WHERE uo.organization_id IN (
        SELECT organization_id 
        FROM public.user_organizations 
        WHERE user_id = auth.uid() 
        AND is_active = true
      )
      AND uo.is_active = true
    )
  );

-- Users can manage their own leave requests
DROP POLICY IF EXISTS "Users can manage own leave requests" ON public.leave_requests;
CREATE POLICY "Users can manage own leave requests" ON public.leave_requests
  FOR ALL USING (user_id = auth.uid());

-- Managers can manage team leave requests
DROP POLICY IF EXISTS "Managers can manage team leave requests" ON public.leave_requests;
CREATE POLICY "Managers can manage team leave requests" ON public.leave_requests
  FOR ALL USING (
    user_id IN (
      SELECT uo.user_id
      FROM public.user_organizations uo
      JOIN public.user_organizations manager_uo ON manager_uo.organization_id = uo.organization_id
      WHERE manager_uo.user_id = auth.uid()
      AND manager_uo.is_active = true
      AND manager_uo.role IN ('admin', 'manager')
      AND uo.is_active = true
      AND (
        -- Admin can manage all
        manager_uo.role = 'admin'
        OR
        -- Manager can manage their team
        (manager_uo.role = 'manager' AND uo.team_id = manager_uo.team_id)
      )
    )
  );

-- Service role full access
DROP POLICY IF EXISTS "Service role has full access" ON public.leave_requests;
CREATE POLICY "Service role has full access" ON public.leave_requests
  FOR ALL USING (auth.role() = 'service_role');

-- LEAVE_BALANCES TABLE
-- Users can view balances in their organization
DROP POLICY IF EXISTS "Users can view organization leave balances" ON public.leave_balances;
CREATE POLICY "Users can view organization leave balances" ON public.leave_balances
  FOR SELECT USING (
    user_id IN (
      SELECT uo.user_id 
      FROM public.user_organizations uo
      WHERE uo.organization_id IN (
        SELECT organization_id 
        FROM public.user_organizations 
        WHERE user_id = auth.uid() 
        AND is_active = true
      )
      AND uo.is_active = true
    )
  );

-- Users can view their own balances
DROP POLICY IF EXISTS "Users can view own leave balances" ON public.leave_balances;
CREATE POLICY "Users can view own leave balances" ON public.leave_balances
  FOR SELECT USING (user_id = auth.uid());

-- Admins can manage leave balances
DROP POLICY IF EXISTS "Admins can manage leave balances" ON public.leave_balances;
CREATE POLICY "Admins can manage leave balances" ON public.leave_balances
  FOR ALL USING (
    user_id IN (
      SELECT uo.user_id
      FROM public.user_organizations uo
      WHERE uo.organization_id IN (
        SELECT organization_id 
        FROM public.user_organizations 
        WHERE user_id = auth.uid() 
        AND is_active = true
        AND role = 'admin'
      )
      AND uo.is_active = true
    )
  );

-- Service role full access
DROP POLICY IF EXISTS "Service role has full access" ON public.leave_balances;
CREATE POLICY "Service role has full access" ON public.leave_balances
  FOR ALL USING (auth.role() = 'service_role');

-- LEAVE_TYPES TABLE
-- Users can view leave types in their organization
DROP POLICY IF EXISTS "Users can view organization leave types" ON public.leave_types;
CREATE POLICY "Users can view organization leave types" ON public.leave_types
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Admins can manage leave types
DROP POLICY IF EXISTS "Admins can manage leave types" ON public.leave_types;
CREATE POLICY "Admins can manage leave types" ON public.leave_types
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND role = 'admin'
    )
  );

-- Service role full access
DROP POLICY IF EXISTS "Service role has full access" ON public.leave_types;
CREATE POLICY "Service role has full access" ON public.leave_types
  FOR ALL USING (auth.role() = 'service_role');

-- COMPANY_HOLIDAYS TABLE
-- Users can view holidays in their organization
DROP POLICY IF EXISTS "Users can view organization holidays" ON public.company_holidays;
CREATE POLICY "Users can view organization holidays" ON public.company_holidays
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Admins can manage holidays
DROP POLICY IF EXISTS "Admins can manage holidays" ON public.company_holidays;
CREATE POLICY "Admins can manage holidays" ON public.company_holidays
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND role = 'admin'
    )
  );

-- Service role full access
DROP POLICY IF EXISTS "Service role has full access" ON public.company_holidays;
CREATE POLICY "Service role has full access" ON public.company_holidays
  FOR ALL USING (auth.role() = 'service_role');

COMMIT;

-- Verify RLS is enabled
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'organizations', 'user_organizations', 'teams', 
    'invitations', 'leave_requests', 'leave_balances', 
    'leave_types', 'company_holidays'
  )
ORDER BY tablename;