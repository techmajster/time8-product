-- CRITICAL FIX: Force drop work_mode column that's blocking organization creation
-- This migration MUST be run to fix production

-- Step 1: Drop the CHECK constraint first
DO $$
BEGIN
  ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_work_mode_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Step 2: Migrate any remaining work_mode data to work_schedule_type
UPDATE organizations
SET work_schedule_type = 'daily'
WHERE work_mode = 'monday_to_friday'
  AND (work_schedule_type IS NULL OR work_schedule_type = 'monday_to_friday');

UPDATE organizations
SET work_schedule_type = 'multi_shift'
WHERE work_mode = 'multi_shift'
  AND (work_schedule_type IS NULL OR work_schedule_type != 'multi_shift');

-- Step 3: Now drop the work_mode column
ALTER TABLE organizations DROP COLUMN IF EXISTS work_mode;

-- Step 4: Ensure work_schedule_type has default
ALTER TABLE organizations
  ALTER COLUMN work_schedule_type SET DEFAULT 'daily';

-- Step 5: Set any NULL values to 'daily'
UPDATE organizations
SET work_schedule_type = 'daily'
WHERE work_schedule_type IS NULL;

-- Verify the fix
DO $$
DECLARE
  work_mode_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'organizations'
      AND column_name = 'work_mode'
  ) INTO work_mode_exists;

  IF work_mode_exists THEN
    RAISE EXCEPTION 'CRITICAL: work_mode column still exists after migration!';
  ELSE
    RAISE NOTICE '✅ SUCCESS: work_mode column successfully dropped';
  END IF;
END $$;
