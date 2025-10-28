-- Phase 9: Database Cleanup - Remove Test Data and Unused Tables
-- Date: 2025-10-28
-- Risk Level: MEDIUM-HIGH
-- IMPORTANT: Create backup before running!

-- =============================================================================
-- PRE-FLIGHT CHECK: Verify Production Data
-- =============================================================================

DO $$
DECLARE
  prod_org_count INTEGER;
  prod_user_count INTEGER;
BEGIN
  -- Check production organizations exist
  SELECT COUNT(*) INTO prod_org_count
  FROM public.organizations
  WHERE name IN ('BB8 Studio', 'Kontury');

  -- Check production users exist
  SELECT COUNT(*) INTO prod_user_count
  FROM public.profiles
  WHERE email IN (
    'szymon.rajca@bb8.pl',
    'pawel.chrosciak@bb8.pl',
    'szymon.brodzicki@bb8.pl',
    'dajana.bieganowska@bb8.pl'
  );

  RAISE NOTICE '====================================';
  RAISE NOTICE 'PRE-FLIGHT CHECK';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Production organizations found: %', prod_org_count;
  RAISE NOTICE 'Production users found: %', prod_user_count;
  RAISE NOTICE '';

  IF prod_org_count != 2 THEN
    RAISE EXCEPTION 'Expected 2 production organizations, found %. ABORTING.', prod_org_count;
  END IF;

  IF prod_user_count != 4 THEN
    RAISE EXCEPTION 'Expected 4 production users, found %. ABORTING.', prod_user_count;
  END IF;

  RAISE NOTICE '✅ Pre-flight check passed';
  RAISE NOTICE '';
END $$;

-- =============================================================================
-- STEP 1: Delete Dependent Records for Non-Production Organizations
-- =============================================================================

-- Delete leave_balances for non-production users
DELETE FROM public.leave_balances
WHERE user_id NOT IN (
  SELECT id FROM public.profiles
  WHERE email IN (
    'szymon.rajca@bb8.pl',
    'pawel.chrosciak@bb8.pl',
    'szymon.brodzicki@bb8.pl',
    'dajana.bieganowska@bb8.pl'
  )
);

-- Delete leave_requests for non-production users
DELETE FROM public.leave_requests
WHERE user_id NOT IN (
  SELECT id FROM public.profiles
  WHERE email IN (
    'szymon.rajca@bb8.pl',
    'pawel.chrosciak@bb8.pl',
    'szymon.brodzicki@bb8.pl',
    'dajana.bieganowska@bb8.pl'
  )
);

-- Delete user_organizations for non-production users
DELETE FROM public.user_organizations
WHERE user_id NOT IN (
  SELECT id FROM public.profiles
  WHERE email IN (
    'szymon.rajca@bb8.pl',
    'pawel.chrosciak@bb8.pl',
    'szymon.brodzicki@bb8.pl',
    'dajana.bieganowska@bb8.pl'
  )
);

-- Delete invitations for non-production orgs
DELETE FROM public.invitations
WHERE organization_id NOT IN (
  SELECT id FROM public.organizations
  WHERE name IN ('BB8 Studio', 'Kontury')
);

-- Delete company_holidays for non-production orgs
DELETE FROM public.company_holidays
WHERE organization_id NOT IN (
  SELECT id FROM public.organizations
  WHERE name IN ('BB8 Studio', 'Kontury')
);

-- Delete leave_types for non-production orgs
DELETE FROM public.leave_types
WHERE organization_id NOT IN (
  SELECT id FROM public.organizations
  WHERE name IN ('BB8 Studio', 'Kontury')
);

-- Delete organization_settings for non-production orgs
DELETE FROM public.organization_settings
WHERE organization_id NOT IN (
  SELECT id FROM public.organizations
  WHERE name IN ('BB8 Studio', 'Kontury')
);

-- Delete subscriptions for non-production orgs
DELETE FROM public.subscriptions
WHERE organization_id NOT IN (
  SELECT id FROM public.organizations
  WHERE name IN ('BB8 Studio', 'Kontury')
);

-- Delete customers for non-production orgs
DELETE FROM public.customers
WHERE organization_id NOT IN (
  SELECT id FROM public.organizations
  WHERE name IN ('BB8 Studio', 'Kontury')
);

