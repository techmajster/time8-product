-- Migration: Add 'completed' status to leave_requests
-- Description: Adds a new status value 'completed' to track leave requests that have finished
-- The completed status will be automatically set by a cron job for approved requests where end_date < today

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_status_check;

-- Step 2: Add the new CHECK constraint with 'completed' status
ALTER TABLE leave_requests
  ADD CONSTRAINT leave_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed'));

-- Step 3: Create an index for completed status queries
CREATE INDEX IF NOT EXISTS idx_leave_requests_completed_status
  ON leave_requests(status, end_date)
  WHERE status = 'approved';

COMMENT ON INDEX idx_leave_requests_completed_status IS
  'Optimizes the daily cron job that updates approved requests to completed status based on end_date';

-- Step 4: Create a function to update completed status
CREATE OR REPLACE FUNCTION update_completed_leave_requests()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update approved leave requests that have ended
  UPDATE leave_requests
  SET
    status = 'completed',
    updated_at = NOW()
  WHERE
    status = 'approved'
    AND end_date < CURRENT_DATE
    AND status != 'completed';

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION update_completed_leave_requests() IS
  'Updates approved leave requests to completed status when their end_date has passed. Returns the number of updated records.';

-- Grant execute permission to authenticated users (will be called by cron API)
GRANT EXECUTE ON FUNCTION update_completed_leave_requests() TO authenticated;
