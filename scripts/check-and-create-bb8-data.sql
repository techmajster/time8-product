-- Check existing BB8 data and create only what's missing

-- First, let's see what we already have
SELECT 'EXISTING AUTH USERS:' as info, email FROM auth.users WHERE email LIKE '%@bb8.pl%';

SELECT 'EXISTING PROFILES:' as info, email, full_name, role FROM profiles 
WHERE email LIKE '%@bb8.pl%' 
OR organization_id = (SELECT id FROM organizations WHERE name ILIKE '%BB8%' LIMIT 1);

SELECT 'EXISTING TEAMS:' as info, name, description FROM teams 
WHERE organization_id = (SELECT id FROM organizations WHERE name ILIKE '%BB8%' LIMIT 1);

-- Simple solution: Let's work with what you already have
-- Just create teams and assign existing users if any exist

DO $$
DECLARE
    bb8_org_id UUID;
    existing_user_count INTEGER;
BEGIN
    -- Get BB8 organization ID
    SELECT id INTO bb8_org_id FROM organizations WHERE name ILIKE '%BB8%' LIMIT 1;
    
    IF bb8_org_id IS NULL THEN
        RAISE EXCEPTION 'BB8 organization not found';
    END IF;

    -- Count existing BB8 users
    SELECT COUNT(*) INTO existing_user_count 
    FROM profiles 
    WHERE organization_id = bb8_org_id;

    RAISE NOTICE 'Found BB8 organization: % with % existing users', bb8_org_id, existing_user_count;

    -- Create teams only (safe operation)
    INSERT INTO teams (
        organization_id,
        name,
        description,
        color
    ) VALUES 
    (bb8_org_id, 'Development Team', 'Software development team', '#3b82f6'),
    (bb8_org_id, 'Operations Team', 'Operations team', '#10b981')
    ON CONFLICT (organization_id, name) DO NOTHING;

    RAISE NOTICE 'Teams created/updated successfully';

END $$;

-- Show final state
SELECT 
    'FINAL STATE - BB8 TEAMS:' as info,
    t.name,
    t.description,
    t.color,
    COUNT(p.id) as member_count
FROM teams t
LEFT JOIN profiles p ON p.team_id = t.id
WHERE t.organization_id = (SELECT id FROM organizations WHERE name ILIKE '%BB8%' LIMIT 1)
GROUP BY t.id, t.name, t.description, t.color
ORDER BY t.name; 