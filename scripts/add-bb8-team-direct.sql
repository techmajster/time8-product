-- Add BB8 Team Members to Existing BB8 Organization
-- Run this directly in your Supabase SQL Editor

-- This script will:
-- 1. Find the existing BB8 organization
-- 2. Add your team members
-- 3. Create two teams
-- 4. Assign team members to teams

DO $$
DECLARE
    bb8_org_id UUID;
    dev_team_id UUID;
    ops_team_id UUID;
    szymon_r_id UUID;
    pawel_id UUID;
BEGIN
    -- Get BB8 organization ID
    SELECT id INTO bb8_org_id FROM organizations WHERE name ILIKE '%BB8%' LIMIT 1;
    
    IF bb8_org_id IS NULL THEN
        RAISE EXCEPTION 'BB8 organization not found. Please check organization name.';
    END IF;

    RAISE NOTICE 'Found BB8 organization with ID: %', bb8_org_id;

    -- Insert your real team members (only if they don't already exist)
    -- First, let's check and insert each user individually to avoid conflicts
    
    -- Szymon Rajca (Manager)
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'szymon.rajca@bb8.pl') THEN
        INSERT INTO profiles (id, email, full_name, organization_id, role, birth_date, avatar_url)
        VALUES (gen_random_uuid(), 'szymon.rajca@bb8.pl', 'Szymon Rajca', bb8_org_id, 'manager', '1987-09-28', null);
    END IF;

    -- Paweł Chróściak (Manager)
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'pawel.chrosciak@bb8.pl') THEN
        INSERT INTO profiles (id, email, full_name, organization_id, role, birth_date, avatar_url)
        VALUES (gen_random_uuid(), 'pawel.chrosciak@bb8.pl', 'Paweł Chróściak', bb8_org_id, 'manager', '1982-10-23', null);
    END IF;

    -- Szymon Brodzicki (Employee)
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'szymon.brodzicki@bb8.pl') THEN
        INSERT INTO profiles (id, email, full_name, organization_id, role, birth_date, avatar_url)
        VALUES (gen_random_uuid(), 'szymon.brodzicki@bb8.pl', 'Szymon Brodzicki', bb8_org_id, 'employee', '1986-12-06', null);
    END IF;

    -- Dajana Bieganowska (Employee)
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'dajana.bieganowska@bb8.pl') THEN
        INSERT INTO profiles (id, email, full_name, organization_id, role, birth_date, avatar_url)
        VALUES (gen_random_uuid(), 'dajana.bieganowska@bb8.pl', 'Dajana Bieganowska', bb8_org_id, 'employee', '1993-02-28', null);
    END IF;

    -- Joanna Dechnik (Employee)
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'joanna.dechnik@bb8.pl') THEN
        INSERT INTO profiles (id, email, full_name, organization_id, role, birth_date, avatar_url)
        VALUES (gen_random_uuid(), 'joanna.dechnik@bb8.pl', 'Joanna Dechnik', bb8_org_id, 'employee', '1982-07-27', null);
    END IF;

    -- Katarzyna Czajkowska-Szwed (Employee)
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'katarzyna.czajkowska-szwed@bb8.pl') THEN
        INSERT INTO profiles (id, email, full_name, organization_id, role, birth_date, avatar_url)
        VALUES (gen_random_uuid(), 'katarzyna.czajkowska-szwed@bb8.pl', 'Katarzyna Czajkowska-Szwed', bb8_org_id, 'employee', '1992-03-27', null);
    END IF;

    -- Angelika Siczek (Employee)
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'angelika.siczek@bb8.pl') THEN
        INSERT INTO profiles (id, email, full_name, organization_id, role, birth_date, avatar_url)
        VALUES (gen_random_uuid(), 'angelika.siczek@bb8.pl', 'Angelika Siczek', bb8_org_id, 'employee', '1993-05-27', null);
    END IF;

    -- Magdalena Rutkowska (Employee)
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'magda.rutkowska@bb8.pl') THEN
        INSERT INTO profiles (id, email, full_name, organization_id, role, birth_date, avatar_url)
        VALUES (gen_random_uuid(), 'magda.rutkowska@bb8.pl', 'Magdalena Rutkowska', bb8_org_id, 'employee', '1982-03-12', null);
    END IF;

    RAISE NOTICE 'Team members added successfully';

    -- Get manager IDs for team creation
    SELECT id INTO szymon_r_id FROM profiles WHERE email = 'szymon.rajca@bb8.pl' AND organization_id = bb8_org_id;
    SELECT id INTO pawel_id FROM profiles WHERE email = 'pawel.chrosciak@bb8.pl' AND organization_id = bb8_org_id;

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
    (gen_random_uuid(), bb8_org_id, 'Development Team', 'Software development team led by Szymon Rajca', szymon_r_id, '#3b82f6', NOW(), NOW()),
    (gen_random_uuid(), bb8_org_id, 'Operations Team', 'Operations and management team led by Paweł Chróściak', pawel_id, '#10b981', NOW(), NOW())
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
    WHERE email IN ('szymon.rajca@bb8.pl', 'szymon.brodzicki@bb8.pl', 'dajana.bieganowska@bb8.pl', 'joanna.dechnik@bb8.pl') 
    AND organization_id = bb8_org_id;

    -- Assign team members to Operations Team (Paweł as manager)
    UPDATE profiles SET team_id = ops_team_id, updated_at = NOW()
    WHERE email IN ('pawel.chrosciak@bb8.pl', 'katarzyna.czajkowska-szwed@bb8.pl', 'angelika.siczek@bb8.pl', 'magda.rutkowska@bb8.pl') 
    AND organization_id = bb8_org_id;

    RAISE NOTICE 'Team assignments completed successfully';

END $$;

-- Verify the setup
SELECT 
    'VERIFICATION: BB8 Team Setup' as info,
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