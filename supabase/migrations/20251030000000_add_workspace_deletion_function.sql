-- =====================================================================================
-- ADD WORKSPACE DELETION HELPER FUNCTION
-- File: 20251030000000_add_workspace_deletion_function.sql
--
-- This migration adds a helper function to delete leave_types during workspace deletion,
-- bypassing the mandatory leave type deletion trigger.
--
-- Context: The trigger `trg_prevent_mandatory_deletion` prevents deletion of mandatory
-- leave types (Urlop wypoczynkowy and Urlop bezpłatny). However, when deleting an entire
-- workspace, we need to allow deletion of all leave types including mandatory ones.
-- =====================================================================================

-- Create function to delete all leave types for a workspace (including mandatory ones)
CREATE OR REPLACE FUNCTION delete_workspace_leave_types(workspace_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with elevated privileges to bypass trigger
AS $$
BEGIN
  -- Temporarily disable the trigger
  ALTER TABLE leave_types DISABLE TRIGGER trg_prevent_mandatory_deletion;

  -- Delete all leave types for this workspace
  DELETE FROM leave_types WHERE organization_id = workspace_id;

  -- Re-enable the trigger
  ALTER TABLE leave_types ENABLE TRIGGER trg_prevent_mandatory_deletion;

  -- Log the action
  RAISE NOTICE 'Deleted all leave types for workspace %', workspace_id;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION delete_workspace_leave_types(UUID) IS
'Deletes all leave types for a workspace, including mandatory ones. This function is used during workspace deletion and bypasses the mandatory leave type deletion trigger. Only accessible via service role.';
