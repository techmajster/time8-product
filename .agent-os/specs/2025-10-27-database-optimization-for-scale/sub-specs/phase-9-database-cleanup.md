# Phase 9: Database Cleanup

> Part of: Database Optimization for Scale
> Created: 2025-10-27
> Status: Planning

## Overview

Remove all test data and unused records created during development/roadmap phases. Prepare the database for production by cleaning up test organizations, test profiles, and evaluating unused tables.

## Analysis Results

### Organizations to Remove (31 organizations)

**Organizations to Remove:**
- 29 test organizations (names containing "test" or created in Oct 2025)
- 27 organizations with NO users (completely empty)
- 1 additional organization: Angela
- All created during October 2025 development phase

**Production Organizations to KEEP (2):**
- BB8 Studio
- Kontury

### User Profiles to Remove (11+ profiles)

**Profiles to Remove:**
- All profiles EXCEPT the 4 production users listed below
- Includes profiles with emails containing "test" or "audit.test"
- Includes all profiles associated with removed organizations

**Production Profiles to KEEP (4):**
- szymon.rajca@bb8.pl
- pawel.chrosciak@bb8.pl
- szymon.brodzicki@bb8.pl
- dajana.bieganowska@bb8.pl

### Empty Tables Analysis & API Endpoint Usage

**CRITICAL: Endpoint usage analysis completed to identify truly unused tables**

**Phase 5 Feature Tables (HAS Active Code):**
- `employee_schedules` - 0 rows, **USED BY 5 endpoints** (schedule/weekly, schedule/employee/[id], schedule/custom, schedule/employee-info, schedule/assign-template)
- `work_schedule_templates` - 0 rows, **USED BY 4 endpoints** (schedule/templates/[id], schedule/templates, schedule/create-default-templates, schedule/assign-template)
- `work_schedules` - 0 rows, **NOT USED** by any endpoint ⚠️

**Decision:** KEEP employee_schedules and work_schedule_templates (active code), **DROP work_schedules** (no code references)

**Webhook/Logging Tables:**
- `billing_events` - 0 rows, **ACTIVELY USED** by webhook handlers for logging and idempotency checks (5 endpoints)

**Decision:** KEEP this table (critical for billing webhook processing)

**Multi-Org Feature Tables:**
- `organization_domains` - 0 rows, **USED BY 3 endpoints** (organizations, workspaces/[id], auth/verify-email)

**Decision:** KEEP this table (active multi-org feature code)

**Audit/Logging Tables (NO Code Usage):**
- `cleanup_log` - 6 rows, **NOT USED** by any endpoint ⚠️
- `migration_logs` - 2 rows, **NOT USED** by any endpoint ⚠️

**Decision:** **DROP both tables** (no code references, no active usage)

### Other Cleanup Candidates

**Expired/Accepted Invitations:**
- 7 invitations in terminal states (accepted/expired)
- Can be archived or removed

**Cleanup Tracking Tables:**
- `cleanup_log` - 6 rows (historical cleanup records)
- `migration_logs` - 2 rows (migration history)

**Decision:** KEEP for audit trail purposes

## Risk Assessment

**Risk Level: MEDIUM-HIGH**

**Risks:**
- Cascading deletes across related tables
- Potential foreign key constraint violations
- Loss of historical data if backup not taken
- Accidental deletion of production data

**Mitigation:**
1. Create complete database backup before cleanup
2. Test cleanup script on staging/copy first
3. Use explicit organization IDs for deletion (not pattern matching)
4. Verify production organization IDs are excluded
5. Run in transaction with verification checkpoints

## Cleanup Strategy

### Phase 1: Backup and Verification

**Actions:**
1. Create full database backup
2. Verify production organization IDs
3. Export test data for reference
4. Document current row counts

### Phase 2: Test Data Removal

**Order of deletion (respecting foreign key constraints):**

