-- Fix infinite recursion in user_organizations RLS policies
-- The previous policies were causing infinite loops by referencing the same table they're protecting

BEGIN;

-- DROP the problematic recursive policies on user_organizations
DROP POLICY IF EXISTS "Users can view own organizations" ON public.user_organizations;
DROP POLICY IF EXISTS "Users can view organization members" ON public.user_organizations;

-- CREATE simple, non-recursive policies for user_organizations

-- Policy 1: Users can see their own organization memberships
CREATE POLICY "Users can view own user_organizations" ON public.user_organizations
  FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Service role has full access (for admin operations)  
-- (This policy already exists, but let's make sure)
DROP POLICY IF EXISTS "Service role has full access" ON public.user_organizations;
CREATE POLICY "Service role has full access" ON public.user_organizations
  FOR ALL USING (auth.role() = 'service_role');

-- Policy 3: Users can insert/update their own records (for signup/invitation acceptance)
CREATE POLICY "Users can manage own user_organizations" ON public.user_organizations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own user_organizations" ON public.user_organizations
  FOR UPDATE USING (auth.uid() = user_id);

-- Fix other policies that might reference user_organizations recursively

-- ORGANIZATIONS table - simplify the policy
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
CREATE POLICY "Users can view their organizations" ON public.organizations
  FOR SELECT USING (
    -- This is safe because we're not querying user_organizations recursively
    EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.organization_id = organizations.id
      AND uo.user_id = auth.uid()
      AND uo.is_active = true
    )
  );

-- TEAMS table - simplify the policy  
DROP POLICY IF EXISTS "Users can view organization teams" ON public.teams;
CREATE POLICY "Users can view organization teams" ON public.teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.organization_id = teams.organization_id
      AND uo.user_id = auth.uid()
      AND uo.is_active = true
    )
  );

-- LEAVE_REQUESTS table - fix the recursive policy
DROP POLICY IF EXISTS "Users can view organization leave requests" ON public.leave_requests;
CREATE POLICY "Users can view organization leave requests" ON public.leave_requests
  FOR SELECT USING (
    -- Users can see leave requests from people in their organization
    EXISTS (
      SELECT 1 FROM public.user_organizations uo1, public.user_organizations uo2
      WHERE uo1.user_id = auth.uid()
      AND uo1.is_active = true
      AND uo2.user_id = leave_requests.user_id
      AND uo2.is_active = true
      AND uo1.organization_id = uo2.organization_id
    )
  );

-- LEAVE_BALANCES table - fix the recursive policy
DROP POLICY IF EXISTS "Users can view organization leave balances" ON public.leave_balances;
CREATE POLICY "Users can view organization leave balances" ON public.leave_balances
  FOR SELECT USING (
    -- Users can see balances from people in their organization
    EXISTS (
      SELECT 1 FROM public.user_organizations uo1, public.user_organizations uo2
      WHERE uo1.user_id = auth.uid()
      AND uo1.is_active = true
      AND uo2.user_id = leave_balances.user_id
      AND uo2.is_active = true
      AND uo1.organization_id = uo2.organization_id
    )
  );

-- LEAVE_TYPES table - simplify
DROP POLICY IF EXISTS "Users can view organization leave types" ON public.leave_types;
CREATE POLICY "Users can view organization leave types" ON public.leave_types
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.organization_id = leave_types.organization_id
      AND uo.user_id = auth.uid()
      AND uo.is_active = true
    )
  );

-- COMPANY_HOLIDAYS table - simplify
DROP POLICY IF EXISTS "Users can view organization holidays" ON public.company_holidays;
CREATE POLICY "Users can view organization holidays" ON public.company_holidays
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.organization_id = company_holidays.organization_id
      AND uo.user_id = auth.uid()
      AND uo.is_active = true
    )
  );

-- INVITATIONS table - fix the policy
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;
CREATE POLICY "Admins can manage invitations" ON public.invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_organizations uo
      WHERE uo.organization_id = invitations.organization_id
      AND uo.user_id = auth.uid()
      AND uo.is_active = true
      AND uo.role = 'admin'
    )
  );

COMMIT;

-- Test that policies work without recursion
SELECT 'RLS policies updated - testing basic query...';

-- This should work without infinite recursion
SELECT COUNT(*) as user_org_count 
FROM public.user_organizations 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);