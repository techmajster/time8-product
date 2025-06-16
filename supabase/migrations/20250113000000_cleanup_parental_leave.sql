-- Cleanup migration: Remove parental leave request workflow
-- This migration removes the parental_leave_requests table and children_count column
-- since we've simplified to direct admin management of parental leave balances

-- Drop the parental_leave_requests table and its policies
DROP TABLE IF EXISTS parental_leave_requests;

-- Remove children_count column from profiles table (optional - keep if you want to preserve data)
-- ALTER TABLE profiles DROP COLUMN IF EXISTS children_count;

-- Note: We're keeping the children_count column in case you want to reference it later
-- but the application no longer uses it. You can uncomment the ALTER TABLE line above
-- if you want to completely remove it from the database. 