-- Delete teams for non-production orgs
DELETE FROM public.teams
WHERE organization_id NOT IN (
  SELECT id FROM public.organizations
  WHERE name IN ('BB8 Studio', 'Kontury')
);

-- =============================================================================
-- STEP 2: Delete Non-Production Profiles
-- =============================================================================

DELETE FROM public.profiles
WHERE email NOT IN (
  'szymon.rajca@bb8.pl',
  'pawel.chrosciak@bb8.pl',
  'szymon.brodzicki@bb8.pl',
  'dajana.bieganowska@bb8.pl'
);

-- =============================================================================
-- STEP 3: Delete Non-Production Organizations
-- =============================================================================

DELETE FROM public.organizations
WHERE name NOT IN ('BB8 Studio', 'Kontury');

-- =============================================================================
-- STEP 4: Optional - Clean Up Expired Invitations
-- =============================================================================

DELETE FROM public.invitations
WHERE status IN ('accepted', 'expired');

-- =============================================================================
-- STEP 5: Drop Unused Tables (Based on API Endpoint Analysis)
-- =============================================================================

-- Drop tables with NO code references in the application

DROP TABLE IF EXISTS public.work_schedules CASCADE;
-- Reason: 0 rows, no API endpoint references this table

DROP TABLE IF EXISTS public.cleanup_log CASCADE;
-- Reason: 6 rows, no API endpoint references this table

DROP TABLE IF EXISTS public.migration_logs CASCADE;
-- Reason: 2 rows, no API endpoint references this table

-- =============================================================================
-- STEP 6: Final Verification
-- =============================================================================

DO $$
DECLARE
  org_count INTEGER;
  profile_count INTEGER;
  bb8_studio_exists BOOLEAN;
  kontury_exists BOOLEAN;
  users_verified BOOLEAN;
BEGIN
  -- Count organizations
  SELECT COUNT(*) INTO org_count FROM public.organizations;

  -- Count profiles
  SELECT COUNT(*) INTO profile_count FROM public.profiles;

  -- Verify specific organizations exist
  SELECT EXISTS(SELECT 1 FROM public.organizations WHERE name = 'BB8 Studio') INTO bb8_studio_exists;
  SELECT EXISTS(SELECT 1 FROM public.organizations WHERE name = 'Kontury') INTO kontury_exists;

  -- Verify all 4 production users exist
  SELECT COUNT(*) = 4 INTO users_verified
  FROM public.profiles
  WHERE email IN (
    'szymon.rajca@bb8.pl',
    'pawel.chrosciak@bb8.pl',
    'szymon.brodzicki@bb8.pl',
    'dajana.bieganowska@bb8.pl'
  );

  RAISE NOTICE '====================================';
  RAISE NOTICE 'CLEANUP VERIFICATION';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Organizations remaining: %', org_count;
  RAISE NOTICE 'Profiles remaining: %', profile_count;
  RAISE NOTICE 'BB8 Studio exists: %', bb8_studio_exists;
  RAISE NOTICE 'Kontury exists: %', kontury_exists;
  RAISE NOTICE 'All 4 production users exist: %', users_verified;
  RAISE NOTICE '';

  IF org_count != 2 THEN
    RAISE EXCEPTION 'Expected 2 organizations, found %', org_count;
  END IF;

  IF profile_count != 4 THEN
    RAISE EXCEPTION 'Expected 4 profiles, found %', profile_count;
  END IF;

  IF NOT bb8_studio_exists THEN
    RAISE EXCEPTION 'BB8 Studio organization missing!';
  END IF;

  IF NOT kontury_exists THEN
    RAISE EXCEPTION 'Kontury organization missing!';
  END IF;

  IF NOT users_verified THEN
    RAISE EXCEPTION 'Not all 4 production users found!';
  END IF;

  RAISE NOTICE '�� Cleanup verification passed';
  RAISE NOTICE '✅ Organizations remaining: %', org_count;
  RAISE NOTICE '✅ Profiles remaining: %', profile_count;
  RAISE NOTICE '✅ Database cleanup completed successfully';
  RAISE NOTICE '';
END $$;