1. **Remove dependent records first:**
   - access_requests (referencing profiles, organizations)
   - leave_balances (referencing profiles, organizations, leave_types)
   - leave_requests (referencing profiles, organizations, leave_types)
   - user_organizations (referencing profiles, organizations)
   - invitations (referencing organizations)
   - company_holidays (referencing organizations)
   - leave_types (referencing organizations)
   - organization_settings (referencing organizations)
   - profiles (referencing organizations)

2. **Remove parent records:**
   - organizations (test organizations only)

3. **Clean up auth records:**
   - Check and remove auth.users entries for test profiles (if accessible)

### Phase 3: Optional Cleanup

**Expired/Accepted Invitations:**
- Remove invitations in terminal states (optional)

### Phase 4: Drop Unused Tables (CRITICAL)

**Tables to Drop (Based on API Endpoint Analysis):**
1. **work_schedules** - 0 rows, NO API endpoint usage
2. **cleanup_log** - 6 rows, NO API endpoint usage
3. **migration_logs** - 2 rows, NO API endpoint usage

**Tables to KEEP (Active Usage):**
- employee_schedules (5 endpoints use this)
- work_schedule_templates (4 endpoints use this)
- billing_events (5 endpoints + webhook handlers)
- organization_domains (3 endpoints use this)

**Risk:** LOW - Tables have no code references, dropping will not break any functionality

### Phase 5: Verification

**Post-cleanup checks:**
1. Verify 2 production organizations remain (BB8 Studio, Kontury)
2. Verify 4 production profiles remain (szymon.rajca, pawel.chrosciak, szymon.brodzicki, dajana.bieganowska)
3. Verify referential integrity maintained
4. Check row counts match expected values
5. Run application smoke tests

## SQL Cleanup Script Structure

```sql
-- Phase 9: Database Cleanup - Remove Test Data
-- Date: 2025-10-27
-- Risk Level: MEDIUM-HIGH
-- IMPORTANT: Create backup before running!

-- =============================================================================
-- STEP 1: Verification - Identify Production Organizations
-- =============================================================================

DO $$
DECLARE
  prod_orgs TEXT[];
  prod_users TEXT[];
BEGIN
  -- Production organization names to PROTECT
  prod_orgs := ARRAY['BB8 Studio', 'Kontury'];

  -- Production user emails to PROTECT
  prod_users := ARRAY[
    'szymon.rajca@bb8.pl',
    'pawel.chrosciak@bb8.pl',
    'szymon.brodzicki@bb8.pl',
    'dajana.bieganowska@bb8.pl'
  ];

  RAISE NOTICE 'Production organizations protected: %', array_length(prod_orgs, 1);
  RAISE NOTICE 'Production users protected: %', array_length(prod_users, 1);
END $$;

-- =============================================================================
-- STEP 2: Delete Dependent Records for Test Organizations
-- =============================================================================

-- Delete access_requests for non-production orgs
DELETE FROM public.access_requests
WHERE organization_id NOT IN (
  SELECT id FROM public.organizations
  WHERE name IN ('BB8 Studio', 'Kontury')
);

-- Delete leave_balances for non-production users
DELETE FROM public.leave_balances
WHERE profile_id NOT IN (
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
WHERE profile_id NOT IN (
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
WHERE profile_id NOT IN (
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

-- Delete test profiles (NOT in production user whitelist)
DELETE FROM public.profiles
WHERE email NOT IN (
  'szymon.rajca@bb8.pl',
  'pawel.chrosciak@bb8.pl',
  'szymon.brodzicki@bb8.pl',
  'dajana.bieganowska@bb8.pl'
);

-- =============================================================================
-- STEP 3: Delete Test Organizations
-- =============================================================================

DELETE FROM public.organizations
WHERE name NOT IN ('BB8 Studio', 'Kontury');

-- =============================================================================
-- STEP 4: Optional - Clean Up Expired Invitations
-- =============================================================================

DELETE FROM public.invitations
WHERE status IN ('accepted', 'expired');

-- =============================================================================
-- STEP 5: Drop Unused Tables (CRITICAL)
-- =============================================================================

-- Drop tables with NO code references in the application
-- Based on comprehensive API endpoint analysis

DROP TABLE IF EXISTS public.work_schedules CASCADE;
-- Reason: 0 rows, no API endpoint references this table

DROP TABLE IF EXISTS public.cleanup_log CASCADE;
-- Reason: 6 rows, no API endpoint references this table

DROP TABLE IF EXISTS public.migration_logs CASCADE;
-- Reason: 2 rows, no API endpoint references this table

-- =============================================================================
-- STEP 6: Verification
-- =============================================================================

DO $$
DECLARE
  org_count INTEGER;
  profile_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO org_count FROM public.organizations;
  SELECT COUNT(*) INTO profile_count FROM public.profiles;

  IF org_count != 2 THEN
    RAISE EXCEPTION 'Expected 2 organizations, found %', org_count;
  END IF;

  IF profile_count != 4 THEN
    RAISE EXCEPTION 'Expected 4 profiles, found %', profile_count;
  END IF;

  RAISE NOTICE '✅ Cleanup verification passed';
  RAISE NOTICE '✅ Organizations remaining: %', org_count;
  RAISE NOTICE '✅ Profiles remaining: %', profile_count;
END $$;
```

