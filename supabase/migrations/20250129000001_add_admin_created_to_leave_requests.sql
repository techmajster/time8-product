-- Add admin_created column to leave_requests table
ALTER TABLE leave_requests ADD COLUMN admin_created BOOLEAN DEFAULT FALSE;

-- Add index for performance when filtering admin-created requests
CREATE INDEX idx_leave_requests_admin_created ON leave_requests(admin_created);

-- Add comment for documentation
COMMENT ON COLUMN leave_requests.admin_created IS 'Indicates if this leave request was created by an admin/manager for another employee'; 