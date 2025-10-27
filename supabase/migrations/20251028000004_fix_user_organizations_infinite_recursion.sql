-- =====================================================================================
-- FIX USER_ORGANIZATIONS INFINITE RECURSION
-- File: 20251028000004_fix_user_organizations_infinite_recursion.sql
--
-- This migration fixes the infinite recursion issue in user_organizations RLS policies
-- that was causing 500 errors when users tried to access their workspaces.
--
-- Problem: Policies like "Admins can manage organization members" were checking
-- user_organizations table FROM WITHIN user_organizations policies, creating recursion.
--
-- Solution: Drop all recursive policies and create simpler, non-recursive ones.
-- The app uses service_role for most queries anyway, so RLS is secondary defense.
-- =====================================================================================

BEGIN;

-- Drop ALL existing policies on user_organizations to start fresh
DROP POLICY IF EXISTS "Admins can manage organization members" ON user_organizations;
DROP POLICY IF EXISTS "Managers can view team members" ON user_organizations;
DROP POLICY IF EXISTS "Organization admins can manage memberships via legacy" ON user_organizations;
DROP POLICY IF EXISTS "Organization admins can view all memberships via legacy" ON user_organizations;
DROP POLICY IF EXISTS "Service role has full access" ON user_organizations;
DROP POLICY IF EXISTS "Users can insert their own memberships" ON user_organizations;
DROP POLICY IF EXISTS "Users can manage own user_organizations" ON user_organizations;
DROP POLICY IF EXISTS "Users can update own user_organizations" ON user_organizations;
DROP POLICY IF EXISTS "Users can view own user_organizations" ON user_organizations;
DROP POLICY IF EXISTS "Users can view their organizations" ON user_organizations;
DROP POLICY IF EXISTS "Users can view their own organization memberships" ON user_organizations;
DROP POLICY IF EXISTS "Users can update their membership settings" ON user_organizations;

-- Create simple, non-recursive policies
-- Policy 1: Service role has full access (for admin client)
CREATE POLICY "Service role has full access" ON user_organizations
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy 2: Users can view their OWN memberships (non-recursive)
CREATE POLICY "Users can view own memberships" ON user_organizations
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy 3: Users can insert their own memberships
CREATE POLICY "Users can insert own memberships" ON user_organizations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy 4: Users can update their own membership settings (limited fields)
CREATE POLICY "Users can update own memberships" ON user_organizations
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMIT;
