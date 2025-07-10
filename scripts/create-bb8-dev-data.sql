-- Create BB8 Development Data (for localhost testing)
-- This script creates both auth.users and profiles entries for testing

-- WARNING: This is for DEVELOPMENT/LOCALHOST only!
-- Do NOT run this on production databases

DO $$
DECLARE
    bb8_org_id UUID;
    dev_team_id UUID;
    ops_team_id UUID;
    user_id_1 UUID := gen_random_uuid();
    user_id_2 UUID := gen_random_uuid();
    user_id_3 UUID := gen_random_uuid();
    user_id_4 UUID := gen_random_uuid();
    user_id_5 UUID := gen_random_uuid();
    user_id_6 UUID := gen_random_uuid();
    user_id_7 UUID := gen_random_uuid();
    user_id_8 UUID := gen_random_uuid();
BEGIN
    -- Get BB8 organization ID
    SELECT id INTO bb8_org_id FROM organizations WHERE name ILIKE '%BB8%' LIMIT 1;
    
    IF bb8_org_id IS NULL THEN
        RAISE EXCEPTION 'BB8 organization not found. Please check organization name.';
    END IF;

    RAISE NOTICE 'Found BB8 organization with ID: %', bb8_org_id;

    -- Create auth.users entries first (this enables the profiles to be created)
    INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role
    ) VALUES 
    (user_id_1, 'szymon.rajca@bb8.pl', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Szymon Rajca"}', false, 'authenticated'),
    (user_id_2, 'pawel.chrosciak@bb8.pl', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Paweł Chróściak"}', false, 'authenticated'),
    (user_id_3, 'szymon.brodzicki@bb8.pl', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Szymon Brodzicki"}', false, 'authenticated'),
    (user_id_4, 'dajana.bieganowska@bb8.pl', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dajana Bieganowska"}', false, 'authenticated'),
    (user_id_5, 'joanna.dechnik@bb8.pl', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Joanna Dechnik"}', false, 'authenticated'),
    (user_id_6, 'katarzyna.czajkowska-szwed@bb8.pl', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Katarzyna Czajkowska-Szwed"}', false, 'authenticated'),
    (user_id_7, 'angelika.siczek@bb8.pl', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Angelika Siczek"}', false, 'authenticated'),
    (user_id_8, 'magda.rutkowska@bb8.pl', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Magdalena Rutkowska"}', false, 'authenticated');

    RAISE NOTICE 'Auth users created successfully';

    -- Create profiles entries
    INSERT INTO profiles (
        id,
        email,
        full_name,
        organization_id,
        role,
        birth_date,
        avatar_url,
        auth_provider
    ) VALUES 
    -- Managers
    (user_id_1, 'szymon.rajca@bb8.pl', 'Szymon Rajca', bb8_org_id, 'manager', '1987-09-28', null, 'email'),
    (user_id_2, 'pawel.chrosciak@bb8.pl', 'Paweł Chróściak', bb8_org_id, 'manager', '1982-10-23', null, 'email'),
    
    -- Employees
    (user_id_3, 'szymon.brodzicki@bb8.pl', 'Szymon Brodzicki', bb8_org_id, 'employee', '1986-12-06', null, 'email'),
    (user_id_4, 'dajana.bieganowska@bb8.pl', 'Dajana Bieganowska', bb8_org_id, 'employee', '1993-02-28', null, 'email'),
    (user_id_5, 'joanna.dechnik@bb8.pl', 'Joanna Dechnik', bb8_org_id, 'employee', '1982-07-27', null, 'email'),
    (user_id_6, 'katarzyna.czajkowska-szwed@bb8.pl', 'Katarzyna Czajkowska-Szwed', bb8_org_id, 'employee', '1992-03-27', null, 'email'),
    (user_id_7, 'angelika.siczek@bb8.pl', 'Angelika Siczek', bb8_org_id, 'employee', '1993-05-27', null, 'email'),
    (user_id_8, 'magda.rutkowska@bb8.pl', 'Magdalena Rutkowska', bb8_org_id, 'employee', '1982-03-12', null, 'email');

    RAISE NOTICE 'Profiles created successfully';

    -- Create teams
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
    (gen_random_uuid(), bb8_org_id, 'Development Team', 'Software development team led by Szymon Rajca', user_id_1, '#3b82f6', NOW(), NOW()),
    (gen_random_uuid(), bb8_org_id, 'Operations Team', 'Operations and management team led by Paweł Chróściak', user_id_2, '#10b981', NOW(), NOW())
    ON CONFLICT (organization_id, name) DO UPDATE SET
        manager_id = EXCLUDED.manager_id,
        description = EXCLUDED.description,
        updated_at = NOW();

    RAISE NOTICE 'Teams created successfully';

    -- Get team IDs
    SELECT id INTO dev_team_id FROM teams WHERE name = 'Development Team' AND organization_id = bb8_org_id;
    SELECT id INTO ops_team_id FROM teams WHERE name = 'Operations Team' AND organization_id = bb8_org_id;

    -- Assign team members to Development Team (Szymon R. as manager)
    UPDATE profiles SET team_id = dev_team_id, updated_at = NOW()
    WHERE id IN (user_id_1, user_id_3, user_id_4, user_id_5) 
    AND organization_id = bb8_org_id;

    -- Assign team members to Operations Team (Paweł as manager)
    UPDATE profiles SET team_id = ops_team_id, updated_at = NOW()
    WHERE id IN (user_id_2, user_id_6, user_id_7, user_id_8) 
    AND organization_id = bb8_org_id;

    RAISE NOTICE 'Team assignments completed successfully';

END $$;

-- Verify the setup
SELECT 
    'VERIFICATION: BB8 Development Data' as info,
    p.full_name,
    p.email,
    p.role,
    p.birth_date,
    t.name as team_name,
    t.color as team_color,
    CASE WHEN t.manager_id = p.id THEN 'MANAGER' ELSE 'MEMBER' END as team_role
FROM profiles p
LEFT JOIN teams t ON p.team_id = t.id
JOIN organizations o ON p.organization_id = o.id
WHERE o.name ILIKE '%BB8%'
ORDER BY p.role DESC, t.name, p.full_name;

-- Show login credentials for testing
SELECT 
    'LOGIN CREDENTIALS (password123 for all):' as info,
    p.email,
    'password123' as password,
    p.role,
    t.name as team
FROM profiles p
LEFT JOIN teams t ON p.team_id = t.id
JOIN organizations o ON p.organization_id = o.id
WHERE o.name ILIKE '%BB8%'
ORDER BY p.role DESC, p.full_name; 