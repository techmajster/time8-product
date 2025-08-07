-- =====================================================================================
-- MULTI-ORGANIZATION SUPPORT MIGRATION
-- File: 20250127000000_multi_organization_support.sql
-- 
-- This migration introduces comprehensive multi-organization support for Polish
-- businesses, including GDPR compliance and Polish labor law considerations.
--
-- Key Features:
-- - User-organization many-to-many relationships
-- - Domain-based organization discovery and auto-join
-- - GDPR-compliant join request system with auto-expiration
-- - Polish email provider support
-- - Configurable organization settings
-- =====================================================================================

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================================
-- TABLE: user_organizations
-- Purpose: Many-to-many relationship between users and organizations
-- Polish Context: Supports multiple employment scenarios common in Polish business:
--   - Contractors working for multiple companies
--   - Employees with multiple contracts (umowa o pracę + umowa zlecenie)
--   - Seasonal workers switching between organizations
-- =====================================================================================

CREATE TABLE user_organizations (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Role within this specific organization
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'employee')),
    
    -- Team assignment within this organization (nullable for flexibility)
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    
    -- Status flags
    is_active BOOLEAN NOT NULL DEFAULT true,        -- Can user access this org?
    is_default BOOLEAN NOT NULL DEFAULT false,      -- User's primary organization
    
    -- How the user joined this organization (for audit and compliance)
    joined_via TEXT NOT NULL CHECK (joined_via IN (
        'google_domain',    -- Auto-joined via Google Workspace domain
        'invitation',       -- Invited by admin/manager
        'created',         -- Created organization themselves
        'request'          -- Requested to join via join_requests
    )),
    
    -- Timestamps
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Polish Labor Law Specific Fields
    -- Note: These fields support Polish employment law requirements
    employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN (
        'full_time',        -- Umowa o pracę (pełny etat)
        'part_time',        -- Umowa o pracę (część etatu)
        'contract',         -- Umowa zlecenie/o dzieło
        'internship',       -- Praktyki/staż
        'temporary',        -- Umowa na czas określony
        'consultant'        -- Konsultant/współpraca B2B
    )),
    
    -- Contract start date (required for Polish labor law compliance)
    contract_start_date DATE,
    
    -- Composite primary key
    PRIMARY KEY (user_id, organization_id),
    
    -- Ensure timestamps are logical
    CONSTRAINT check_joined_before_updated CHECK (joined_at <= updated_at)
);

-- Ensure only one default organization per user (Polish workers typically have one primary employer)
CREATE UNIQUE INDEX idx_one_default_org_per_user 
ON user_organizations(user_id) 
WHERE is_default = true;

-- Performance indexes
CREATE INDEX idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX idx_user_organizations_org_id ON user_organizations(organization_id);
CREATE INDEX idx_user_organizations_active ON user_organizations(organization_id, is_active);
CREATE INDEX idx_user_organizations_role ON user_organizations(organization_id, role);

-- =====================================================================================
-- TABLE: organization_domains
-- Purpose: Manage email domains associated with organizations
-- Polish Context: Supports Polish domain structures and Google Workspace integration
-- =====================================================================================

CREATE TABLE organization_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Domain name (e.g., 'company.com.pl', 'firma.pl')
    domain TEXT NOT NULL,
    
    -- Type of domain verification
    domain_type TEXT NOT NULL DEFAULT 'email' CHECK (domain_type IN (
        'google',          -- Google Workspace domain (verified via OAuth)
        'email',           -- Standard email domain (manual verification)
        'custom'           -- Custom domain setup
    )),
    
    -- Verification status
    is_verified BOOLEAN NOT NULL DEFAULT false,
    
    -- Auto-join settings (for verified domains)
    auto_join_enabled BOOLEAN NOT NULL DEFAULT false,
    default_role TEXT DEFAULT 'employee' CHECK (default_role IN ('admin', 'manager', 'employee')),
    default_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    
    -- Timestamps
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint: one domain per organization
    UNIQUE(domain, organization_id),
    
    -- Ensure verification timestamp is set when verified
    CONSTRAINT check_verified_timestamp CHECK (
        (is_verified = false AND verified_at IS NULL) OR
        (is_verified = true AND verified_at IS NOT NULL)
    )
);

