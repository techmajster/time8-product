-- =====================================================================================
-- REMOVE PRODUCTS AND PRICE_VARIANTS TABLES
-- File: 20250828200000_remove_products_and_variants_tables.sql
-- 
-- This migration removes the products and price_variants tables as we're simplifying
-- the Lemon Squeezy integration to use direct API calls with environment variables
-- instead of database syncing.
--
-- Rationale: Lemon Squeezy is the source of truth for products/pricing. 
-- Our database only needs to track subscription status and seat counts.
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- DROP TABLES AND RELATED OBJECTS
-- =====================================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS update_price_variants_updated_at ON price_variants;
DROP TRIGGER IF EXISTS update_products_updated_at ON products;

-- Drop policies
DROP POLICY IF EXISTS "Service role can manage price variants" ON price_variants;
DROP POLICY IF EXISTS "Price variants are viewable by everyone" ON price_variants;
DROP POLICY IF EXISTS "Service role can manage products" ON products;
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;

-- Drop tables (price_variants first due to foreign key constraint)
DROP TABLE IF EXISTS price_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Drop the shared trigger function if no other tables use it
-- (Keeping it commented out in case other tables use the same pattern)
-- DROP FUNCTION IF EXISTS update_updated_at_column();

COMMIT;

-- Verify tables were removed successfully
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('products', 'price_variants') THEN '❌ Still exists'
        ELSE '✅ Removed'
    END as removal_status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('products', 'price_variants')
ORDER BY table_name;