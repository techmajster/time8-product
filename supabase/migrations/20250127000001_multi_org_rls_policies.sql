-- =====================================================================================
-- MULTI-ORGANIZATION RLS POLICIES MIGRATION
-- File: 20250127000001_multi_org_rls_policies.sql
-- 
-- This migration creates comprehensive RLS (Row Level Security) policies for the new
-- multi-organization tables and provides utilities to update existing policies.
--
-- Key Features:
-- - Secure access control for user-organization relationships
-- - Organization-scoped data access
-- - Admin privilege management
-- - GDPR-compliant join request handling
-- - Backward compatibility with existing single-org patterns
-- =====================================================================================

-- =====================================================================================
-- ENABLE RLS ON NEW TABLES
-- =====================================================================================

-- Enable RLS on all new multi-organization tables
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- Also ensure public_email_domains is properly secured (reference data)
ALTER TABLE public_email_domains ENABLE ROW LEVEL SECURITY;

-- =====================================================================================
-- USER_ORGANIZATIONS TABLE POLICIES
-- =====================================================================================

-- Policy 1: Users can view their own organization memberships
CREATE POLICY "Users can view their organizations"
  ON user_organizations FOR SELECT
  USING (
    user_id = auth.uid() 
    AND is_active = true
  );

-- Policy 2: Admins can manage organization members within their organizations
CREATE POLICY "Admins can manage organization members"
  ON user_organizations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = user_organizations.organization_id
        AND uo.role = 'admin'
        AND uo.is_active = true
    )
  );

-- Policy 3: Users can update their own membership settings (like default org)
CREATE POLICY "Users can update their membership settings"
  ON user_organizations FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() 
    AND is_active = true
    AND (
      -- Users can only change non-critical fields
      COALESCE(OLD.organization_id, '') = COALESCE(NEW.organization_id, '')
      AND COALESCE(OLD.role, '') = COALESCE(NEW.role, '')
      AND COALESCE(OLD.user_id, '') = COALESCE(NEW.user_id, '')
    )
  );

-- Policy 4: Managers can view team members in their organization
CREATE POLICY "Managers can view team members"
  ON user_organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = user_organizations.organization_id
        AND uo.role IN ('admin', 'manager')
        AND uo.is_active = true
    )
  );

-- =====================================================================================
-- ORGANIZATION_DOMAINS TABLE POLICIES
-- =====================================================================================

-- Policy 1: Organization members can view domains for discovery
CREATE POLICY "Organization members can view domains"
  ON organization_domains FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = organization_domains.organization_id
        AND uo.is_active = true
    )
  );

-- Policy 2: Only admins can manage organization domains
CREATE POLICY "Only admins can manage domains"
  ON organization_domains FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = organization_domains.organization_id
        AND uo.role = 'admin'
        AND uo.is_active = true
    )
  );

-- Policy 3: Public read access for domain discovery (with limits)
CREATE POLICY "Public domain discovery"
  ON organization_domains FOR SELECT
  USING (
    auto_join_enabled = true
    AND is_verified = true
    AND domain_type = 'google'
  );

-- =====================================================================================
-- JOIN_REQUESTS TABLE POLICIES
-- =====================================================================================

-- Policy 1: Users can create join requests for themselves
CREATE POLICY "Users can create join requests"
  ON join_requests FOR INSERT
  WITH CHECK (
    (profile_id = auth.uid()) OR 
    (profile_id IS NULL AND email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    ))
  );

-- Policy 2: Users can view their own join requests
CREATE POLICY "Users can view their own requests"
  ON join_requests FOR SELECT
  USING (
    profile_id = auth.uid() OR 
    email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Policy 3: Admins can manage join requests for their organization
CREATE POLICY "Admins can manage join requests"
  ON join_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = join_requests.organization_id
        AND uo.role = 'admin'
        AND uo.is_active = true
    )
  );

-- Policy 4: Auto-cleanup for expired requests (system policy)
CREATE POLICY "System can cleanup expired requests"
  ON join_requests FOR DELETE
  USING (
    expires_at < NOW()
    AND status = 'pending'
  );

-- =====================================================================================
-- ORGANIZATION_SETTINGS TABLE POLICIES
-- =====================================================================================

-- Policy 1: Organization members can view settings
CREATE POLICY "Organization members can view settings"
  ON organization_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = organization_settings.organization_id
        AND uo.is_active = true
    )
  );

-- Policy 2: Only admins can modify organization settings
CREATE POLICY "Only admins can modify organization settings"
  ON organization_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = organization_settings.organization_id
        AND uo.role = 'admin'
        AND uo.is_active = true
    )
  );

