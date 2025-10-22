-- =====================================================================================
-- REMOVE VARIANT_ID FROM SUBSCRIPTIONS TABLE
-- File: 20250828210000_remove_variant_id_from_subscriptions.sql
-- 
-- This migration removes the variant_id foreign key reference from subscriptions table
-- since we've simplified the integration to use Lemon Squeezy API directly without
-- database syncing of products/variants.
--
-- The subscription status and quantity are still tracked, but variant information
-- is now handled directly through Lemon Squeezy API calls.
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- DROP VARIANT_ID FOREIGN KEY AND COLUMN
-- =====================================================================================

-- Drop the foreign key constraint to price_variants (which no longer exists)
ALTER TABLE subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_variant_id_fkey;

-- Drop the variant_id column entirely
ALTER TABLE subscriptions 
DROP COLUMN IF EXISTS variant_id;

-- Drop the index on variant_id
DROP INDEX IF EXISTS idx_subscriptions_variant_id;

-- =====================================================================================
-- VERIFICATION
-- =====================================================================================

-- Verify the column was removed
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'subscriptions'
    AND column_name = 'variant_id';

-- This should return no rows if successful

COMMIT;