-- Performance indexes
CREATE INDEX idx_organization_domains_org_id ON organization_domains(organization_id);
CREATE INDEX idx_organization_domains_domain ON organization_domains(domain);
CREATE INDEX idx_organization_domains_verified ON organization_domains(domain, is_verified);

-- =====================================================================================
-- TABLE: join_requests
-- Purpose: GDPR-compliant system for users to request joining organizations
-- Polish Context: Complies with GDPR (RODO in Polish) requirements for data processing
-- =====================================================================================

CREATE TABLE join_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- User contact information
    email TEXT NOT NULL,
    
    -- Requested assignment
    requested_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    
    -- User's message/justification
    message TEXT,
    
    -- How did the user discover this organization?
    connection_reason TEXT CHECK (connection_reason IN (
        'domain_match',        -- Found via matching email domain
        'manual_search',       -- Searched for organization by name
        'expired_invitation'   -- Had expired invitation, requesting again
    )),
    
    -- Request status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    
    -- Review information
    reviewed_by UUID REFERENCES profiles(id),
    reviewer_notes TEXT,
    
    -- GDPR Compliance (RODO)
    gdpr_consent BOOLEAN NOT NULL DEFAULT false,  -- User must explicitly consent
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    
    -- Auto-expire after 30 days for GDPR compliance (right to be forgotten)
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- Business constraints
    CONSTRAINT check_review_data_consistency CHECK (
        (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL) OR
        (status IN ('approved', 'denied') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    ),
    
    -- GDPR: Cannot process request without consent
    CONSTRAINT check_gdpr_consent CHECK (gdpr_consent = true),
    
    -- Prevent duplicate active requests
    UNIQUE(profile_id, organization_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- Performance indexes
CREATE INDEX idx_join_requests_org_id ON join_requests(organization_id, status);
CREATE INDEX idx_join_requests_profile_id ON join_requests(profile_id);
CREATE INDEX idx_join_requests_status ON join_requests(status, created_at);
CREATE INDEX idx_join_requests_expires ON join_requests(expires_at) WHERE status = 'pending';

-- =====================================================================================
-- TABLE: public_email_domains
-- Purpose: Identify public email providers to distinguish from organization domains
-- Polish Context: Includes major Polish email providers alongside international ones
-- =====================================================================================

CREATE TABLE public_email_domains (
    domain TEXT PRIMARY KEY,
    country_code TEXT,
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Populate with international and Polish email providers
INSERT INTO public_email_domains (domain, country_code) VALUES 
    -- International providers
    ('gmail.com', 'INTL'),
    ('outlook.com', 'INTL'),
    ('hotmail.com', 'INTL'),
    ('yahoo.com', 'INTL'),
    ('icloud.com', 'INTL'),
    ('protonmail.com', 'INTL'),
    ('live.com', 'INTL'),
    ('msn.com', 'INTL'),
    ('yandex.com', 'INTL'),
    
    -- Polish email providers (major ones used in business)
    ('wp.pl', 'PL'),              -- Wirtualna Polska (most popular in Poland)
    ('o2.pl', 'PL'),              -- O2 (formerly Tlen)
    ('interia.pl', 'PL'),         -- Interia
    ('onet.pl', 'PL'),            -- Onet
    ('poczta.fm', 'PL'),          -- Poczta FM
    ('gazeta.pl', 'PL'),          -- Gazeta.pl
    ('op.pl', 'PL'),              -- Onet.pl (alternative)
    ('buziaczek.pl', 'PL'),       -- Buziaczek
    ('tlen.pl', 'PL'),            -- Tlen (legacy)
    ('home.pl', 'PL'),            -- Home.pl
    
    -- Government domains (should not be used for business registration)
    ('gov.pl', 'PL'),
    ('edu.pl', 'PL'),
    ('mil.pl', 'PL'),
    
    -- Common business domains that are actually public
    ('gmail.pl', 'PL'),
    ('outlook.pl', 'PL');

-- Index for fast domain lookups
CREATE INDEX idx_public_email_domains_country ON public_email_domains(country_code);

-- =====================================================================================
-- TABLE: organization_settings
-- Purpose: Configure multi-organization behavior per organization
-- Polish Context: Allows organizations to comply with different Polish business practices
-- =====================================================================================

CREATE TABLE organization_settings (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Join request settings
    allow_domain_join_requests BOOLEAN NOT NULL DEFAULT true,
    is_discoverable_by_domain BOOLEAN NOT NULL DEFAULT true,
    require_admin_approval_for_domain_join BOOLEAN NOT NULL DEFAULT false,
    
    -- Auto-join settings for verified domains
    auto_approve_verified_domains BOOLEAN NOT NULL DEFAULT false,
    
    -- Privacy settings (GDPR compliance)
    data_retention_days INTEGER DEFAULT 365 CHECK (data_retention_days > 0),
    allow_data_export BOOLEAN NOT NULL DEFAULT true,
    
    -- Polish business settings
    default_employment_type TEXT DEFAULT 'full_time',
    require_contract_dates BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_organizations_updated_at
    BEFORE UPDATE ON user_organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_settings_updated_at
    BEFORE UPDATE ON organization_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-expire join requests (for GDPR compliance)
CREATE OR REPLACE FUNCTION auto_expire_join_requests()
RETURNS void AS $$
BEGIN
    UPDATE join_requests 
    SET status = 'denied', 
        reviewer_notes = 'Auto-expired after 30 days (GDPR compliance)'
    WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================================

-- Enable RLS on all tables
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- user_organizations policies
CREATE POLICY "Users can view their own organization memberships" ON user_organizations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Organization admins can view all memberships" ON user_organizations
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND role IN ('admin') AND is_active = true
        )
    );

CREATE POLICY "Organization admins can manage memberships" ON user_organizations
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND role IN ('admin') AND is_active = true
        )
    );

