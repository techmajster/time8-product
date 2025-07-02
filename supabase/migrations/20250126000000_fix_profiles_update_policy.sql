-- Fix profiles table UPDATE policy to allow admins and managers to update other users' roles
-- Currently users can only update their own profiles, but we need admins/managers to update team member roles

-- Drop the existing restrictive UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

-- Create new policy that allows:
-- 1. Users to update their own profile
-- 2. Admins and managers to update profiles of users in their organization
CREATE POLICY "Users can update profiles" ON profiles FOR UPDATE USING (
  -- Users can update their own profile
  auth.uid() = id
  OR
  -- Admins and managers can update other users' profiles in their organization
  EXISTS (
    SELECT 1 FROM profiles updater, profiles target
    WHERE updater.id = auth.uid() 
    AND target.id = profiles.id
    AND updater.organization_id = target.organization_id
    AND updater.role IN ('admin', 'manager')
    -- Additional restriction: managers cannot update admin roles
    AND (updater.role = 'admin' OR target.role != 'admin')
  )
);

-- Add comment explaining the policy
COMMENT ON POLICY "Users can update profiles" ON profiles IS 
'Allows users to update their own profile, and allows admins/managers to update team member profiles within their organization. Managers cannot update admin profiles.'; 