-- =====================================================================================
-- PUBLIC_EMAIL_DOMAINS TABLE POLICIES
-- =====================================================================================

-- Policy 1: Everyone can read public email domains (reference data)
CREATE POLICY "Public read access to email domains"
  ON public_email_domains FOR SELECT
  USING (true);

-- Policy 2: Only system/admin can modify public email domains
CREATE POLICY "Only system can modify public email domains"
  ON public_email_domains FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- =====================================================================================
-- UTILITY FUNCTIONS FOR POLICY UPDATES
-- =====================================================================================

-- Function to identify existing policies that need updates for multi-org support
CREATE OR REPLACE FUNCTION analyze_existing_rls_policies()
RETURNS TABLE(
  schema_name TEXT,
  table_name TEXT,
  policy_name TEXT,
  policy_command TEXT,
  needs_update BOOLEAN,
  reason TEXT,
  suggested_action TEXT
) AS $$
DECLARE
  policy_record RECORD;
  update_needed BOOLEAN;
  update_reason TEXT;
  suggested_fix TEXT;
BEGIN
  -- Analyze all existing RLS policies
  FOR policy_record IN 
    SELECT 
      schemaname,
      tablename,
      policyname,
      polcmd,
      polroles,
      polqual,
      polwithcheck
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    update_needed := false;
    update_reason := '';
    suggested_fix := '';
    
    -- Check if policy references old single-org patterns
    IF (policy_record.polqual::text LIKE '%profiles.organization_id%' 
        OR policy_record.polwithcheck::text LIKE '%profiles.organization_id%') THEN
      update_needed := true;
      update_reason := 'References profiles.organization_id directly';
      suggested_fix := 'Use user_organizations table for organization membership checks';
    END IF;
    
    IF (policy_record.polqual::text LIKE '%profiles.role%' 
        OR policy_record.polwithcheck::text LIKE '%profiles.role%') THEN
      update_needed := true;
      update_reason := CASE 
        WHEN update_reason = '' THEN 'References profiles.role directly'
        ELSE update_reason || '; References profiles.role directly'
      END;
      suggested_fix := CASE 
        WHEN suggested_fix = '' THEN 'Use user_organizations.role for organization-specific roles'
        ELSE suggested_fix || '; Use user_organizations.role for organization-specific roles'
      END;
    END IF;
    
    -- Check for organization-related tables that might need updates
    IF policy_record.tablename IN (
      'leave_requests', 'teams', 'invitations', 'leave_balances', 
      'schedules', 'schedule_templates', 'holidays', 'notifications'
    ) AND NOT update_needed THEN
      update_needed := true;
      update_reason := 'Organization-related table may need multi-org support';
      suggested_fix := 'Review policy to ensure proper organization scoping';
    END IF;
    
    -- Return analysis results
    RETURN QUERY SELECT 
      policy_record.schemaname::TEXT,
      policy_record.tablename::TEXT,
      policy_record.policyname::TEXT,
      policy_record.polcmd::TEXT,
      update_needed,
      update_reason,
      suggested_fix;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get current user's organizations (helper for policy updates)
CREATE OR REPLACE FUNCTION get_user_organizations(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(organization_id UUID, role TEXT, is_default BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uo.organization_id,
    uo.role,
    uo.is_default
  FROM user_organizations uo
  WHERE uo.user_id = user_uuid
    AND uo.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin in organization
CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_organizations uo
    WHERE uo.user_id = user_uuid
      AND uo.organization_id = org_id
      AND uo.role = 'admin'
      AND uo.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is member of organization
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_organizations uo
    WHERE uo.user_id = user_uuid
      AND uo.organization_id = org_id
      AND uo.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- CRITICAL POLICY UPDATES FOR EXISTING TABLES
-- =====================================================================================

-- These are the most critical policy updates based on the 67 API files analysis

-- ==================================================================================
-- LEAVE_REQUESTS TABLE POLICY UPDATES
-- ==================================================================================

-- Drop old policies that reference profiles.organization_id directly
DROP POLICY IF EXISTS "Users can view their leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can view organization leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can manage leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Managers can view team leave requests" ON leave_requests;

-- Create new multi-org compatible policies for leave_requests
CREATE POLICY "Users can view leave requests in their organizations"
  ON leave_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = leave_requests.organization_id
        AND uo.is_active = true
    )
  );

CREATE POLICY "Users can create their own leave requests"
  ON leave_requests FOR INSERT
  WITH CHECK (
    employee_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = leave_requests.organization_id
        AND uo.is_active = true
    )
  );