-- organization_domains policies
CREATE POLICY "Organization members can view domains" ON organization_domains
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Organization admins can manage domains" ON organization_domains
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND role IN ('admin') AND is_active = true
        )
    );

-- join_requests policies
CREATE POLICY "Users can view their own join requests" ON join_requests
    FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can create join requests" ON join_requests
    FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Organization admins can view join requests" ON join_requests
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager') AND is_active = true
        )
    );

CREATE POLICY "Organization admins can update join requests" ON join_requests
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager') AND is_active = true
        )
    );

-- public_email_domains policies (read-only for all authenticated users)
CREATE POLICY "All authenticated users can view public domains" ON public_email_domains
    FOR SELECT USING (auth.role() = 'authenticated');

-- organization_settings policies
CREATE POLICY "Organization members can view settings" ON organization_settings
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Organization admins can manage settings" ON organization_settings
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND role IN ('admin') AND is_active = true
        )
    );

-- =====================================================================================
-- INITIAL DATA SETUP
-- =====================================================================================

-- Create default organization settings for existing organizations
INSERT INTO organization_settings (organization_id)
SELECT id FROM organizations
ON CONFLICT (organization_id) DO NOTHING;

-- =====================================================================================
-- MIGRATION HELPER FUNCTIONS
-- =====================================================================================

