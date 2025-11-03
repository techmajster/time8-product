-- Migration: Add lemonsqueezy_variant_id to subscriptions table
-- Purpose: Track which LemonSqueezy variant (monthly/yearly) the subscription uses
-- Created: 2025-11-03
-- Part of: Billing System Enhancement (Phase 1)

-- Add variant_id column to subscriptions table
-- This was previously removed in migration 20250828210000 but is needed for:
-- 1. Tracking plan changes (monthly ↔ yearly)
-- 2. Fetching correct pricing dynamically
-- 3. Detecting variant-only changes in webhooks
-- 4. Subscription analytics and audit trail

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS lemonsqueezy_variant_id TEXT;

-- Add index for fast variant lookups and filtering
-- Useful for queries like "all monthly subscriptions" or "all yearly subscriptions"
CREATE INDEX IF NOT EXISTS idx_subscriptions_variant_id
ON subscriptions(lemonsqueezy_variant_id);

-- Add comment for documentation
COMMENT ON COLUMN subscriptions.lemonsqueezy_variant_id IS
'LemonSqueezy variant ID (e.g., 972634 for monthly, 972635 for yearly). Used to track which plan the subscription is on and fetch dynamic pricing.';

-- Note: Existing subscriptions will have NULL variant_id
-- Run the sync script after this migration to populate the column:
-- npx tsx scripts/sync-subscription-from-lemonsqueezy.ts <org-slug>
