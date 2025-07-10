-- Create BB8 Teams (without creating new users)
-- This script creates teams for your BB8 organization and shows how to assign existing users

-- This script will:
-- 1. Find the existing BB8 organization
-- 2. Create two teams for your organization
-- 3. Show instructions for assigning existing users

DO $$
DECLARE
    bb8_org_id UUID;
    dev_team_id UUID;
    ops_team_id UUID;
BEGIN
    -- Get BB8 organization ID
    SELECT id INTO bb8_org_id FROM organizations WHERE name ILIKE '%BB8%' LIMIT 1;
    
    IF bb8_org_id IS NULL THEN
        RAISE EXCEPTION 'BB8 organization not found. Please check organization name.';
    END IF;

    RAISE NOTICE 'Found BB8 organization with ID: %', bb8_org_id;

    -- Create teams (only if they don't exist)
    INSERT INTO teams (
        id,
        organization_id,
        name,
        description,
        manager_id,
        color,
        created_at,
        updated_at
    ) VALUES 
    (gen_random_uuid(), bb8_org_id, 'Development Team', 'Software development team', null, '#3b82f6', NOW(), NOW()),
    (gen_random_uuid(), bb8_org_id, 'Operations Team', 'Operations and management team', null, '#10b981', NOW(), NOW())
    ON CONFLICT (organization_id, name) DO UPDATE SET
        description = EXCLUDED.description,
        updated_at = NOW();

    RAISE NOTICE 'Teams created successfully';

    -- Get team IDs
    SELECT id INTO dev_team_id FROM teams WHERE name = 'Development Team' AND organization_id = bb8_org_id;
    SELECT id INTO ops_team_id FROM teams WHERE name = 'Operations Team' AND organization_id = bb8_org_id;

    RAISE NOTICE 'Development Team ID: %', dev_team_id;
    RAISE NOTICE 'Operations Team ID: %', ops_team_id;

END $$;

-- Show existing users in BB8 organization (if any)
SELECT 
    'EXISTING BB8 USERS:' as info,
    p.id,
    p.full_name,
    p.email,
    p.role,
    p.team_id,
    CASE WHEN p.team_id IS NOT NULL THEN 'ASSIGNED' ELSE 'NOT ASSIGNED' END as team_status
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
WHERE o.name ILIKE '%BB8%'
ORDER BY p.role DESC, p.full_name;

-- Show the teams that were created
SELECT 
    'BB8 TEAMS CREATED:' as info,
    t.id,
    t.name,
    t.description,
    t.color,
    t.manager_id,
    CASE WHEN t.manager_id IS NOT NULL THEN 'HAS MANAGER' ELSE 'NO MANAGER' END as manager_status
FROM teams t
JOIN organizations o ON t.organization_id = o.id
WHERE o.name ILIKE '%BB8%'
ORDER BY t.name;

-- Instructions for manually assigning users to teams
SELECT '
MANUAL ASSIGNMENT INSTRUCTIONS:

To assign existing users to teams, run these commands after you have real users:

-- Example: Assign user to Development Team
UPDATE profiles 
SET team_id = (SELECT id FROM teams WHERE name = ''Development Team'' AND organization_id = (SELECT id FROM organizations WHERE name ILIKE ''%BB8%''))
WHERE email = ''your-user@bb8.pl'';

-- Example: Set team manager
UPDATE teams 
SET manager_id = (SELECT id FROM profiles WHERE email = ''manager@bb8.pl'')
WHERE name = ''Development Team'' AND organization_id = (SELECT id FROM organizations WHERE name ILIKE ''%BB8%'');

NOTES:
- Users must be created through the normal authentication flow (signup/login)
- You cannot create profiles manually without corresponding auth.users entries
- Once users exist, you can assign them to teams using the UPDATE commands above
' as instructions; 