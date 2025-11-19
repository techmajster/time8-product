-- Migration: Delete test organizations
-- This migration removes testlemoniady_4, testlemoniady, and testlemoniady_narok organizations
-- and all their related data

BEGIN;

-- Disable the trigger that prevents deletion of mandatory leave types
ALTER TABLE leave_types DISABLE TRIGGER trg_prevent_mandatory_deletion;

-- Function to delete organization and all related data
CREATE OR REPLACE FUNCTION delete_organization_by_name(org_name TEXT) RETURNS VOID AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Get organization ID
  SELECT id INTO org_id FROM organizations WHERE name = org_name;

  IF org_id IS NULL THEN
    RAISE NOTICE '⚠️  Organization "%" not found, skipping', org_name;
    RETURN;
  END IF;

  RAISE NOTICE 'Deleting organization: % (ID: %)', org_name, org_id;

  -- Delete all data for this organization
  -- Order matters to handle foreign key constraints

  -- 1. Delete leave_balances
  DELETE FROM leave_balances WHERE organization_id = org_id;

  -- 2. Delete leave_requests
  DELETE FROM leave_requests WHERE organization_id = org_id;

  -- 3. Delete leave_types (including mandatory ones)
  DELETE FROM leave_types WHERE organization_id = org_id;

  -- 4. Delete other related data
  DELETE FROM notifications WHERE organization_id = org_id;
  DELETE FROM company_holidays WHERE organization_id = org_id;
  DELETE FROM customers WHERE organization_id = org_id;
  DELETE FROM employee_schedules WHERE organization_id = org_id;
  DELETE FROM invitations WHERE organization_id = org_id;
  DELETE FROM organization_domains WHERE organization_id = org_id;
  DELETE FROM organization_settings WHERE organization_id = org_id;
  DELETE FROM teams WHERE organization_id = org_id;
  DELETE FROM work_schedule_templates WHERE organization_id = org_id;

  -- 5. Delete profiles
  DELETE FROM profiles WHERE organization_id = org_id;

  -- 6. Delete user_organizations
  DELETE FROM user_organizations WHERE organization_id = org_id;

  -- 7. Delete subscriptions
  DELETE FROM subscriptions WHERE organization_id = org_id;

  -- 8. Finally delete the organization
  DELETE FROM organizations WHERE id = org_id;

  RAISE NOTICE '✅ Organization "%" successfully deleted', org_name;
END;
$$ LANGUAGE plpgsql;

-- Delete the three test organizations
SELECT delete_organization_by_name('testlemoniady_4');
SELECT delete_organization_by_name('testlemoniady');
SELECT delete_organization_by_name('testlemoniady_narok');

-- Clean up the temporary function
DROP FUNCTION delete_organization_by_name(TEXT);

-- Re-enable the trigger
ALTER TABLE leave_types ENABLE TRIGGER trg_prevent_mandatory_deletion;

-- Verify deletion
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM organizations
  WHERE name IN ('testlemoniady_4', 'testlemoniady', 'testlemoniady_narok');

  IF remaining_count > 0 THEN
    RAISE EXCEPTION 'Some test organizations still exist after deletion! Count: %', remaining_count;
  ELSE
    RAISE NOTICE '✅ All test organizations successfully deleted';
  END IF;
END $$;

COMMIT;
