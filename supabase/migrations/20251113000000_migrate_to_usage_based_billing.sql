-- =====================================================================================
-- MIGRATE TO USAGE-BASED BILLING
-- File: 20251113000000_migrate_to_usage_based_billing.sql
--
-- This migration transitions the subscriptions table from volume-based billing with
-- grace periods to usage-based billing using LemonSqueezy's Usage Records API.
--
-- Key Changes:
-- 1. Add billing_type column to distinguish between legacy and new subscriptions
-- 2. Remove pending_seats column (no longer needed with instant usage records)
-- 3. Remove lemonsqueezy_quantity_synced (no sync lag with usage-based billing)
--
-- Related Spec: .agent-os/specs/2025-11-13-fix-usage-based-billing/
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- 1. ADD billing_type COLUMN
-- =====================================================================================

-- Add billing_type to track subscription billing model
-- 'volume': Legacy subscriptions (pre-usage-based billing)
-- 'usage_based': New subscriptions using Usage Records API
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS billing_type TEXT
CHECK (billing_type IN ('volume', 'usage_based'))
DEFAULT 'usage_based';

-- Add index for querying by billing type
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_type
ON subscriptions(billing_type);

-- Add column comment
COMMENT ON COLUMN subscriptions.billing_type IS
'Billing model: "volume" for legacy subscriptions, "usage_based" for new subscriptions using usage records API. Determines which billing logic to apply.';

-- =====================================================================================
-- 2. MARK EXISTING SUBSCRIPTIONS AS LEGACY
-- =====================================================================================

-- Set existing subscriptions to 'volume' billing type
-- New subscriptions will automatically default to 'usage_based'
UPDATE subscriptions
SET billing_type = 'volume'
WHERE billing_type IS NULL;

-- =====================================================================================
-- 3. REMOVE GRACE PERIOD COLUMNS (No longer needed with usage-based billing)
-- =====================================================================================

-- Drop pending_seats - usage-based billing has instant seat updates
-- Note: We keep current_seats as it's still used for access control
ALTER TABLE subscriptions
DROP COLUMN IF EXISTS pending_seats;

-- Drop lemonsqueezy_quantity_synced - no sync lag with usage records
ALTER TABLE subscriptions
DROP COLUMN IF EXISTS lemonsqueezy_quantity_synced;

-- Drop related indexes (if they exist)
DROP INDEX IF EXISTS idx_subscriptions_pending_renewal;
DROP INDEX IF EXISTS idx_subscriptions_sync_needed;

-- =====================================================================================
-- 4. UPDATE EXISTING INDEXES
-- =====================================================================================

-- Recreate active subscriptions index without pending_seats reference
DROP INDEX IF EXISTS idx_subscriptions_active;
CREATE INDEX IF NOT EXISTS idx_subscriptions_active
ON subscriptions(organization_id, status, current_seats)
WHERE status IN ('active', 'on_trial');

-- =====================================================================================
-- 5. VERIFY REQUIRED COLUMNS EXIST
-- =====================================================================================

-- Ensure lemonsqueezy_subscription_item_id exists (should already be there)
-- This column is CRITICAL for usage-based billing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscriptions'
          AND column_name = 'lemonsqueezy_subscription_item_id'
    ) THEN
        RAISE EXCEPTION 'Critical column lemonsqueezy_subscription_item_id is missing! Cannot proceed with usage-based billing.';
    END IF;
END $$;

COMMIT;

-- =====================================================================================
-- VERIFICATION QUERIES
-- =====================================================================================

-- Verify billing_type column exists and has correct constraint
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
    AND column_name = 'billing_type';

-- Verify grace period columns are removed
SELECT
    column_name
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
    AND column_name IN ('pending_seats', 'lemonsqueezy_quantity_synced');

-- Should return 0 rows (columns removed)

-- Verify required columns for usage-based billing exist
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
    AND column_name IN (
        'billing_type',
        'lemonsqueezy_subscription_item_id',
        'current_seats',
        'quantity'
    )
ORDER BY column_name;

-- Verify existing subscriptions are marked as 'volume'
SELECT
    billing_type,
    COUNT(*) as count
FROM subscriptions
GROUP BY billing_type;
