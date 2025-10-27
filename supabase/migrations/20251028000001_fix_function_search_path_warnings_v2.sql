-- =====================================================================================
-- FIX FUNCTION SEARCH PATH WARNINGS (Version 2)
-- File: 20251028000001_fix_function_search_path_warnings_v2.sql
--
-- This migration fixes all "function_search_path_mutable" security warnings by
-- adding explicit search_path settings to all affected functions using ALTER FUNCTION.
--
-- This approach preserves existing function signatures and just adds the security setting.
-- =====================================================================================

BEGIN;

-- 1. update_design_themes_updated_at
ALTER FUNCTION public.update_design_themes_updated_at() SET search_path = 'pg_catalog', 'public';

-- 2. update_access_requests_updated_at
ALTER FUNCTION public.update_access_requests_updated_at() SET search_path = 'pg_catalog', 'public';

-- 3. auto_expire_join_requests
ALTER FUNCTION public.auto_expire_join_requests() SET search_path = 'pg_catalog', 'public';

-- 4. fix_workspace_owners_balances (takes boolean parameter)
ALTER FUNCTION public.fix_workspace_owners_balances(boolean) SET search_path = 'pg_catalog', 'public';

-- 5. migrate_to_multi_org
ALTER FUNCTION public.migrate_to_multi_org() SET search_path = 'pg_catalog', 'public';

-- 6. ensure_mandatory_leave_types (takes uuid parameter)
ALTER FUNCTION public.ensure_mandatory_leave_types(uuid) SET search_path = 'pg_catalog', 'public';

-- 7. validate_multi_org_migration
ALTER FUNCTION public.validate_multi_org_migration() SET search_path = 'pg_catalog', 'public';

-- 8. rollback_multi_org_migration
ALTER FUNCTION public.rollback_multi_org_migration() SET search_path = 'pg_catalog', 'public';

-- 9. backfill_mandatory_leave_balances (takes uuid parameter)
ALTER FUNCTION public.backfill_mandatory_leave_balances(uuid) SET search_path = 'pg_catalog', 'public';

-- 10. calculate_easter (takes integer parameter)
ALTER FUNCTION public.calculate_easter(integer) SET search_path = 'pg_catalog', 'public';

-- 11. prevent_mandatory_leave_type_deletion
ALTER FUNCTION public.prevent_mandatory_leave_type_deletion() SET search_path = 'pg_catalog', 'public';

-- 12. update_updated_at_column
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'pg_catalog', 'public';

COMMIT;

-- =====================================================================================
-- VERIFICATION QUERY
-- =====================================================================================

-- Check that all functions now have search_path set
SELECT
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE
    WHEN p.proconfig IS NOT NULL THEN 'HAS SEARCH_PATH ✓'
    ELSE 'MISSING SEARCH_PATH ✗'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'update_design_themes_updated_at',
    'update_access_requests_updated_at',
    'auto_expire_join_requests',
    'fix_workspace_owners_balances',
    'migrate_to_multi_org',
    'ensure_mandatory_leave_types',
    'validate_multi_org_migration',
    'rollback_multi_org_migration',
    'backfill_mandatory_leave_balances',
    'calculate_easter',
    'prevent_mandatory_leave_type_deletion',
    'update_updated_at_column'
  )
ORDER BY p.proname;
