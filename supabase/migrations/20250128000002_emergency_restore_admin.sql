-- EMERGENCY: Restore Szymon's admin access
-- This fixes the issue where all admin access was removed

-- First, find Szymon's profile
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'szymon.rajca@bb8.pl';

-- Also restore Dajana's admin access as backup
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'dajana.bieganowska@bb8.pl';

-- Verify the fix
SELECT id, email, full_name, role, organization_id 
FROM profiles 
WHERE email IN ('szymon.rajca@bb8.pl', 'dajana.bieganowska@bb8.pl')
ORDER BY email; 