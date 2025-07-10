-- Find Your Organization ID
-- Run this first in Supabase SQL Editor to get your organization ID

SELECT 
  id as organization_id,
  name as organization_name,
  created_at
FROM organizations 
ORDER BY created_at DESC;

-- Also check your current user profile to see which organization you belong to
SELECT 
  p.id as profile_id,
  p.full_name,
  p.email,
  p.role,
  p.organization_id,
  o.name as organization_name
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
WHERE p.id = auth.uid(); 