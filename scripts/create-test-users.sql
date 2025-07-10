-- Create Test Users Script
-- Run this in your Supabase SQL Editor to create test employees

-- First, let's get your organization ID
-- Replace 'YOUR_ORGANIZATION_ID' with your actual organization ID from the organizations table

-- You can find your organization ID by running:
-- SELECT id, name FROM organizations;

-- Example test users for your organization
-- Replace 'YOUR_ORG_ID_HERE' with your actual organization ID

INSERT INTO profiles (
  id,
  email,
  full_name,
  organization_id,
  role,
  date_of_birth,
  avatar_url
) VALUES 
-- Test Employees
(gen_random_uuid(), 'anna.kowalska@company.com', 'Anna Kowalska', 'YOUR_ORG_ID_HERE', 'employee', '1990-03-15', null),
(gen_random_uuid(), 'piotr.nowak@company.com', 'Piotr Nowak', 'YOUR_ORG_ID_HERE', 'employee', '1988-07-22', null),
(gen_random_uuid(), 'maria.wojcik@company.com', 'Maria Wójcik', 'YOUR_ORG_ID_HERE', 'employee', '1992-11-08', null),
(gen_random_uuid(), 'tomasz.lewandowski@company.com', 'Tomasz Lewandowski', 'YOUR_ORG_ID_HERE', 'employee', '1985-09-12', null),
(gen_random_uuid(), 'katarzyna.dabrowski@company.com', 'Katarzyna Dąbrowska', 'YOUR_ORG_ID_HERE', 'employee', '1993-01-25', null),
(gen_random_uuid(), 'marcin.kozlowski@company.com', 'Marcin Kozłowski', 'YOUR_ORG_ID_HERE', 'employee', '1987-05-30', null),
(gen_random_uuid(), 'agnieszka.jankowski@company.com', 'Agnieszka Jankowska', 'YOUR_ORG_ID_HERE', 'employee', '1991-12-03', null),
(gen_random_uuid(), 'robert.woźniak@company.com', 'Robert Woźniak', 'YOUR_ORG_ID_HERE', 'employee', '1989-04-18', null),

-- Test Managers
(gen_random_uuid(), 'aleksandra.kaminski@company.com', 'Aleksandra Kamińska', 'YOUR_ORG_ID_HERE', 'manager', '1982-08-14', null),
(gen_random_uuid(), 'jakub.zielinski@company.com', 'Jakub Zieliński', 'YOUR_ORG_ID_HERE', 'manager', '1984-02-27', null);

-- If you want to create teams and assign users to them, first create teams:
-- (Optional - only if you want to test team functionality)

/*
-- Create test teams
INSERT INTO teams (
  id,
  organization_id,
  name,
  description,
  manager_id,
  color
) VALUES 
(gen_random_uuid(), 'YOUR_ORG_ID_HERE', 'Frontend Team', 'Frontend development team', 
 (SELECT id FROM profiles WHERE email = 'aleksandra.kaminski@company.com' AND organization_id = 'YOUR_ORG_ID_HERE'), '#3b82f6'),
(gen_random_uuid(), 'YOUR_ORG_ID_HERE', 'Backend Team', 'Backend development team', 
 (SELECT id FROM profiles WHERE email = 'jakub.zielinski@company.com' AND organization_id = 'YOUR_ORG_ID_HERE'), '#10b981'),
(gen_random_uuid(), 'YOUR_ORG_ID_HERE', 'QA Team', 'Quality assurance team', 
 (SELECT id FROM profiles WHERE email = 'aleksandra.kaminski@company.com' AND organization_id = 'YOUR_ORG_ID_HERE'), '#f59e0b');

-- Assign users to teams
UPDATE profiles SET team_id = (SELECT id FROM teams WHERE name = 'Frontend Team' AND organization_id = 'YOUR_ORG_ID_HERE') 
WHERE email IN ('anna.kowalska@company.com', 'piotr.nowak@company.com', 'maria.wojcik@company.com') 
AND organization_id = 'YOUR_ORG_ID_HERE';

UPDATE profiles SET team_id = (SELECT id FROM teams WHERE name = 'Backend Team' AND organization_id = 'YOUR_ORG_ID_HERE') 
WHERE email IN ('tomasz.lewandowski@company.com', 'katarzyna.dabrowski@company.com', 'marcin.kozlowski@company.com') 
AND organization_id = 'YOUR_ORG_ID_HERE';

UPDATE profiles SET team_id = (SELECT id FROM teams WHERE name = 'QA Team' AND organization_id = 'YOUR_ORG_ID_HERE') 
WHERE email IN ('agnieszka.jankowski@company.com', 'robert.woźniak@company.com') 
AND organization_id = 'YOUR_ORG_ID_HERE';
*/

-- Optional: Create some test leave types if they don't exist
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
(gen_random_uuid(), 'YOUR_ORG_ID_HERE', 'Urlop okolicznościowy', '#f59e0b', 2, true, NOW())
ON CONFLICT DO NOTHING;

-- Create leave balances for all users
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

-- Optional: Create a test leave request to see someone absent
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
  (SELECT id FROM profiles WHERE email = 'anna.kowalska@company.com' AND organization_id = 'YOUR_ORG_ID_HERE'),
  (SELECT id FROM leave_types WHERE name = 'Urlop wypoczynkowy' AND organization_id = 'YOUR_ORG_ID_HERE'),
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '2 days',
  3,
  'Urlop z rodziną',
  'approved',
  NOW()
);
*/ 