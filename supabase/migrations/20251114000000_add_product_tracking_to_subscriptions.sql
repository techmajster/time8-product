-- =====================================================================================
-- ADD PRODUCT TRACKING FOR TWO-PRODUCT MIGRATION
-- File: 20251114000000_add_product_tracking_to_subscriptions.sql
--
-- This migration adds product ID tracking to enable two-product architecture
-- (monthly product 621389 vs yearly product 693341) for billing period switching.
-- This works around LemonSqueezy's limitation preventing switches between
-- usage-based and non-usage-based variants within the same product.
--
-- Key Changes:
-- 1. Add lemonsqueezy_product_id column to track which product each subscription uses
-- 2. Add migrated_to_subscription_id to track upgrade migrations
-- 3. Backfill existing subscriptions with product ID based on variant mapping
-- 4. Add indexes for efficient querying
--
-- Related Spec: .agent-os/specs/2025-11-14-two-product-migration/
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- 1. ADD lemonsqueezy_product_id COLUMN
-- =====================================================================================

-- Add product ID column to track which LemonSqueezy product this subscription belongs to
-- Nullable for backward compatibility with existing subscriptions
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS lemonsqueezy_product_id TEXT;

-- Add index for querying by product ID
CREATE INDEX IF NOT EXISTS idx_subscriptions_product_id
ON subscriptions(lemonsqueezy_product_id);

-- Add column comment
COMMENT ON COLUMN subscriptions.lemonsqueezy_product_id IS
'LemonSqueezy product ID. Used to distinguish between monthly product (621389) and yearly product (693341) in two-product architecture.';

-- =====================================================================================
-- 2. ADD migrated_to_subscription_id COLUMN
-- =====================================================================================

-- Add column to track when a subscription has been migrated to a new subscription
-- Used when upgrading from monthly to yearly (cancel old, create new)
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS migrated_to_subscription_id TEXT;

-- Add index for querying migrated subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_migrated_to
ON subscriptions(migrated_to_subscription_id)
WHERE migrated_to_subscription_id IS NOT NULL;

-- Add column comment
COMMENT ON COLUMN subscriptions.migrated_to_subscription_id IS
'LemonSqueezy subscription ID that this subscription was migrated to. Set when a monthly subscription is upgraded to yearly via cancel + create flow.';

-- =====================================================================================
-- 3. BACKFILL EXISTING SUBSCRIPTIONS WITH PRODUCT IDs
-- =====================================================================================

-- Map existing subscriptions to products based on their variant IDs:
-- - Variant 972634 (monthly) → Product 621389
-- - Variant 972635 (legacy yearly) → Product 693341
-- - Variant 1090954 (new yearly) → Product 693341

-- Update monthly subscriptions (variant 972634)
UPDATE subscriptions
SET lemonsqueezy_product_id = '621389'
WHERE lemonsqueezy_variant_id = '972634'
  AND lemonsqueezy_product_id IS NULL;

-- Update legacy yearly subscriptions (variant 972635)
UPDATE subscriptions
SET lemonsqueezy_product_id = '693341'
WHERE lemonsqueezy_variant_id = '972635'
  AND lemonsqueezy_product_id IS NULL;

-- Update new yearly subscriptions (variant 1090954)
UPDATE subscriptions
SET lemonsqueezy_product_id = '693341'
WHERE lemonsqueezy_variant_id = '1090954'
  AND lemonsqueezy_product_id IS NULL;

-- =====================================================================================
-- 4. ADD COMPOSITE INDEX FOR BILLING QUERIES
-- =====================================================================================

-- Index for finding subscriptions by organization and product (useful for upgrade flows)
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_product
ON subscriptions(organization_id, lemonsqueezy_product_id, status)
WHERE status IN ('active', 'on_trial');

COMMIT;

-- =====================================================================================
-- VERIFICATION QUERIES
-- =====================================================================================

-- Verify new columns exist
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
    AND column_name IN ('lemonsqueezy_product_id', 'migrated_to_subscription_id')
ORDER BY column_name;

-- Verify indexes exist
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'subscriptions'
    AND indexname IN (
        'idx_subscriptions_product_id',
        'idx_subscriptions_migrated_to',
        'idx_subscriptions_org_product'
    )
ORDER BY indexname;

-- Verify backfill - show product distribution
SELECT
    lemonsqueezy_product_id,
    lemonsqueezy_variant_id,
    COUNT(*) as subscription_count,
    COUNT(DISTINCT organization_id) as organization_count
FROM subscriptions
WHERE status IN ('active', 'on_trial', 'paused')
GROUP BY lemonsqueezy_product_id, lemonsqueezy_variant_id
ORDER BY lemonsqueezy_product_id, lemonsqueezy_variant_id;

-- Check for any subscriptions missing product_id (should be 0 or only inactive ones)
SELECT
    status,
    COUNT(*) as count_without_product_id
FROM subscriptions
WHERE lemonsqueezy_product_id IS NULL
GROUP BY status;