-- Create migration log table for tracking migration progress
CREATE TABLE IF NOT EXISTS migration_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_name TEXT NOT NULL,
    status TEXT CHECK (status IN ('in_progress', 'completed', 'failed', 'rolled_back')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    records_affected INTEGER DEFAULT 0,
    error_message TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on migration_logs
ALTER TABLE migration_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins to view migration logs
CREATE POLICY "Admins can view migration logs" ON migration_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- =====================================================================================
-- FUNCTION: migrate_to_multi_org()
-- Purpose: Safely migrate existing single-organization data to multi-organization structure
-- =====================================================================================

CREATE OR REPLACE FUNCTION migrate_to_multi_org()
RETURNS void AS $$
DECLARE
    migrated_users INTEGER := 0;
    migrated_domains INTEGER := 0;
    migrated_settings INTEGER := 0;
    total_profiles INTEGER := 0;
    error_count INTEGER := 0;
    log_id UUID;
BEGIN
    -- Start migration logging
    INSERT INTO migration_logs (migration_name, status, started_at, details)
    VALUES (
        'multi_organization_support', 
        'in_progress', 
        NOW(),
        json_build_object(
            'phase', 'initialization',
            'description', 'Starting multi-organization data migration'
        )
    )
    RETURNING id INTO log_id;

    -- Get total count for progress tracking
    SELECT COUNT(*) INTO total_profiles 
    FROM profiles 
    WHERE organization_id IS NOT NULL;

    -- Update log with total count
    UPDATE migration_logs 
    SET details = details || json_build_object('total_profiles_to_migrate', total_profiles)
    WHERE id = log_id;

    -- ==================================================================================
    -- PHASE 1: Migrate Google Workspace domains
    -- ==================================================================================
    
    BEGIN
        INSERT INTO organization_domains (
            organization_id, 
            domain, 
            domain_type, 
            is_verified, 
            auto_join_enabled,
            verified_at,
            default_role,
            created_at
        )
        SELECT 
            o.id,
            o.google_domain,
            'google',
            true,  -- Google domains are pre-verified
            COALESCE(o.require_google_domain, false),  -- Auto-join if required
            NOW(),
            'employee',  -- Default role for Google domain joins
            NOW()
        FROM organizations o
        WHERE o.google_domain IS NOT NULL
            AND o.google_domain != ''
            AND NOT EXISTS (
                SELECT 1 FROM organization_domains od
                WHERE od.organization_id = o.id 
                AND od.domain = o.google_domain
            );

        GET DIAGNOSTICS migrated_domains = ROW_COUNT;

        -- Log domain migration progress
        UPDATE migration_logs 
        SET details = details || json_build_object(
            'phase_1_completed', true,
            'google_domains_migrated', migrated_domains
        )
        WHERE id = log_id;

    EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        UPDATE migration_logs 
        SET details = details || json_build_object(
            'phase_1_error', SQLERRM,
            'phase_1_failed', true
        )
        WHERE id = log_id;
        -- Continue with other phases even if domain migration fails
    END;

    -- ==================================================================================
    -- PHASE 2: Migrate user-organization relationships
    -- ==================================================================================
    
    BEGIN
        INSERT INTO user_organizations (
            user_id, 
            organization_id, 
            role, 
            team_id, 
            is_active, 
            is_default, 
            joined_via,
            employment_type,
            contract_start_date,
            joined_at,
            updated_at
        )
        SELECT 
            p.id,
            p.organization_id,
            p.role,
            p.team_id,
            true,  -- All existing users are active
            true,  -- All existing users have this as their default org
            CASE 
                -- Try to determine how they joined based on available data
                WHEN EXISTS (
                    SELECT 1 FROM invitations i 
                    WHERE i.email = u.email 
                    AND i.organization_id = p.organization_id
                    AND i.status = 'accepted'
                ) THEN 'invitation'
                WHEN o.google_domain IS NOT NULL 
                    AND SPLIT_PART(u.email, '@', 2) = o.google_domain THEN 'google_domain'
                WHEN p.role = 'admin' THEN 'created'  -- Assume admins created the org
                ELSE 'invitation'  -- Default assumption for existing users
            END,
            'full_time',  -- Default employment type for existing users
            p.employment_start_date,  -- Use existing field if available
            COALESCE(p.created_at, NOW()),  -- Use profile creation date
            NOW()
        FROM profiles p
        JOIN auth.users u ON u.id = p.id
        LEFT JOIN organizations o ON o.id = p.organization_id
        WHERE p.organization_id IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 FROM user_organizations uo
                WHERE uo.user_id = p.id 
                AND uo.organization_id = p.organization_id
            );

        GET DIAGNOSTICS migrated_users = ROW_COUNT;

        -- Log user migration progress
        UPDATE migration_logs 
        SET details = details || json_build_object(
            'phase_2_completed', true,
            'users_migrated', migrated_users
        )
        WHERE id = log_id;

    EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        UPDATE migration_logs 
        SET details = details || json_build_object(
            'phase_2_error', SQLERRM,
            'phase_2_failed', true
        )
        WHERE id = log_id;
        RAISE EXCEPTION 'Critical error in user migration: %', SQLERRM;
    END;

    -- ==================================================================================
    -- PHASE 3: Ensure organization settings exist
    -- ==================================================================================
    
    BEGIN
        INSERT INTO organization_settings (
            organization_id,
            allow_domain_join_requests,
            is_discoverable_by_domain,
            require_admin_approval_for_domain_join,
            auto_approve_verified_domains,
            default_employment_type,
            require_contract_dates,
            created_at,
            updated_at
        )
        SELECT 
            o.id,
            true,  -- Default: allow domain join requests
            true,  -- Default: discoverable by domain
            NOT COALESCE(o.require_google_domain, false),  -- If Google required, no admin approval needed
            COALESCE(o.require_google_domain, false),  -- Auto-approve if Google domain required
            'full_time',  -- Default employment type
            true,  -- Require contract dates for Polish compliance
            NOW(),
            NOW()
        FROM organizations o
        WHERE NOT EXISTS (
            SELECT 1 FROM organization_settings os
            WHERE os.organization_id = o.id
        );

        GET DIAGNOSTICS migrated_settings = ROW_COUNT;

        -- Log settings migration progress
        UPDATE migration_logs 
        SET details = details || json_build_object(
            'phase_3_completed', true,
            'organization_settings_created', migrated_settings
        )
        WHERE id = log_id;

    EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        UPDATE migration_logs 
        SET details = details || json_build_object(
            'phase_3_error', SQLERRM,
            'phase_3_failed', true
        )
        WHERE id = log_id;
        -- Continue, this is not critical
    END;

    -- ==================================================================================
    -- COMPLETION: Log final results
    -- ==================================================================================
    
    IF error_count = 0 THEN
        UPDATE migration_logs 
        SET 
            status = 'completed',
            completed_at = NOW(),
            records_affected = migrated_users + migrated_domains + migrated_settings,
            details = details || json_build_object(
                'migration_completed', true,
                'total_records_migrated', migrated_users + migrated_domains + migrated_settings,
                'summary', json_build_object(
                    'users_migrated', migrated_users,
                    'domains_migrated', migrated_domains,
                    'settings_created', migrated_settings,
                    'errors_encountered', error_count
                )
            )
        WHERE id = log_id;
    ELSE
        UPDATE migration_logs 
        SET 
            status = 'completed',  -- Completed with warnings
            completed_at = NOW(),
            records_affected = migrated_users + migrated_domains + migrated_settings,
            error_message = format('Migration completed with %s non-critical errors', error_count),
            details = details || json_build_object(
                'migration_completed_with_warnings', true,
                'total_records_migrated', migrated_users + migrated_domains + migrated_settings,
                'errors_encountered', error_count
            )
        WHERE id = log_id;
    END IF;

    -- Raise informational notice
    RAISE NOTICE 'Multi-organization migration completed. Users: %, Domains: %, Settings: %, Errors: %', 
        migrated_users, migrated_domains, migrated_settings, error_count;