## Expected Impact

### Storage Savings

**Organizations:** 31 organizations removed (29 test + Angela)
**Profiles:** ~11+ profiles removed
**Dependent Records:**
- leave_balances: Estimated 100-200 test records
- leave_requests: Estimated 50-100 test records
- user_organizations: Estimated 50-100 test records
- invitations: Estimated 20-30 test records

**Tables Dropped:** 3 unused tables
- work_schedules (0 rows)
- cleanup_log (6 rows)
- migration_logs (2 rows)

**Total Storage Freed:** ~500-1000 rows across all tables + 3 table definitions removed

### Performance Impact

- Cleaner database for production use
- Faster queries on organization-scoped data
- Reduced index bloat
- Simplified data management
- Removal of unused table overhead
- Cleaner schema for development and maintenance

## Rollback Plan

**If cleanup goes wrong:**

1. Restore from backup taken in Phase 1
2. Re-run verification queries to confirm restoration
3. Review cleanup script for issues

**Partial rollback not recommended** - Use full backup restore

## Pre-Execution Checklist

- [ ] Full database backup created
- [ ] Production organization IDs verified in script
- [ ] Cleanup script reviewed by team
- [ ] Tested on staging/copy database first (recommended)
- [ ] Application is in maintenance mode (optional)
- [ ] RLS policies won't block deletion (service role execution)

## Post-Execution Checklist

- [ ] Verify 2 production organizations remain (BB8 Studio, Kontury)
- [ ] Verify 4 production user profiles intact (szymon.rajca, pawel.chrosciak, szymon.brodzicki, dajana.bieganowska)
- [ ] Test application login for production users
- [ ] Test creating new leave requests
- [ ] Test organization switching (if applicable)
- [ ] Monitor application logs for errors
- [ ] Document cleanup results

## Notes

- This is a ONE-TIME cleanup operation
- Cannot be easily reversed without backup
- Use Supabase service role to bypass RLS during cleanup
- Consider running during low-traffic period
- Future test data should be clearly labeled for easy identification

## Tasks

### Preparation
- [ ] Create full database backup
- [ ] Verify production organization IDs in cleanup script
- [ ] Test cleanup script on staging/copy (optional but recommended)

### Execution
- [ ] Apply cleanup migration via Supabase MCP
- [ ] Monitor migration execution
- [ ] Verify no errors during cleanup

### Verification
- [ ] Run post-cleanup verification queries
- [ ] Test application functionality
- [ ] Check production user access
- [ ] Monitor logs for 24 hours

### Documentation
- [ ] Document cleanup results (rows deleted)
- [ ] Update roadmap with Phase 9 completion
- [ ] Archive backup location