CREATE POLICY "Users can update their own pending leave requests"
  ON leave_requests FOR UPDATE
  USING (
    employee_id = auth.uid()
    AND status = 'pending'
  )
  WITH CHECK (
    employee_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = leave_requests.organization_id
        AND uo.is_active = true
    )
  );

CREATE POLICY "Admins and managers can manage leave requests"
  ON leave_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = leave_requests.organization_id
        AND uo.role IN ('admin', 'manager')
        AND uo.is_active = true
    )
  );

-- ==================================================================================
-- TEAMS TABLE POLICY UPDATES  
-- ==================================================================================

-- Drop old team policies
DROP POLICY IF EXISTS "Organization members can view teams" ON teams;
DROP POLICY IF EXISTS "Admins can manage teams" ON teams;

-- Create new multi-org compatible team policies
CREATE POLICY "Organization members can view teams"
  ON teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = teams.organization_id
        AND uo.is_active = true
    )
  );

CREATE POLICY "Admins can manage teams"
  ON teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = teams.organization_id
        AND uo.role = 'admin'
        AND uo.is_active = true
    )
  );

-- ==================================================================================
-- INVITATIONS TABLE POLICY UPDATES
-- ==================================================================================

-- Drop old invitation policies
DROP POLICY IF EXISTS "Admins can manage invitations" ON invitations;
DROP POLICY IF EXISTS "Users can view their invitations" ON invitations;

-- Create new multi-org compatible invitation policies
CREATE POLICY "Admins can manage organization invitations"
  ON invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = invitations.organization_id
        AND uo.role = 'admin'
        AND uo.is_active = true
    )
  );

CREATE POLICY "Users can view invitations sent to them"
  ON invitations FOR SELECT
  USING (
    email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- ==================================================================================
-- ORGANIZATIONS TABLE POLICY UPDATES
-- ==================================================================================

-- Drop old organization policies
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Admins can manage organization" ON organizations;

-- Create new multi-org compatible organization policies
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = organizations.id
        AND uo.is_active = true
    )
  );

CREATE POLICY "Admins can manage their organizations"
  ON organizations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = organizations.id
        AND uo.role = 'admin'
        AND uo.is_active = true
    )
  );

-- =====================================================================================
-- RLS POLICY ANALYSIS AND VALIDATION
-- =====================================================================================

-- Create a validation function to test RLS policies
CREATE OR REPLACE FUNCTION validate_rls_policies()
RETURNS TABLE(
  table_name TEXT,
  policy_count INTEGER,
  has_select_policy BOOLEAN,
  has_insert_policy BOOLEAN,
  has_update_policy BOOLEAN,
  has_delete_policy BOOLEAN,
  validation_status TEXT
) AS $$
DECLARE
  table_record RECORD;
  select_count INTEGER;
  insert_count INTEGER;
  update_count INTEGER;
  delete_count INTEGER;
  total_count INTEGER;
  status TEXT;
BEGIN
  -- Check all tables with RLS enabled
  FOR table_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
      AND tablename IN (
        SELECT tablename FROM pg_policies WHERE schemaname = 'public'
      )
  LOOP
    -- Count policies by command type
    SELECT 
      COUNT(*) FILTER (WHERE polcmd = 'SELECT') INTO select_count,
      COUNT(*) FILTER (WHERE polcmd = 'INSERT') INTO insert_count,
      COUNT(*) FILTER (WHERE polcmd = 'UPDATE') INTO update_count,
      COUNT(*) FILTER (WHERE polcmd = 'DELETE') INTO delete_count,
      COUNT(*) INTO total_count
    FROM pg_policies 
    WHERE tablename = table_record.tablename 
      AND schemaname = 'public';
    
    -- Determine validation status
    IF select_count > 0 AND (insert_count > 0 OR update_count > 0) THEN
      status := 'GOOD';
    ELSIF select_count > 0 THEN
      status := 'READ_ONLY';
    ELSIF total_count = 0 THEN
      status := 'NO_POLICIES';
    ELSE
      status := 'INCOMPLETE';
    END IF;
    
    RETURN QUERY SELECT 
      table_record.tablename,
      total_count,
      select_count > 0,
      insert_count > 0,
      update_count > 0,
      delete_count > 0,
      status;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- EXECUTION: RUN ANALYSIS AND VALIDATION
-- =====================================================================================

