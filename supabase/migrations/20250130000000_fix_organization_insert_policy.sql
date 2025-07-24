-- Fix organization creation by adding missing INSERT policy
-- This migration adds the missing RLS policy that allows authenticated users to create organizations

-- First, let's make sure RLS is enabled on organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Add INSERT policy to allow authenticated users to create organizations
-- This is needed for the onboarding flow where users create their first organization
CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add comment explaining the policy
COMMENT ON POLICY "Authenticated users can create organizations" ON organizations IS 
'Allows any authenticated user to create a new organization during onboarding. User becomes admin of their organization through profile update.'; 