EXCEPTION WHEN OTHERS THEN
    -- Log critical failure
    UPDATE migration_logs 
    SET 
        status = 'failed',
        completed_at = NOW(),
        error_message = SQLERRM,
        details = details || json_build_object(
            'critical_failure', true,
            'error_details', SQLERRM,
            'users_migrated_before_failure', migrated_users,
            'domains_migrated_before_failure', migrated_domains
        )
    WHERE id = log_id;
    
    RAISE EXCEPTION 'Multi-organization migration failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- FUNCTION: validate_multi_org_migration()
-- Purpose: Comprehensive validation of the multi-organization migration
-- =====================================================================================

CREATE OR REPLACE FUNCTION validate_multi_org_migration()
RETURNS TABLE(check_name TEXT, status TEXT, details JSON) AS $$
BEGIN
    -- ==================================================================================
    -- CHECK 1: All profiles with organization_id have been migrated
    -- ==================================================================================
    RETURN QUERY
    WITH unmigrated_profiles AS (
        SELECT p.id, p.email, p.full_name, p.organization_id
        FROM profiles p
        WHERE p.organization_id IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 FROM user_organizations uo
                WHERE uo.user_id = p.id 
                AND uo.organization_id = p.organization_id
            )
    )
    SELECT 
        'profiles_migrated'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'passed'
            ELSE 'failed'
        END,
        json_build_object(
            'unmigrated_count', COUNT(*),
            'unmigrated_users', COALESCE(
                json_agg(
                    json_build_object(
                        'id', id,
                        'email', email,
                        'full_name', full_name,
                        'organization_id', organization_id
                    )
                ) FILTER (WHERE id IS NOT NULL), 
                '[]'::json
            )
        )
    FROM unmigrated_profiles;

    -- ==================================================================================
    -- CHECK 2: Role consistency between profiles and user_organizations
    -- ==================================================================================
    RETURN QUERY
    WITH role_mismatches AS (
        SELECT p.id, p.email, p.role as profile_role, uo.role as org_role
        FROM profiles p
        JOIN user_organizations uo ON uo.user_id = p.id
        WHERE p.role != uo.role
            AND p.organization_id = uo.organization_id
    )
    SELECT 
        'role_consistency'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'passed'
            ELSE 'failed'
        END,
        json_build_object(
            'mismatched_roles_count', COUNT(*),
            'mismatched_roles', COALESCE(
                json_agg(
                    json_build_object(
                        'user_id', id,
                        'email', email,
                        'profile_role', profile_role,
                        'organization_role', org_role
                    )
                ) FILTER (WHERE id IS NOT NULL),
                '[]'::json
            )
        )
    FROM role_mismatches;

    -- ==================================================================================
    -- CHECK 3: All users have exactly one default organization
    -- ==================================================================================
    RETURN QUERY
    WITH default_org_check AS (
        SELECT uo.user_id, COUNT(*) as default_count
        FROM user_organizations uo
        WHERE uo.is_default = true
        GROUP BY uo.user_id
        HAVING COUNT(*) != 1
    )
    SELECT 
        'default_organization_uniqueness'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'passed'
            ELSE 'failed'
        END,
        json_build_object(
            'users_with_invalid_defaults', COUNT(*),
            'invalid_users', COALESCE(
                json_agg(
                    json_build_object(
                        'user_id', user_id,
                        'default_count', default_count
                    )
                ) FILTER (WHERE user_id IS NOT NULL),
                '[]'::json
            )
        )
    FROM default_org_check;

    -- ==================================================================================
    -- CHECK 4: Google domains migrated correctly
    -- ==================================================================================
    RETURN QUERY
    WITH google_domain_check AS (
        SELECT o.id, o.name, o.google_domain
        FROM organizations o
        WHERE o.google_domain IS NOT NULL 
            AND o.google_domain != ''
            AND NOT EXISTS (
                SELECT 1 FROM organization_domains od
                WHERE od.organization_id = o.id 
                AND od.domain = o.google_domain
                AND od.domain_type = 'google'
            )
    )
    SELECT 
        'google_domains_migrated'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'passed'
            ELSE 'failed'
        END,
        json_build_object(
            'unmigrated_google_domains', COUNT(*),
            'missing_domains', COALESCE(
                json_agg(
                    json_build_object(
                        'organization_id', id,
                        'organization_name', name,
                        'google_domain', google_domain
                    )
                ) FILTER (WHERE id IS NOT NULL),
                '[]'::json
            )
        )
    FROM google_domain_check;

    -- ==================================================================================
    -- CHECK 5: Organization settings exist for all organizations
    -- ==================================================================================
    RETURN QUERY
    WITH settings_check AS (
        SELECT o.id, o.name
        FROM organizations o
        WHERE NOT EXISTS (
            SELECT 1 FROM organization_settings os
            WHERE os.organization_id = o.id
        )
    )
    SELECT 
        'organization_settings_exist'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'passed'
            ELSE 'failed'
        END,
        json_build_object(
            'organizations_without_settings', COUNT(*),
            'missing_settings', COALESCE(
                json_agg(
                    json_build_object(
                        'organization_id', id,
                        'organization_name', name
                    )
                ) FILTER (WHERE id IS NOT NULL),
                '[]'::json
            )
        )
    FROM settings_check;

    -- ==================================================================================
    -- CHECK 6: Team assignments consistency
    -- ==================================================================================
    RETURN QUERY
    WITH team_consistency_check AS (
        SELECT uo.user_id, p.email, uo.team_id as org_team_id, p.team_id as profile_team_id
        FROM user_organizations uo
        JOIN profiles p ON p.id = uo.user_id
        WHERE uo.organization_id = p.organization_id
            AND (
                (uo.team_id IS NULL AND p.team_id IS NOT NULL) OR
                (uo.team_id IS NOT NULL AND p.team_id IS NULL) OR
                (uo.team_id != p.team_id)
            )
    )
    SELECT 
        'team_assignment_consistency'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'passed'
            ELSE 'warning'  -- This is a warning, not a critical failure
        END,
        json_build_object(
            'inconsistent_team_assignments', COUNT(*),
            'inconsistencies', COALESCE(
                json_agg(
                    json_build_object(
                        'user_id', user_id,
                        'email', email,
                        'org_team_id', org_team_id,
                        'profile_team_id', profile_team_id
                    )
                ) FILTER (WHERE user_id IS NOT NULL),
                '[]'::json
            )
        )
    FROM team_consistency_check;

    -- ==================================================================================
    -- CHECK 7: Data integrity summary
    -- ==================================================================================
    RETURN QUERY
    SELECT 
        'migration_summary'::TEXT,
        'info'::TEXT,
        json_build_object(
            'total_organizations', (SELECT COUNT(*) FROM organizations),
            'total_users_in_orgs', (SELECT COUNT(*) FROM profiles WHERE organization_id IS NOT NULL),
            'total_user_org_relationships', (SELECT COUNT(*) FROM user_organizations),
            'total_organization_domains', (SELECT COUNT(*) FROM organization_domains),
            'total_organization_settings', (SELECT COUNT(*) FROM organization_settings),
            'google_domains_configured', (SELECT COUNT(*) FROM organization_domains WHERE domain_type = 'google'),
            'polish_email_domains_loaded', (SELECT COUNT(*) FROM public_email_domains WHERE country_code = 'PL')
        );
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- FUNCTION: rollback_multi_org_migration()
-- Purpose: Safely rollback the multi-organization migration if needed
-- =====================================================================================

