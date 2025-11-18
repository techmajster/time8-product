-- Cleanup work_mode column migration conflict
-- This migration resolves the conflict between work_mode and work_schedule_type columns
-- that was causing production workspace creation failures

-- Step 1: Migrate any existing work_mode = 'monday_to_friday' to work_schedule_type = 'daily'
-- This ensures data consistency before dropping the old column
UPDATE organizations
SET work_schedule_type = 'daily'
WHERE work_mode = 'monday_to_friday'
  AND (work_schedule_type IS NULL OR work_schedule_type != 'daily');

-- Step 2: Ensure work_schedule_type is set for all organizations
-- Any organization with work_mode = 'multi_shift' should already have work_schedule_type = 'multi_shift'
UPDATE organizations
SET work_schedule_type = COALESCE(work_schedule_type, 'daily')
WHERE work_schedule_type IS NULL;

-- Step 3: Drop the old work_mode column and its constraint
-- First drop the constraint
ALTER TABLE organizations
DROP CONSTRAINT IF EXISTS organizations_work_mode_check;

-- Then drop the column
ALTER TABLE organizations
DROP COLUMN IF EXISTS work_mode;

-- Step 4: Verify work_schedule_type constraint is in place
-- This constraint should already exist from 20251117113000_add_work_schedule_config.sql
-- But we ensure it exists here for safety
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organizations_work_schedule_type_check'
  ) THEN
    ALTER TABLE organizations
    ADD CONSTRAINT organizations_work_schedule_type_check
    CHECK (work_schedule_type = ANY (ARRAY['daily'::text, 'multi_shift'::text]));
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN organizations.work_schedule_type IS 'Work schedule type: daily (Praca codzienna) or multi_shift (Praca według grafiku). Replaces deprecated work_mode column.';
