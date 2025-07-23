-- Check Szymon's current role
SELECT id, email, full_name, role, organization_id 
FROM profiles 
WHERE email = 'szymon.rajca@bb8.pl';

-- Fix Szymon's role if needed (replace with actual organization_id)
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'szymon.rajca@bb8.pl';

-- Check all admins in the organization
SELECT id, email, full_name, role 
FROM profiles 
WHERE organization_id = (SELECT organization_id FROM profiles WHERE email = 'szymon.rajca@bb8.pl')
ORDER BY role DESC; 