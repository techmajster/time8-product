-- =====================================================================================
-- Migration: Restore BB8 Studio user_organizations relationships
-- Purpose: Recover accidentally deleted user_organizations entries for BB8 Studio
-- =====================================================================================

-- BB8 Studio organization ID: c919b954-b2c2-45eb-80f5-fc65aea73cea

-- Step 1: Update profiles to link them to BB8 Studio organization
UPDATE profiles
SET organization_id = 'c919b954-b2c2-45eb-80f5-fc65aea73cea'
WHERE email IN (
  'szymon.rajca@bb8.pl',
  'szymon.brodzicki@bb8.pl',
  'pawel.chrosciak@bb8.pl',
  'dajana.bieganowska@bb8.pl',
  'joanna.dechnik@bb8.pl',
  'magda.rutkowska@bb8.pl'
);

-- Step 2: Insert user_organizations entries for BB8 Studio team
-- Szymon Rajca (owner) - first user, created the workspace
INSERT INTO user_organizations (
  user_id,
  organization_id,
  role,
  status,
  is_owner,
  joined_via,
  joined_at
)
VALUES (
  'eb8feca9-1617-484c-8b80-4ae352a1e4f0', -- szymon.rajca@bb8.pl
  'c919b954-b2c2-45eb-80f5-fc65aea73cea', -- BB8 Studio
  'admin',
  'active',
  true, -- workspace owner
  'created',
  '2025-11-19 10:45:48.159399+00' -- same as org creation
)
ON CONFLICT (user_id, organization_id) DO UPDATE
SET
  is_owner = true,
  role = 'admin',
  status = 'active';

-- Szymon Brodzicki (admin)
INSERT INTO user_organizations (
  user_id,
  organization_id,
  role,
  status,
  is_owner,
  joined_via,
  joined_at
)
VALUES (
  '402f7ecd-3d2f-4fa1-8eda-0affaddec8a7', -- szymon.brodzicki@bb8.pl
  'c919b954-b2c2-45eb-80f5-fc65aea73cea',
  'admin',
  'active',
  false,
  'invitation',
  '2025-11-19 10:46:00+00'
)
ON CONFLICT (user_id, organization_id) DO UPDATE
SET
  role = 'admin',
  status = 'active';

-- Paweł Chróściak (manager)
INSERT INTO user_organizations (
  user_id,
  organization_id,
  role,
  status,
  is_owner,
  joined_via,
  joined_at
)
VALUES (
  '99b1d3ef-9fb4-4491-9eb8-521df5f31e90', -- pawel.chrosciak@bb8.pl
  'c919b954-b2c2-45eb-80f5-fc65aea73cea',
  'manager',
  'active',
  false,
  'invitation',
  '2025-11-19 10:46:30+00'
)
ON CONFLICT (user_id, organization_id) DO UPDATE
SET
  role = 'manager',
  status = 'active';

-- Dajana Bieganowska (employee)
INSERT INTO user_organizations (
  user_id,
  organization_id,
  role,
  status,
  is_owner,
  joined_via,
  joined_at
)
VALUES (
  '9a8e92e7-8c6e-4550-b414-2b12ffe79dbf', -- dajana.bieganowska@bb8.pl
  'c919b954-b2c2-45eb-80f5-fc65aea73cea',
  'employee',
  'active',
  false,
  'invitation',
  '2025-11-19 10:47:00+00'
)
ON CONFLICT (user_id, organization_id) DO UPDATE
SET
  role = 'employee',
  status = 'active';

-- Joanna Dechnik (employee)
INSERT INTO user_organizations (
  user_id,
  organization_id,
  role,
  status,
  is_owner,
  joined_via,
  joined_at
)
VALUES (
  'ae8e5315-990c-4947-8333-72331d8cbd07', -- joanna.dechnik@bb8.pl
  'c919b954-b2c2-45eb-80f5-fc65aea73cea',
  'employee',
  'active',
  false,
  'invitation',
  '2025-11-19 10:47:30+00'
)
ON CONFLICT (user_id, organization_id) DO UPDATE
SET
  role = 'employee',
  status = 'active';

-- Magda Rutkowska (employee)
INSERT INTO user_organizations (
  user_id,
  organization_id,
  role,
  status,
  is_owner,
  joined_via,
  joined_at
)
VALUES (
  '6aca42d7-b7c3-475e-995b-142877594e3d', -- magda.rutkowska@bb8.pl
  'c919b954-b2c2-45eb-80f5-fc65aea73cea',
  'employee',
  'active',
  false,
  'invitation',
  '2025-11-19 10:48:00+00'
)
ON CONFLICT (user_id, organization_id) DO UPDATE
SET
  role = 'employee',
  status = 'active';

-- Step 3: Verify the restoration
DO $$
DECLARE
  user_count INTEGER;
  owner_count INTEGER;
BEGIN
  -- Count users in BB8 Studio
  SELECT COUNT(*) INTO user_count
  FROM user_organizations
  WHERE organization_id = 'c919b954-b2c2-45eb-80f5-fc65aea73cea';

  -- Count owners
  SELECT COUNT(*) INTO owner_count
  FROM user_organizations
  WHERE organization_id = 'c919b954-b2c2-45eb-80f5-fc65aea73cea'
    AND is_owner = true;

  RAISE NOTICE 'BB8 Studio restoration complete:';
  RAISE NOTICE '  - Total users: %', user_count;
  RAISE NOTICE '  - Owners: %', owner_count;

  IF owner_count != 1 THEN
    RAISE EXCEPTION 'Expected exactly 1 owner, found %', owner_count;
  END IF;
END $$;