-- Analyze existing policies that need updates
DO $$
DECLARE
  analysis_record RECORD;
  update_count INTEGER := 0;
  critical_count INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS POLICY ANALYSIS RESULTS';
  RAISE NOTICE '========================================';
  
  FOR analysis_record IN 
    SELECT * FROM analyze_existing_rls_policies() 
    WHERE needs_update = true
    ORDER BY table_name, policy_name
  LOOP
    update_count := update_count + 1;
    
    IF analysis_record.table_name IN ('leave_requests', 'teams', 'invitations', 'organizations') THEN
      critical_count := critical_count + 1;
      RAISE NOTICE 'CRITICAL UPDATE NEEDED: %.% - %', 
        analysis_record.table_name, 
        analysis_record.policy_name,
        analysis_record.reason;
    ELSE
      RAISE NOTICE 'UPDATE NEEDED: %.% - %', 
        analysis_record.table_name, 
        analysis_record.policy_name,
        analysis_record.reason;
    END IF;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUMMARY: % policies need updates (% critical)', update_count, critical_count;
  RAISE NOTICE '========================================';
END $$;

-- Validate RLS policy coverage
DO $$
DECLARE
  validation_record RECORD;
  good_count INTEGER := 0;
  warning_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS POLICY VALIDATION RESULTS';
  RAISE NOTICE '========================================';
  
  FOR validation_record IN 
    SELECT * FROM validate_rls_policies() 
    ORDER BY validation_status DESC, table_name
  LOOP
    CASE validation_record.validation_status
      WHEN 'GOOD' THEN
        good_count := good_count + 1;
        RAISE NOTICE '✅ %: % policies (SELECT: %, INSERT: %, UPDATE: %, DELETE: %)', 
          validation_record.table_name,
          validation_record.policy_count,
          validation_record.has_select_policy,
          validation_record.has_insert_policy,
          validation_record.has_update_policy,
          validation_record.has_delete_policy;
      WHEN 'READ_ONLY' THEN
        warning_count := warning_count + 1;
        RAISE NOTICE '⚠️  %: READ_ONLY (% policies)', 
          validation_record.table_name,
          validation_record.policy_count;
      WHEN 'NO_POLICIES' THEN
        error_count := error_count + 1;
        RAISE NOTICE '❌ %: NO_POLICIES', validation_record.table_name;
      ELSE
        warning_count := warning_count + 1;
        RAISE NOTICE '⚠️  %: % (% policies)', 
          validation_record.table_name,
          validation_record.validation_status,
          validation_record.policy_count;
    END CASE;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VALIDATION SUMMARY: % good, % warnings, % errors', good_count, warning_count, error_count;
  RAISE NOTICE '========================================';
END $$;

-- =====================================================================================
-- MIGRATION COMPLETION LOG
-- =====================================================================================

-- Log this RLS migration
INSERT INTO migration_logs (migration_name, status, details)
VALUES (
  'multi_org_rls_policies',
  'completed',
  jsonb_build_object(
    'description', 'Multi-organization RLS policies created and critical policies updated',
    'new_tables_secured', 5,
    'critical_policies_updated', 4,
    'helper_functions_created', 4,
    'features', jsonb_build_array(
      'user_organizations policies',
      'organization_domains policies', 
      'join_requests policies',
      'organization_settings policies',
      'updated leave_requests policies',
      'updated teams policies',
      'updated invitations policies',
      'updated organizations policies'
    )
  )
);

-- =====================================================================================
-- POLISH COMPLIANCE AND GDPR NOTES
-- =====================================================================================

/*
POLISH LABOR LAW COMPLIANCE NOTES:
=================================

1. USER_ORGANIZATIONS TABLE:
   - employment_type field supports Polish employment categories
   - contract_start_date enables compliance with Polish labor contracts
   - joined_via field provides audit trail for regulatory compliance

2. JOIN_REQUESTS TABLE:
   - gdpr_consent field ensures explicit consent collection
   - auto_expire_join_requests() function ensures 30-day data retention
   - connection_reason field provides transparency for data processing

3. ORGANIZATION_DOMAINS TABLE:
   - Supports Polish business domains (.pl, .com.pl, etc.)
   - Auto-join capabilities for verified company domains
   - GDPR-compliant domain verification process

4. RLS SECURITY:
   - Organization-scoped access ensures data isolation
   - Role-based permissions align with Polish business hierarchies
   - Admin controls enable compliance with Polish data protection regulations

GDPR COMPLIANCE FEATURES:
========================

1. DATA MINIMIZATION:
   - RLS policies ensure users only see necessary data
   - Organization scoping limits data exposure

2. ACCESS CONTROL:
   - Explicit permission checks for all data access
   - Role-based access aligns with GDPR accountability principles

3. AUDIT TRAIL:
   - migration_logs table provides complete operation history
   - join_requests include consent tracking and expiration

4. RIGHT TO BE FORGOTTEN:
   - Cascading deletes ensure complete data removal
   - Organization-scoped policies facilitate selective data deletion
*/ 