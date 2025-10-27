-- =====================================================================================
-- ROLLBACK FUNCTION SEARCH PATH CHANGES
-- File: 20251028000003_rollback_function_search_path.sql
--
-- This migration rolls back the search_path changes that were causing issues.
-- The search_path setting on functions was too restrictive and needs more careful testing.
-- =====================================================================================

BEGIN;

-- Remove search_path from all 12 functions
ALTER FUNCTION public.update_design_themes_updated_at() RESET search_path;
ALTER FUNCTION public.update_access_requests_updated_at() RESET search_path;
ALTER FUNCTION public.auto_expire_join_requests() RESET search_path;
ALTER FUNCTION public.fix_workspace_owners_balances(boolean) RESET search_path;
ALTER FUNCTION public.migrate_to_multi_org() RESET search_path;
ALTER FUNCTION public.ensure_mandatory_leave_types(uuid) RESET search_path;
ALTER FUNCTION public.validate_multi_org_migration() RESET search_path;
ALTER FUNCTION public.rollback_multi_org_migration() RESET search_path;
ALTER FUNCTION public.backfill_mandatory_leave_balances(uuid) RESET search_path;
ALTER FUNCTION public.calculate_easter(integer) RESET search_path;
ALTER FUNCTION public.prevent_mandatory_leave_type_deletion() RESET search_path;
ALTER FUNCTION public.update_updated_at_column() RESET search_path;

COMMIT;
