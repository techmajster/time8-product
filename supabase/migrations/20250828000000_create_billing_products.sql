-- =====================================================================================
-- LEMON SQUEEZY BILLING INTEGRATION - PRODUCTS AND VARIANTS
-- File: 20250828000000_create_billing_products.sql
-- 
-- This migration creates the products and price_variants tables for Lemon Squeezy
-- billing integration. These tables sync product and pricing data from Lemon Squeezy.
--
-- Key Features:
-- - Products synchronized from Lemon Squeezy
-- - Price variants for different billing intervals (monthly/yearly)
-- - Public read access for pricing display
-- - System-only write access for sync operations
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- TABLE: products
-- Purpose: Store product information synchronized from Lemon Squeezy
-- Access: Public read, system write only
-- =====================================================================================

CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lemonsqueezy_product_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Performance index on status for active product queries
CREATE INDEX idx_products_status ON products(status);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- TABLE: price_variants  
-- Purpose: Store pricing variants for products (monthly/yearly billing)
-- Access: Public read, system write only
-- =====================================================================================

CREATE TABLE price_variants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    lemonsqueezy_variant_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    interval TEXT NOT NULL CHECK (interval IN ('month', 'year')),
    interval_count INTEGER NOT NULL DEFAULT 1,
    price_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Performance indexes
CREATE INDEX idx_price_variants_product_id ON price_variants(product_id);
CREATE INDEX idx_price_variants_interval ON price_variants(interval);
CREATE INDEX idx_price_variants_currency ON price_variants(currency);

-- Updated timestamp trigger
CREATE TRIGGER update_price_variants_updated_at 
    BEFORE UPDATE ON price_variants 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================================================

-- Enable RLS on both tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_variants ENABLE ROW LEVEL SECURITY;

-- Products table policies
CREATE POLICY "Products are viewable by everyone" ON products 
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage products" ON products 
    FOR ALL USING (auth.role() = 'service_role');

-- Price variants table policies  
CREATE POLICY "Price variants are viewable by everyone" ON price_variants 
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage price variants" ON price_variants 
    FOR ALL USING (auth.role() = 'service_role');

COMMIT;

-- Verify tables were created successfully
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('products', 'price_variants') THEN '✅ Created'
        ELSE '❌ Missing'
    END as creation_status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('products', 'price_variants')
ORDER BY table_name;