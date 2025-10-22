-- =====================================================================================
-- LEMON SQUEEZY BILLING INTEGRATION - CUSTOMERS AND SUBSCRIPTIONS
-- File: 20250828000001_create_billing_customers_subscriptions.sql
-- 
-- This migration creates the customers and subscriptions tables for Lemon Squeezy
-- billing integration. These tables track organization billing relationships.
--
-- Key Features:
-- - Map organizations to Lemon Squeezy customers
-- - Track subscription status and billing cycles
-- - Organization-scoped access control via RLS
-- - Support for subscription lifecycle management
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- TABLE: customers
-- Purpose: Map organizations to Lemon Squeezy customers
-- Access: Organization members can view, system can manage
-- =====================================================================================

CREATE TABLE customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    lemonsqueezy_customer_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Performance indexes
CREATE INDEX idx_customers_organization_id ON customers(organization_id);
CREATE UNIQUE INDEX idx_customers_lemonsqueezy_id ON customers(lemonsqueezy_customer_id);

-- Updated timestamp trigger
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- TABLE: subscriptions
-- Purpose: Track active subscriptions and billing status
-- Access: Organization members can view, system can manage
-- =====================================================================================

CREATE TABLE subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    lemonsqueezy_subscription_id TEXT UNIQUE NOT NULL,
    variant_id UUID REFERENCES price_variants(id),
    status TEXT NOT NULL CHECK (status IN (
        'active', 
        'past_due', 
        'cancelled', 
        'expired', 
        'on_trial', 
        'paused'
    )),
    quantity INTEGER NOT NULL DEFAULT 1,
    renews_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Ensure subscription belongs to the same organization as customer
    CONSTRAINT subscriptions_customer_organization_match 
        FOREIGN KEY (customer_id, organization_id) 
        REFERENCES customers (id, organization_id) 
        MATCH FULL
);

-- Performance indexes
CREATE INDEX idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_variant_id ON subscriptions(variant_id);
CREATE UNIQUE INDEX idx_subscriptions_lemonsqueezy_id ON subscriptions(lemonsqueezy_subscription_id);

-- Index for active subscriptions queries
CREATE INDEX idx_subscriptions_active ON subscriptions(organization_id, status) 
    WHERE status IN ('active', 'on_trial');

-- Updated timestamp trigger
CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================================================

-- Enable RLS on both tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Customers table policies
CREATE POLICY "Customers viewable by organization members" ON customers 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_organizations 
            WHERE user_organizations.organization_id = customers.organization_id 
            AND user_organizations.user_id = auth.uid()
            AND user_organizations.is_active = true
        )
    );

CREATE POLICY "Service role can manage customers" ON customers 
    FOR ALL USING (auth.role() = 'service_role');

-- Subscriptions table policies
CREATE POLICY "Subscriptions viewable by organization members" ON subscriptions 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_organizations 
            WHERE user_organizations.organization_id = subscriptions.organization_id 
            AND user_organizations.user_id = auth.uid()
            AND user_organizations.is_active = true
        )
    );

-- Organization admins can manage subscriptions (for customer portal access)
CREATE POLICY "Organization admins can manage subscriptions" ON subscriptions 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_organizations 
            WHERE user_organizations.organization_id = subscriptions.organization_id 
            AND user_organizations.user_id = auth.uid()
            AND user_organizations.is_active = true
            AND user_organizations.role = 'admin'
        )
    );

CREATE POLICY "Service role can manage subscriptions" ON subscriptions 
    FOR ALL USING (auth.role() = 'service_role');

COMMIT;

-- Verify tables were created successfully
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('customers', 'subscriptions') THEN '✅ Created'
        ELSE '❌ Missing'
    END as creation_status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('customers', 'subscriptions')
ORDER BY table_name;