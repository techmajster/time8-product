-- Create BB8 Users Script
-- Run this in your Supabase SQL Editor to create your real team members

-- First, get your organization ID by running:
-- SELECT id, name FROM organizations;
-- Then replace 'YOUR_ORG_ID_HERE' with your actual organization ID

-- Insert your real team members
INSERT INTO profiles (
  id,
  email,
  full_name,
  organization_id,
  role,
  date_of_birth,
  avatar_url
) VALUES 
-- Supervisors/Managers
(gen_random_uuid(), 'szymon.rajca@bb8.pl', 'Szymon Rajca', 'YOUR_ORG_ID_HERE', 'manager', '1987-09-28', null),
(gen_random_uuid(), 'pawel.chrosciak@bb8.pl', 'Paweł Chróściak', 'YOUR_ORG_ID_HERE', 'manager', '1982-10-23', null),

-- Employees
(gen_random_uuid(), 'szymon.brodzicki@bb8.pl', 'Szymon Brodzicki', 'YOUR_ORG_ID_HERE', 'employee', '1986-12-06', null),
(gen_random_uuid(), 'dajana.bieganowska@bb8.pl', 'Dajana Bieganowska', 'YOUR_ORG_ID_HERE', 'employee', '1993-02-28', null),
(gen_random_uuid(), 'joanna.dechnik@bb8.pl', 'Joanna Dechnik', 'YOUR_ORG_ID_HERE', 'employee', '1982-07-27', null),
(gen_random_uuid(), 'katarzyna.czajkowska-szwed@bb8.pl', 'Katarzyna Czajkowska-Szwed', 'YOUR_ORG_ID_HERE', 'employee', '1992-03-27', null),
(gen_random_uuid(), 'angelika.siczek@bb8.pl', 'Angelika Siczek', 'YOUR_ORG_ID_HERE', 'employee', '1993-05-27', null),
(gen_random_uuid(), 'magda.rutkowska@bb8.pl', 'Magdalena Rutkowska', 'YOUR_ORG_ID_HERE', 'employee', '1982-03-12', null);

-- Create teams based on your organization structure
INSERT INTO teams (
  id,
  organization_id,
  name,
  description,
  manager_id,
  color
) VALUES 
(gen_random_uuid(), 'YOUR_ORG_ID_HERE', 'Development Team', 'Software development team', 
 (SELECT id FROM profiles WHERE email = 'szymon.rajca@bb8.pl' AND organization_id = 'YOUR_ORG_ID_HERE'), '#3b82f6'),
(gen_random_uuid(), 'YOUR_ORG_ID_HERE', 'Operations Team', 'Operations and management team', 
 (SELECT id FROM profiles WHERE email = 'pawel.chrosciak@bb8.pl' AND organization_id = 'YOUR_ORG_ID_HERE'), '#10b981');

-- Assign team members
-- Development Team (Szymon R. as manager)
UPDATE profiles SET team_id = (SELECT id FROM teams WHERE name = 'Development Team' AND organization_id = 'YOUR_ORG_ID_HERE') 
WHERE email IN ('szymon.brodzicki@bb8.pl', 'dajana.bieganowska@bb8.pl', 'joanna.dechnik@bb8.pl') 
AND organization_id = 'YOUR_ORG_ID_HERE';

-- Operations Team (Paweł as manager)
UPDATE profiles SET team_id = (SELECT id FROM teams WHERE name = 'Operations Team' AND organization_id = 'YOUR_ORG_ID_HERE') 
WHERE email IN ('katarzyna.czajkowska-szwed@bb8.pl', 'angelika.siczek@bb8.pl', 'magda.rutkowska@bb8.pl') 
AND organization_id = 'YOUR_ORG_ID_HERE';

-- Create Polish leave types for BB8
INSERT INTO leave_types (
  id,
  organization_id,
  name,
  color,
  days_per_year,
  requires_approval,
  created_at
) VALUES 
(gen_random_uuid(), 'YOUR_ORG_ID_HERE', 'Urlop wypoczynkowy', '#3b82f6', 26, true, NOW()),
(gen_random_uuid(), 'YOUR_ORG_ID_HERE', 'Urlop na żądanie', '#10b981', 4, false, NOW()),
(gen_random_uuid(), 'YOUR_ORG_ID_HERE', 'Zwolnienie lekarskie', '#ef4444', 0, false, NOW()),
(gen_random_uuid(), 'YOUR_ORG_ID_HERE', 'Urlop okolicznościowy', '#f59e0b', 2, true, NOW()),
(gen_random_uuid(), 'YOUR_ORG_ID_HERE', 'Urlop macierzyński', '#ec4899', 20, true, NOW()),
(gen_random_uuid(), 'YOUR_ORG_ID_HERE', 'Urlop ojcowski', '#8b5cf6', 2, true, NOW())
ON CONFLICT DO NOTHING;

-- Create leave balances for all BB8 team members
INSERT INTO leave_balances (
  user_id,
  leave_type_id,
  year,
  entitled_days,
  used_days,
  remaining_days
)
SELECT 
  p.id,
  lt.id,
  EXTRACT(YEAR FROM NOW())::INTEGER,
  lt.days_per_year,
  0,
  lt.days_per_year
FROM profiles p
CROSS JOIN leave_types lt
WHERE p.organization_id = 'YOUR_ORG_ID_HERE'
AND lt.organization_id = 'YOUR_ORG_ID_HERE'
AND lt.days_per_year > 0
ON CONFLICT (user_id, leave_type_id, year) DO NOTHING;

-- Optional: Create a test leave request to see someone absent today
-- Uncomment the section below if you want to test the absence functionality

/*
INSERT INTO leave_requests (
  id,
  user_id,
  leave_type_id,
  start_date,
  end_date,
  days_requested,
  reason,
  status,
  created_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM profiles WHERE email = 'dajana.bieganowska@bb8.pl' AND organization_id = 'YOUR_ORG_ID_HERE'),
  (SELECT id FROM leave_types WHERE name = 'Urlop wypoczynkowy' AND organization_id = 'YOUR_ORG_ID_HERE'),
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 day',
  2,
  'Urlop z rodziną',
  'approved',
  NOW()
);
*/

-- Verify the data was created correctly
SELECT 
  p.full_name,
  p.email,
  p.role,
  p.date_of_birth,
  t.name as team_name,
  t.color as team_color
FROM profiles p
LEFT JOIN teams t ON p.team_id = t.id
WHERE p.organization_id = 'YOUR_ORG_ID_HERE'
ORDER BY p.role DESC, p.full_name; 