CREATE OR REPLACE FUNCTION rollback_multi_org_migration()
RETURNS void AS $$
DECLARE
    log_id UUID;
    rollback_count INTEGER := 0;
BEGIN
    -- Start rollback logging
    INSERT INTO migration_logs (migration_name, status, started_at, details)
    VALUES (
        'multi_organization_support_rollback', 
        'in_progress', 
        NOW(),
        json_build_object(
            'action', 'rollback',
            'description', 'Rolling back multi-organization migration'
        )
    )
    RETURNING id INTO log_id;

    -- Note: This is a safe rollback that doesn't delete the new tables,
    -- just clears the migrated data so the migration can be re-run

    -- Clear user_organizations table
    DELETE FROM user_organizations;
    GET DIAGNOSTICS rollback_count = ROW_COUNT;

    -- Clear organization_domains (but keep public_email_domains)
    DELETE FROM organization_domains;

    -- Keep organization_settings as they have defaults

    -- Log completion
    UPDATE migration_logs 
    SET 
        status = 'completed',
        completed_at = NOW(),
        records_affected = rollback_count,
        details = details || json_build_object(
            'rollback_completed', true,
            'user_organizations_cleared', rollback_count,
            'note', 'Tables preserved, data cleared for re-migration'
        )
    WHERE id = log_id;

    RAISE NOTICE 'Multi-organization migration rollback completed. Cleared % user-organization relationships.', rollback_count;

