-- Migration: Add audit trail columns to leave_requests table
-- Purpose: Track admin/manager edits to leave requests for Phase 2.12
-- Date: 2025-11-06

-- Add audit trail columns to leave_requests table
ALTER TABLE leave_requests
ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Add index for efficient queries on edited_by
CREATE INDEX IF NOT EXISTS idx_leave_requests_edited_by ON leave_requests(edited_by);

-- Add comment for documentation
COMMENT ON COLUMN leave_requests.edited_by IS 'User ID of admin/manager who last edited this request (NULL if never edited)';
COMMENT ON COLUMN leave_requests.edited_at IS 'Timestamp of last edit by admin/manager (NULL if never edited)';
