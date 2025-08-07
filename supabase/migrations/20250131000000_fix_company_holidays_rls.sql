-- Fix company_holidays RLS policies to use user_organizations table
-- This migration updates the RLS policies to work with our multi-organization structure

-- Drop existing policies that reference the old profiles structure
DROP POLICY IF EXISTS "Users can view holidays" ON company_holidays;
DROP POLICY IF EXISTS "Admins can manage holidays" ON company_holidays;

-- MULTI-ORG UPDATE: Create new policies that use user_organizations table

-- Users can view holidays in their organization and national holidays
CREATE POLICY "Users can view holidays" ON company_holidays
  FOR SELECT USING (
    -- National holidays (visible to everyone)
    (type = 'national' AND organization_id IS NULL)
    OR
    -- Organization-specific holidays (visible to organization members)
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_organizations 
      WHERE user_organizations.user_id = auth.uid() 
      AND user_organizations.organization_id = company_holidays.organization_id
      AND user_organizations.is_active = true
    ))
  );

-- Admins can manage all types of holidays for their organization
CREATE POLICY "Admins can manage holidays" ON company_holidays
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_organizations 
      WHERE user_organizations.user_id = auth.uid() 
      AND user_organizations.organization_id = company_holidays.organization_id
      AND user_organizations.role = 'admin'
      AND user_organizations.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organizations 
      WHERE user_organizations.user_id = auth.uid() 
      AND user_organizations.organization_id = company_holidays.organization_id
      AND user_organizations.role = 'admin'
      AND user_organizations.is_active = true
    )
  );

-- Add helpful comments
COMMENT ON POLICY "Users can view holidays" ON company_holidays IS 
'Users can view national holidays and holidays for organizations they belong to (using user_organizations table)';

COMMENT ON POLICY "Admins can manage holidays" ON company_holidays IS 
'Organization admins can create, update, and delete holidays for their organization (using user_organizations table)'; 