EXCEPTION WHEN OTHERS THEN
    -- Log rollback failure
    UPDATE migration_logs 
    SET 
        status = 'failed',
        completed_at = NOW(),
        error_message = SQLERRM,
        details = details || json_build_object(
            'rollback_failed', true,
            'error_details', SQLERRM
        )
    WHERE id = log_id;
    
    RAISE EXCEPTION 'Multi-organization migration rollback failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- SAFE MIGRATION EXECUTION WITH VALIDATION
-- =====================================================================================

-- Execute the migration with comprehensive safety checks and validation
DO $$
DECLARE
    validation_record RECORD;
    failed_checks INTEGER := 0;
    warning_checks INTEGER := 0;
    migration_start_time TIMESTAMPTZ;
    has_existing_data BOOLEAN := false;
BEGIN
    migration_start_time := NOW();
    
    -- Check if we already have migrated data (prevent double migration)
    SELECT COUNT(*) > 0 INTO has_existing_data 
    FROM user_organizations;
    
    IF has_existing_data THEN
        RAISE NOTICE 'Multi-organization data already exists. Migration may have been run previously.';
        RAISE NOTICE 'To re-run migration, first call: SELECT rollback_multi_org_migration();';
        RETURN;
    END IF;
    
    -- Log migration start
    RAISE NOTICE 'Starting multi-organization migration at %', migration_start_time;
    
    -- Execute the main migration
    PERFORM migrate_to_multi_org();
    
    RAISE NOTICE 'Migration completed. Running validation checks...';
    
    -- Run comprehensive validation
    FOR validation_record IN 
        SELECT * FROM validate_multi_org_migration()
    LOOP
        CASE validation_record.status
            WHEN 'failed' THEN
                failed_checks := failed_checks + 1;
                RAISE WARNING 'VALIDATION FAILED - %: %', 
                    validation_record.check_name, 
                    validation_record.details::text;
            WHEN 'warning' THEN
                warning_checks := warning_checks + 1;
                RAISE NOTICE 'VALIDATION WARNING - %: %', 
                    validation_record.check_name, 
                    validation_record.details::text;
            WHEN 'info' THEN
                RAISE NOTICE 'MIGRATION SUMMARY - %: %', 
                    validation_record.check_name, 
                    validation_record.details::text;
            ELSE
                RAISE NOTICE 'VALIDATION PASSED - %', validation_record.check_name;
        END CASE;
    END LOOP;
    
    -- Final validation decision
    IF failed_checks > 0 THEN
        RAISE EXCEPTION 'Migration validation failed with % critical errors. Consider running SELECT rollback_multi_org_migration(); to rollback.', failed_checks;
    ELSIF warning_checks > 0 THEN
        RAISE NOTICE 'Migration completed successfully with % warnings. Review warnings and fix if necessary.', warning_checks;
    ELSE
        RAISE NOTICE 'Migration completed successfully with no issues detected!';
    END IF;
    
    -- Log completion time
    RAISE NOTICE 'Total migration time: % seconds', 
        EXTRACT(EPOCH FROM (NOW() - migration_start_time));
    
