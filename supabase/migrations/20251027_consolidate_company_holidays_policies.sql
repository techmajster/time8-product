-- Phase 6 Part 2 - Task 1/15: Consolidate company_holidays RLS Policies
-- Advisory: Resolves 20 multiple_permissive_policies warnings
-- Risk Level: MEDIUM - Changes RLS evaluation, requires testing
-- Date: 2025-10-27

-- IMPORTANT: This consolidates multiple permissive policies into single policies
-- Before: 6 policies for SELECT (all evaluated)
-- After: 1 policy for SELECT (evaluated once)

-- =============================================================================
-- STEP 1: Drop ALL existing policies on company_holidays
-- =============================================================================

DROP POLICY IF EXISTS "Users can view holidays" ON public.company_holidays;
DROP POLICY IF EXISTS "Users can view organization holidays" ON public.company_holidays;
DROP POLICY IF EXISTS "Admins can manage holidays" ON public.company_holidays;
DROP POLICY IF EXISTS "Service role has full access" ON public.company_holidays;
DROP POLICY IF EXISTS "manage_holidays" ON public.company_holidays;
DROP POLICY IF EXISTS "view_holidays" ON public.company_holidays;

-- =============================================================================
-- STEP 2: Create consolidated policies (ONE per action)
-- =============================================================================

-- SELECT Policy: Consolidates all read access
CREATE POLICY "company_holidays_select_policy"
ON public.company_holidays
FOR SELECT
USING (
  -- Service role has full access
  ((select auth.jwt())->>'role')::text = 'service_role'
  OR
  -- Users can view holidays in their organization
  EXISTS (
    SELECT 1
    FROM public.user_organizations uo
    WHERE uo.user_id = (select auth.uid())
      AND uo.organization_id = company_holidays.organization_id
      AND uo.is_active = true
  )
);

-- INSERT Policy: Consolidates all insert access
CREATE POLICY "company_holidays_insert_policy"
ON public.company_holidays
FOR INSERT
WITH CHECK (
  -- Service role has full access
  ((select auth.jwt())->>'role')::text = 'service_role'
  OR
  -- Admins can insert holidays for their organization
  EXISTS (
    SELECT 1
    FROM public.user_organizations uo
    WHERE uo.user_id = (select auth.uid())
      AND uo.organization_id = company_holidays.organization_id
      AND uo.role = 'admin'
      AND uo.is_active = true
  )
);

-- UPDATE Policy: Consolidates all update access
CREATE POLICY "company_holidays_update_policy"
ON public.company_holidays
FOR UPDATE
USING (
  -- Service role has full access
  ((select auth.jwt())->>'role')::text = 'service_role'
  OR
  -- Admins can update holidays in their organization
  EXISTS (
    SELECT 1
    FROM public.user_organizations uo
    WHERE uo.user_id = (select auth.uid())
      AND uo.organization_id = company_holidays.organization_id
      AND uo.role = 'admin'
      AND uo.is_active = true
  )
)
WITH CHECK (
  -- Service role has full access
  ((select auth.jwt())->>'role')::text = 'service_role'
  OR
  -- Admins can update holidays in their organization
  EXISTS (
    SELECT 1
    FROM public.user_organizations uo
    WHERE uo.user_id = (select auth.uid())
      AND uo.organization_id = company_holidays.organization_id
      AND uo.role = 'admin'
      AND uo.is_active = true
  )
);

-- DELETE Policy: Consolidates all delete access
CREATE POLICY "company_holidays_delete_policy"
ON public.company_holidays
FOR DELETE
USING (
  -- Service role has full access
  ((select auth.jwt())->>'role')::text = 'service_role'
  OR
  -- Admins can delete holidays in their organization
  EXISTS (
    SELECT 1
    FROM public.user_organizations uo
    WHERE uo.user_id = (select auth.uid())
      AND uo.organization_id = company_holidays.organization_id
      AND uo.role = 'admin'
      AND uo.is_active = true
  )
);

-- =============================================================================
-- STEP 3: Verification
-- =============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Count policies on company_holidays
  SELECT COUNT(*)
  INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'company_holidays';

  -- We should have exactly 4 policies now (one per action)
  IF policy_count != 4 THEN
    RAISE EXCEPTION 'Expected 4 policies on company_holidays, found %', policy_count;
  END IF;

  RAISE NOTICE '✅ Verification passed: company_holidays has 4 consolidated policies';
  RAISE NOTICE '✅ Expected elimination of 20 multiple_permissive_policies warnings';
END $$;
