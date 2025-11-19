-- Temporary Migration: Delete testlemoniady organization
-- This migration removes the test organization and all related data
-- Will be rolled back after execution

BEGIN;

-- Disable the trigger that prevents deletion of mandatory leave types
ALTER TABLE leave_types DISABLE TRIGGER trg_prevent_mandatory_deletion;

-- Delete all data for testlemoniady organization (976ab1c8-36e9-45a8-ade6-8f41800ad189)
-- Order matters to handle foreign key constraints

-- 1. Delete leave_balances
DELETE FROM leave_balances
WHERE organization_id = '976ab1c8-36e9-45a8-ade6-8f41800ad189';

-- 2. Delete leave_requests
DELETE FROM leave_requests
WHERE organization_id = '976ab1c8-36e9-45a8-ade6-8f41800ad189';

-- 3. Delete leave_types (including mandatory ones)
DELETE FROM leave_types
WHERE organization_id = '976ab1c8-36e9-45a8-ade6-8f41800ad189';

-- 4. Delete other related data
DELETE FROM notifications
WHERE organization_id = '976ab1c8-36e9-45a8-ade6-8f41800ad189';

DELETE FROM company_holidays
WHERE organization_id = '976ab1c8-36e9-45a8-ade6-8f41800ad189';

DELETE FROM customers
WHERE organization_id = '976ab1c8-36e9-45a8-ade6-8f41800ad189';

DELETE FROM employee_schedules
WHERE organization_id = '976ab1c8-36e9-45a8-ade6-8f41800ad189';

DELETE FROM invitations
WHERE organization_id = '976ab1c8-36e9-45a8-ade6-8f41800ad189';

DELETE FROM organization_domains
WHERE organization_id = '976ab1c8-36e9-45a8-ade6-8f41800ad189';

DELETE FROM organization_settings
WHERE organization_id = '976ab1c8-36e9-45a8-ade6-8f41800ad189';

DELETE FROM teams
WHERE organization_id = '976ab1c8-36e9-45a8-ade6-8f41800ad189';

DELETE FROM work_schedule_templates
WHERE organization_id = '976ab1c8-36e9-45a8-ade6-8f41800ad189';

-- 5. Delete profiles
DELETE FROM profiles
WHERE organization_id = '976ab1c8-36e9-45a8-ade6-8f41800ad189';

-- 6. Delete user_organizations
DELETE FROM user_organizations
WHERE organization_id = '976ab1c8-36e9-45a8-ade6-8f41800ad189';

-- 7. Delete subscriptions
DELETE FROM subscriptions
WHERE organization_id = '976ab1c8-36e9-45a8-ade6-8f41800ad189';

-- 8. Finally delete the organization
DELETE FROM organizations
WHERE id = '976ab1c8-36e9-45a8-ade6-8f41800ad189';

-- Re-enable the trigger
ALTER TABLE leave_types ENABLE TRIGGER trg_prevent_mandatory_deletion;

-- Verify deletion
DO $$
DECLARE
  org_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = '976ab1c8-36e9-45a8-ade6-8f41800ad189')
  INTO org_exists;

  IF org_exists THEN
    RAISE EXCEPTION 'Organization still exists after deletion!';
  ELSE
    RAISE NOTICE '✅ testlemoniady organization successfully deleted';
  END IF;
END $$;

COMMIT;