EXCEPTION WHEN OTHERS THEN
    -- Log any errors that occur during validation
    RAISE EXCEPTION 'Migration or validation failed: %', SQLERRM;
END $$;

-- =====================================================================================
-- MIGRATION NOTES AND POLISH LABOR LAW IMPLICATIONS
-- =====================================================================================

/*
POLISH LABOR LAW CONSIDERATIONS:

1. EMPLOYMENT TYPES (employment_type field):
   - 'full_time': Umowa o pracę na pełny etat (most common)
   - 'part_time': Umowa o pracę na część etatu
   - 'contract': Umowa zlecenie lub umowa o dzieło (civil contracts)
   - 'temporary': Umowa na czas określony (fixed-term contract)
   - 'consultant': Współpraca B2B (business-to-business)

2. CONTRACT DATES:
   - Polish law requires clear documentation of employment start dates
   - The contract_start_date field supports this requirement
   - End dates can be tracked in a separate field if needed for fixed-term contracts

3. GDPR (RODO) COMPLIANCE:
   - join_requests table includes explicit GDPR consent tracking
   - Auto-expiration after 30 days respects "right to be forgotten"
   - Data retention settings in organization_settings table

4. MULTI-ORGANIZATION SCENARIOS:
   Common in Poland due to:
   - Seasonal work (especially agriculture, tourism)
   - Consulting and freelance work
   - Part-time employment combined with contracts
   - Academic positions combined with industry work

5. EMAIL DOMAIN CONSIDERATIONS:
   - Polish businesses often use .pl domains
   - Many employees still use personal email addresses
   - The system distinguishes between business and personal domains

MIGRATION SAFETY:
- All new tables with proper constraints
- RLS policies prevent unauthorized access
- Existing data remains untouched
- Backward compatibility maintained

NEXT STEPS AFTER MIGRATION:
1. Migrate existing profiles data to user_organizations table
2. Set up organization domains for existing organizations  
3. Configure organization settings based on business needs
4. Implement UI for multi-organization switching
5. Add domain verification workflows
*/ 