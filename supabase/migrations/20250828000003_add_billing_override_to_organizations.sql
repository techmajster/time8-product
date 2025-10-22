-- =====================================================================================
-- LEMON SQUEEZY BILLING INTEGRATION - ORGANIZATION BILLING OVERRIDES
-- File: 20250828000003_add_billing_override_to_organizations.sql
-- 
-- This migration adds billing override columns to the organizations table.
-- These fields support free accounts for partners, lifetime users, and promotional access.
--
-- Key Features:
-- - Track paid seats for subscription billing
-- - Support billing overrides for free accounts
-- - Flexible override types (lifetime, partner, promotional)
-- - Optional seat limits and expiration dates
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- ADD BILLING COLUMNS TO ORGANIZATIONS TABLE
-- =====================================================================================

-- Add paid seats tracking (used with free 3-seat limit)
ALTER TABLE organizations 
    ADD COLUMN paid_seats INTEGER DEFAULT 0;

-- Add billing override support
ALTER TABLE organizations 
    ADD COLUMN billing_override BOOLEAN DEFAULT false;

ALTER TABLE organizations 
    ADD COLUMN billing_override_type TEXT CHECK (
        billing_override_type IN ('lifetime', 'partner', 'promotional')
    );

-- Optional seat limit for override accounts (NULL = unlimited)
ALTER TABLE organizations 
    ADD COLUMN billing_override_seats INTEGER;

-- Optional expiration for temporary overrides
ALTER TABLE organizations 
    ADD COLUMN billing_override_expires_at TIMESTAMPTZ;

-- =====================================================================================
-- CONSTRAINTS AND VALIDATION
-- =====================================================================================

-- Ensure billing override fields are set together
ALTER TABLE organizations
    ADD CONSTRAINT billing_override_fields_check 
    CHECK (
        (billing_override = false AND billing_override_type IS NULL) OR
        (billing_override = true AND billing_override_type IS NOT NULL)
    );

-- Ensure paid_seats is non-negative
ALTER TABLE organizations
    ADD CONSTRAINT paid_seats_non_negative 
    CHECK (paid_seats >= 0);

-- Ensure billing_override_seats is positive if set
ALTER TABLE organizations
    ADD CONSTRAINT billing_override_seats_positive 
    CHECK (billing_override_seats IS NULL OR billing_override_seats > 0);

-- =====================================================================================
-- HELPER FUNCTIONS FOR BILLING LOGIC
-- =====================================================================================

-- Function to calculate total available seats for an organization
CREATE OR REPLACE FUNCTION get_organization_total_seats(org_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    org_record RECORD;
    total_seats INTEGER;
BEGIN
    SELECT 
        paid_seats,
        billing_override,
        billing_override_seats,
        billing_override_expires_at
    INTO org_record
    FROM organizations 
    WHERE id = org_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Check if billing override is active and not expired
    IF org_record.billing_override = true AND 
       (org_record.billing_override_expires_at IS NULL OR 
        org_record.billing_override_expires_at > now()) THEN
        
        -- If override has seat limit, use it; otherwise unlimited (999999)
        IF org_record.billing_override_seats IS NOT NULL THEN
            RETURN org_record.billing_override_seats;
        ELSE
            RETURN 999999; -- Effectively unlimited
        END IF;
    ELSE
        -- Standard billing: 3 free seats + paid seats
        RETURN 3 + COALESCE(org_record.paid_seats, 0);
    END IF;
END;
$$;

-- Function to check if organization can add more users
CREATE OR REPLACE FUNCTION can_organization_add_users(org_id UUID, users_to_add INTEGER DEFAULT 1)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_users INTEGER;
    total_seats INTEGER;
BEGIN
    -- Get current active user count
    SELECT COUNT(*)
    INTO current_users
    FROM user_organizations
    WHERE organization_id = org_id 
        AND is_active = true;
    
    -- Get total available seats
    SELECT get_organization_total_seats(org_id)
    INTO total_seats;
    
    -- Check if adding users would exceed limit
    RETURN (current_users + users_to_add) <= total_seats;
END;
$$;

-- Function to update paid seats based on subscription
CREATE OR REPLACE FUNCTION update_organization_paid_seats(org_id UUID, subscription_quantity INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE organizations 
    SET paid_seats = subscription_quantity
    WHERE id = org_id;
END;
$$;

-- =====================================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================================

-- Index for billing override queries
CREATE INDEX idx_organizations_billing_override 
    ON organizations(billing_override) 
    WHERE billing_override = true;

-- Index for expiring overrides
CREATE INDEX idx_organizations_override_expiration 
    ON organizations(billing_override_expires_at) 
    WHERE billing_override = true AND billing_override_expires_at IS NOT NULL;

-- =====================================================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================================================

-- Note: In production, you would manually set billing overrides via admin interface
-- This is just an example of what the data might look like

-- Example: Set our own organization as lifetime override (uncomment after deployment)
-- UPDATE organizations 
-- SET 
--     billing_override = true,
--     billing_override_type = 'lifetime',
--     billing_override_seats = NULL -- unlimited
-- WHERE name = 'Your Organization Name';

COMMIT;

-- Verify columns were added successfully
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'organizations'
    AND column_name IN (
        'paid_seats', 
        'billing_override', 
        'billing_override_type',
        'billing_override_seats',
        'billing_override_expires_at'
    )
ORDER BY column_name;