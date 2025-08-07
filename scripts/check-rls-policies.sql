-- RLS Policy Audit for Multi-Organization Support
-- This script checks all tables for proper RLS configuration

-- 1. Check which tables have RLS enabled
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE '\_%'
  AND tablename != 'schema_migrations'
ORDER BY 
  CASE WHEN rowsecurity THEN 1 ELSE 0 END,
  tablename;

-- 2. Check policies for each table with RLS enabled
SELECT 
  schemaname,
  tablename as table_name,
  policyname as policy_name,
  CASE permissive 
    WHEN 'PERMISSIVE' THEN '✅ Permissive'
    ELSE '⚠️ Restrictive'
  END as policy_type,
  roles,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Check which tables have organization_id column (should have multi-org RLS)
SELECT 
  t.table_name,
  CASE 
    WHEN c.column_name IS NOT NULL THEN '✅ Has organization_id'
    ELSE '❌ No organization_id'
  END as org_column_status,
  CASE 
    WHEN pt.rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as rls_status,
  COUNT(p.policyname) as policy_count
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
  ON t.table_name = c.table_name 
  AND t.table_schema = c.table_schema
  AND c.column_name = 'organization_id'
LEFT JOIN pg_tables pt 
  ON t.table_name = pt.tablename 
  AND t.table_schema = pt.schemaname
LEFT JOIN pg_policies p 
  ON t.table_name = p.tablename 
  AND t.table_schema = p.schemaname
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND t.table_name NOT LIKE '\_%'
  AND t.table_name != 'schema_migrations'
GROUP BY t.table_name, c.column_name, pt.rowsecurity
ORDER BY 
  CASE WHEN c.column_name IS NOT NULL THEN 0 ELSE 1 END,
  t.table_name;

-- 4. Find policies that check for organization_id
SELECT 
  tablename,
  policyname,
  CASE 
    WHEN qual LIKE '%organization_id%' THEN '✅ Checks org_id'
    WHEN qual LIKE '%user_organizations%' THEN '✅ Checks via user_orgs'
    ELSE '⚠️ No org check'
  END as org_isolation,
  qual as policy_definition
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    tablename IN (
      SELECT table_name 
      FROM information_schema.columns 
      WHERE column_name = 'organization_id' 
      AND table_schema = 'public'
    )
  )
ORDER BY 
  CASE 
    WHEN qual LIKE '%organization_id%' OR qual LIKE '%user_organizations%' 
    THEN 0 ELSE 1 
  END,
  tablename, 
  policyname;

-- 5. Critical tables that MUST have organization-based RLS
WITH critical_tables AS (
  SELECT unnest(ARRAY[
    'leave_requests',
    'leave_balances', 
    'leave_types',
    'teams',
    'invitations',
    'user_organizations',
    'company_holidays',
    'working_schedules',
    'working_days'
  ]) as table_name
)
SELECT 
  ct.table_name,
  CASE 
    WHEN pt.rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as rls_status,
  COUNT(p.policyname) as policy_count,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies pp 
      WHERE pp.tablename = ct.table_name 
      AND pp.schemaname = 'public'
      AND (pp.qual LIKE '%organization_id%' OR pp.qual LIKE '%user_organizations%')
    ) THEN '✅ Has org isolation'
    ELSE '❌ Missing org isolation'
  END as org_isolation_status
FROM critical_tables ct
LEFT JOIN pg_tables pt 
  ON ct.table_name = pt.tablename 
  AND pt.schemaname = 'public'
LEFT JOIN pg_policies p 
  ON ct.table_name = p.tablename 
  AND p.schemaname = 'public'
GROUP BY ct.table_name, pt.rowsecurity
ORDER BY 
  CASE WHEN pt.rowsecurity THEN 1 ELSE 0 END,
  ct.table_name;

-- 6. Summary report
WITH rls_summary AS (
  SELECT 
    COUNT(*) FILTER (WHERE rowsecurity) as tables_with_rls,
    COUNT(*) FILTER (WHERE NOT rowsecurity) as tables_without_rls,
    COUNT(*) as total_tables
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename NOT LIKE '\_%'
    AND tablename != 'schema_migrations'
),
org_tables AS (
  SELECT COUNT(DISTINCT table_name) as org_table_count
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND column_name = 'organization_id'
),
org_policies AS (
  SELECT COUNT(DISTINCT tablename) as tables_with_org_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (qual LIKE '%organization_id%' OR qual LIKE '%user_organizations%')
)
SELECT 
  'RLS Coverage' as metric,
  tables_with_rls || '/' || total_tables || ' tables' as value,
  ROUND((tables_with_rls::numeric / total_tables) * 100, 1) || '%' as percentage
FROM rls_summary
UNION ALL
SELECT 
  'Org Tables with Policies' as metric,
  tables_with_org_policies || '/' || org_table_count || ' tables' as value,
  ROUND((tables_with_org_policies::numeric / NULLIF(org_table_count, 0)) * 100, 1) || '%' as percentage
FROM org_tables, org_policies
UNION ALL
SELECT 
  'Tables without RLS' as metric,
  tables_without_rls || ' tables' as value,
  'Needs attention' as percentage
FROM rls_summary
WHERE tables_without_rls > 0;