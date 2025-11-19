-- Migration: Update billing_type from quantity_based to usage_based
-- Date: 2025-11-19
-- Purpose: Standardize billing_type for metered/volume pricing subscriptions
--
-- Background:
-- - Both 'quantity_based' and 'usage_based' represent the same billing model
-- - Subscription seats are set at checkout, not in payment webhooks
-- - LemonSqueezy handles metered billing with volume pricing
--
-- This migration consolidates to 'usage_based' as the canonical value

BEGIN;

-- Update all subscriptions with billing_type='quantity_based' to 'usage_based'
-- These are functionally identical - both set seats at checkout time
UPDATE subscriptions
SET
  billing_type = 'usage_based',
  updated_at = NOW()
WHERE billing_type = 'quantity_based';

-- Log the migration
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % subscription(s) from quantity_based to usage_based', updated_count;
END $$;

COMMIT;

-- Verify the update
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM subscriptions
  WHERE billing_type = 'quantity_based';

  IF remaining_count > 0 THEN
    RAISE WARNING 'Still have % subscription(s) with quantity_based billing type', remaining_count;
  ELSE
    RAISE NOTICE 'All subscriptions successfully migrated to usage_based billing type';
  END IF;
END $$;
