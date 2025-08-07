-- =====================================================================================
-- FIX LEAVE_TYPES RLS POLICIES FOR MULTI-ORGANIZATION SUPPORT
-- =====================================================================================

-- Drop any existing leave_types RLS policies that might be blocking admin access
DROP POLICY IF EXISTS "Users can view their organization leave types" ON leave_types;
DROP POLICY IF EXISTS "Admins can manage leave types" ON leave_types;
DROP POLICY IF EXISTS "Organization members can view leave types" ON leave_types;
DROP POLICY IF EXISTS "Only admins can manage leave types" ON leave_types;

-- Create new multi-org compatible policies for leave_types
CREATE POLICY "Users can view leave types in their organizations"
  ON leave_types FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = leave_types.organization_id
        AND uo.is_active = true
    )
  );

CREATE POLICY "Admins can manage leave types in their organizations"
  ON leave_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = leave_types.organization_id
        AND uo.role = 'admin'
        AND uo.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = leave_types.organization_id
        AND uo.role = 'admin'
        AND uo.is_active = true
    )
  ); 