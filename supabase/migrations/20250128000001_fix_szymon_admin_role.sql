-- Fix Szymon's admin role
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'szymon.rajca@bb8.pl';

-- Verify the fix
SELECT id, email, full_name, role, organization_id 
FROM profiles 
WHERE email = 'szymon.rajca@bb8.pl'; 