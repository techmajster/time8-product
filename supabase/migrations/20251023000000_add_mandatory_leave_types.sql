-- =====================================================================================
-- MANDATORY LEAVE TYPES MIGRATION
-- File: 20251023000000_add_mandatory_leave_types.sql
--
-- This migration introduces mandatory leave types system for Polish labor law compliance.
-- Two types (Urlop wypoczynkowy and Urlop bezpłatny) become non-deletable and are
-- automatically created for all organizations.
--
-- Key Features:
-- - Add is_mandatory flag to leave_types table
-- - Mark existing Urlop wypoczynkowy and Urlop bezpłatny as mandatory
-- - Create missing mandatory types for all organizations
-- - Backfill leave balances for existing employees
-- - Prevent deletion of mandatory types via trigger
-- =====================================================================================

-- =====================================================================================
-- STEP 1: Add is_mandatory Column to leave_types Table
-- =====================================================================================

-- Add is_mandatory column with default false
ALTER TABLE leave_types
ADD COLUMN is_mandatory BOOLEAN NOT NULL DEFAULT false;

-- Create index for performance
CREATE INDEX idx_leave_types_mandatory
ON leave_types(organization_id, is_mandatory)
WHERE is_mandatory = true;

-- Add comment for documentation
COMMENT ON COLUMN leave_types.is_mandatory IS
'Indicates whether this leave type is mandatory and cannot be deleted. Used for Polish labor law compliance (Urlop wypoczynkowy and Urlop bezpłatny).';

-- =====================================================================================
-- STEP 2: Backfill Existing Mandatory Types
-- =====================================================================================

-- Mark existing Urlop wypoczynkowy as mandatory
UPDATE leave_types
SET is_mandatory = true
WHERE leave_category = 'annual'
  AND (name ILIKE '%wypoczynkowy%' OR name = 'Urlop wypoczynkowy');

-- Mark existing Urlop bezpłatny as mandatory
UPDATE leave_types
SET is_mandatory = true
WHERE leave_category = 'unpaid'
  AND (name ILIKE '%bezpłatny%' OR name = 'Urlop bezpłatny');

-- =====================================================================================
-- STEP 3: Create Function to Ensure All Workspaces Have Mandatory Types
-- =====================================================================================

