-- =====================================================================================
-- ADD BILLING PERIOD TRACKING TO SUBSCRIPTIONS
-- File: 20251117000000_add_billing_period_to_subscriptions.sql
--
-- This migration adds explicit billing_period column to fix critical bugs where
-- monthly/yearly selection during workspace creation was not being saved or displayed.
--
-- Problem Fixed:
-- - User selects "monthly" during workspace creation → system shows "yearly"
-- - System inferred billing period from product_id/variant_id which are NULL until webhook fires
-- - Webhook received tier in custom_data but never saved it
-- - UI defaulted to yearly when product_id was NULL
--
-- Solution:
-- - Add billing_period enum column ('monthly', 'yearly', null)
-- - Webhook will save tier from custom_data to this column
-- - UI will use this column as primary source, fallback to product_id
--
-- Related Spec: .agent-os/specs/2025-11-14-two-product-migration/
-- Related Task: Task 1 - Fix Critical Billing Period and Seat Count Bugs
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- 1. CREATE BILLING PERIOD ENUM TYPE
-- =====================================================================================

-- Create enum type for billing period
-- Values: 'monthly', 'yearly'
-- Null allowed for legacy subscriptions or free tier
DO $$ BEGIN
  CREATE TYPE billing_period_type AS ENUM ('monthly', 'yearly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================================================
-- 2. ADD billing_period COLUMN
-- =====================================================================================

-- Add billing_period column to subscriptions table
-- Nullable for backward compatibility with existing subscriptions
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS billing_period billing_period_type;

-- Add index for querying by billing period
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_period
ON subscriptions(billing_period)
WHERE billing_period IS NOT NULL;

-- Add column comment
COMMENT ON COLUMN subscriptions.billing_period IS
'Explicit billing period tracking: monthly or yearly. Populated from checkout custom_data tier field. Used as primary source for billing period detection in UI.';

-- =====================================================================================
-- 3. BACKFILL EXISTING SUBSCRIPTIONS WITH BILLING PERIOD
-- =====================================================================================

-- Backfill existing subscriptions based on product_id or variant_id
-- This ensures existing subscriptions work correctly after migration

-- Update monthly subscriptions based on product_id
UPDATE subscriptions
SET billing_period = 'monthly'
WHERE billing_period IS NULL
  AND lemonsqueezy_product_id = '621389'; -- Monthly product

-- Update yearly subscriptions based on product_id
UPDATE subscriptions
SET billing_period = 'yearly'
WHERE billing_period IS NULL
  AND lemonsqueezy_product_id = '693341'; -- Yearly product

-- Fallback: Update monthly subscriptions based on variant_id (if product_id not set)
UPDATE subscriptions
SET billing_period = 'monthly'
WHERE billing_period IS NULL
  AND lemonsqueezy_variant_id = '972634'; -- Monthly variant

-- Fallback: Update yearly subscriptions based on variant_id (if product_id not set)
UPDATE subscriptions
SET billing_period = 'yearly'
WHERE billing_period IS NULL
  AND lemonsqueezy_variant_id IN ('972635', '1090954'); -- Yearly variants (legacy + new)

-- =====================================================================================
-- 4. ADD COMPOSITE INDEX FOR BILLING QUERIES
-- =====================================================================================

-- Index for finding subscriptions by organization and billing period
-- Useful for subscription management page and billing period switches
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_billing_period
ON subscriptions(organization_id, billing_period, status)
WHERE status IN ('active', 'on_trial');

COMMIT;

-- =====================================================================================
-- VERIFICATION QUERIES
-- =====================================================================================

-- Verify new column exists
SELECT
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
    AND column_name = 'billing_period';

-- Verify enum type exists
SELECT
    e.enumlabel as billing_period_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'billing_period_type'
ORDER BY e.enumsortorder;

-- Verify indexes exist
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'subscriptions'
    AND indexname IN (
        'idx_subscriptions_billing_period',
        'idx_subscriptions_org_billing_period'
    )
ORDER BY indexname;

-- Verify backfill - show billing period distribution
SELECT
    billing_period,
    lemonsqueezy_product_id,
    lemonsqueezy_variant_id,
    COUNT(*) as subscription_count,
    COUNT(DISTINCT organization_id) as organization_count
FROM subscriptions
WHERE status IN ('active', 'on_trial', 'paused')
GROUP BY billing_period, lemonsqueezy_product_id, lemonsqueezy_variant_id
ORDER BY billing_period, lemonsqueezy_product_id;

-- Check for any active subscriptions missing billing_period
-- (Should only be free tier or error cases)
SELECT
    status,
    lemonsqueezy_product_id,
    lemonsqueezy_variant_id,
    COUNT(*) as count_without_billing_period
FROM subscriptions
WHERE billing_period IS NULL
GROUP BY status, lemonsqueezy_product_id, lemonsqueezy_variant_id
ORDER BY status;

-- Verify consistency: billing_period should match product_id
-- Monthly product (621389) should have billing_period='monthly'
-- Yearly product (693341) should have billing_period='yearly'
SELECT
    CASE
        WHEN lemonsqueezy_product_id = '621389' AND billing_period != 'monthly' THEN 'MISMATCH: Monthly product with non-monthly period'
        WHEN lemonsqueezy_product_id = '693341' AND billing_period != 'yearly' THEN 'MISMATCH: Yearly product with non-yearly period'
        ELSE 'OK'
    END as consistency_check,
    billing_period,
    lemonsqueezy_product_id,
    COUNT(*) as count
FROM subscriptions
WHERE lemonsqueezy_product_id IS NOT NULL
    AND billing_period IS NOT NULL
GROUP BY billing_period, lemonsqueezy_product_id
ORDER BY consistency_check DESC, billing_period;
