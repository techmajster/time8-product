-- Add work mode columns to organizations table
-- This allows organizations to configure their work schedule (5-day, 6-day, 7-day week)

-- Add work_mode column (default to Monday-Friday)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS work_mode TEXT DEFAULT 'monday_to_friday'
CHECK (work_mode IN ('monday_to_friday', 'multi_shift'));

-- Add working_days column (stores array of working day names)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS working_days JSONB DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday"]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN organizations.work_mode IS 'Work schedule type: monday_to_friday (5 days) or multi_shift';
COMMENT ON COLUMN organizations.working_days IS 'Array of working day names (lowercase): ["monday", "tuesday", "wednesday", ...]';

-- Set default values for existing organizations (Monday to Friday)
UPDATE organizations
SET
  work_mode = 'monday_to_friday',
  working_days = '["monday", "tuesday", "wednesday", "thursday", "friday"]'::jsonb
WHERE work_mode IS NULL OR working_days IS NULL;