CREATE OR REPLACE FUNCTION ensure_mandatory_leave_types(org_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if Urlop wypoczynkowy exists
  IF NOT EXISTS (
    SELECT 1 FROM leave_types
    WHERE organization_id = org_id
      AND leave_category = 'annual'
      AND name ILIKE '%wypoczynkowy%'
  ) THEN
    -- Create it
    INSERT INTO leave_types (
      organization_id,
      name,
      days_per_year,
      color,
      requires_approval,
      requires_balance,
      is_paid,
      leave_category,
      is_mandatory
    ) VALUES (
      org_id,
      'Urlop wypoczynkowy',
      20,
      '#3B82F6',
      true,
      true,
      true,
      'annual',
      true
    );
  END IF;

  -- Check if Urlop bezpłatny exists
  IF NOT EXISTS (
    SELECT 1 FROM leave_types
    WHERE organization_id = org_id
      AND leave_category = 'unpaid'
      AND name ILIKE '%bezpłatny%'
  ) THEN
    -- Create it
    INSERT INTO leave_types (
      organization_id,
      name,
      days_per_year,
      color,
      requires_approval,
      requires_balance,
      is_paid,
      leave_category,
      is_mandatory
    ) VALUES (
      org_id,
      'Urlop bezpłatny',
      0,
      '#F59E0B',
      true,
      false,
      false,
      'unpaid',
      true
    );
  END IF;
END;
$$;

-- Run for all existing organizations
DO $$
DECLARE
  org_record RECORD;
BEGIN
  RAISE NOTICE 'Ensuring mandatory leave types for all organizations...';

  FOR org_record IN SELECT id, name FROM organizations LOOP
    RAISE NOTICE 'Processing organization: % (ID: %)', org_record.name, org_record.id;
    PERFORM ensure_mandatory_leave_types(org_record.id);
  END LOOP;

  RAISE NOTICE 'Mandatory leave types creation complete.';
END;
$$;

-- =====================================================================================
-- STEP 4: Create Function to Backfill Leave Balances for Existing Employees
-- =====================================================================================

CREATE OR REPLACE FUNCTION backfill_mandatory_leave_balances(org_id UUID)
RETURNS TABLE(
  balances_created INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  user_record RECORD;
  type_record RECORD;
  balances_count INTEGER := 0;
BEGIN
  -- Loop through all active users in the organization
  FOR user_record IN
    SELECT DISTINCT uo.user_id
    FROM user_organizations uo
    WHERE uo.organization_id = org_id
      AND uo.is_active = true
  LOOP
    -- Loop through all mandatory leave types in the organization
    FOR type_record IN
      SELECT lt.id, lt.days_per_year, lt.requires_balance
      FROM leave_types lt
      WHERE lt.organization_id = org_id
        AND lt.is_mandatory = true
        AND lt.days_per_year > 0  -- Only Urlop wypoczynkowy (skip Urlop bezpłatny with 0 days)
    LOOP
      -- Check if balance already exists for this user, type, and year
      IF NOT EXISTS (
        SELECT 1 FROM leave_balances
        WHERE user_id = user_record.user_id
          AND leave_type_id = type_record.id
          AND year = current_year
          AND organization_id = org_id
      ) THEN
        -- Create the missing balance record (remaining_days is auto-generated)
        INSERT INTO leave_balances (
          user_id,
          leave_type_id,
          year,
          entitled_days,
          used_days,
          organization_id
        ) VALUES (
          user_record.user_id,
          type_record.id,
          current_year,
          type_record.days_per_year,  -- Use workspace default
          0,  -- No days used yet
          org_id
        );

        balances_count := balances_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  -- Return summary
  RETURN QUERY SELECT balances_count;
END;
$$;

-- Run backfill for all existing organizations
DO $$
DECLARE
  org_record RECORD;
  backfill_result INTEGER;
  total_created INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting leave balance backfill for mandatory types...';

  FOR org_record IN SELECT id, name FROM organizations LOOP
    RAISE NOTICE 'Processing organization: % (ID: %)', org_record.name, org_record.id;

    -- Call backfill function
    SELECT * INTO backfill_result FROM backfill_mandatory_leave_balances(org_record.id);

    total_created := total_created + backfill_result;

    IF backfill_result > 0 THEN
      RAISE NOTICE '  → Created % balance records', backfill_result;
    ELSE
      RAISE NOTICE '  → No missing balances';
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill complete. Total balances created: %', total_created;
END;
$$;

-- =====================================================================================
-- STEP 5: Create Trigger to Prevent Deletion of Mandatory Types
-- =====================================================================================

-- Create trigger function to prevent deletion of mandatory types
CREATE OR REPLACE FUNCTION prevent_mandatory_leave_type_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_mandatory = true THEN
    RAISE EXCEPTION 'Cannot delete mandatory leave type: %. This type is required by Polish labor law.', OLD.name
      USING HINT = 'Mandatory leave types (Urlop wypoczynkowy and Urlop bezpłatny) cannot be deleted.',
            ERRCODE = 'restrict_violation';
  END IF;
  RETURN OLD;
END;
$$;

-- Create trigger
CREATE TRIGGER trg_prevent_mandatory_deletion
BEFORE DELETE ON leave_types
FOR EACH ROW
EXECUTE FUNCTION prevent_mandatory_leave_type_deletion();

-- =====================================================================================
-- STEP 6: Update RLS Policy Comments for Documentation
-- =====================================================================================

COMMENT ON POLICY "Users can view leave types for their organization" ON leave_types IS
'Allows all organization members to view leave types, including mandatory types.';

COMMENT ON POLICY "Admins can manage leave types in their organization" ON leave_types IS
'Allows admins to create, update, and delete leave types. Deletion of mandatory types is prevented by trigger, not RLS.';

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================

-- Verification queries (commented out - run manually if needed)
/*
-- Verify mandatory types exist for all orgs
SELECT
  o.id as org_id,
  o.name as org_name,
  COUNT(*) FILTER (WHERE lt.is_mandatory = true) as mandatory_count,
  STRING_AGG(lt.name, ', ') FILTER (WHERE lt.is_mandatory = true) as mandatory_types
FROM organizations o
LEFT JOIN leave_types lt ON lt.organization_id = o.id
GROUP BY o.id, o.name
HAVING COUNT(*) FILTER (WHERE lt.is_mandatory = true) < 2;

-- Verify balances exist for all active employees
SELECT
  o.name as organization,
  COUNT(DISTINCT uo.user_id) as total_active_employees,
  COUNT(DISTINCT CASE WHEN lb.id IS NULL THEN uo.user_id END) as employees_missing_balances
FROM organizations o
JOIN user_organizations uo ON uo.organization_id = o.id AND uo.is_active = true
CROSS JOIN leave_types lt
LEFT JOIN leave_balances lb ON lb.user_id = uo.user_id
  AND lb.leave_type_id = lt.id
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND lb.organization_id = o.id
WHERE lt.is_mandatory = true
  AND lt.organization_id = o.id
  AND lt.days_per_year > 0
GROUP BY o.name
ORDER BY employees_missing_balances DESC;
*/
