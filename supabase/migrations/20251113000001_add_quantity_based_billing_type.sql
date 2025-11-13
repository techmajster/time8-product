-- =====================================================================================
-- ADD QUANTITY-BASED BILLING TYPE
-- File: 20251113000001_add_quantity_based_billing_type.sql
--
-- This migration adds 'quantity_based' to the billing_type enum to support yearly
-- subscriptions with immediate proration (hybrid billing system).
--
-- Key Changes:
-- 1. Update CHECK constraint to include 'quantity_based' value
-- 2. Update column comment to document all three billing types
--
-- Related Spec: .agent-os/specs/2025-11-13-hybrid-billing-monthly-yearly/
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- 1. DROP EXISTING CHECK CONSTRAINT
-- =====================================================================================

-- Drop the existing CHECK constraint on billing_type
-- Constraint name format: subscriptions_billing_type_check
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_billing_type_check;

-- =====================================================================================
-- 2. ADD NEW CHECK CONSTRAINT WITH 'quantity_based'
-- =====================================================================================

-- Add updated CHECK constraint with three billing types
ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_billing_type_check
CHECK (billing_type IN ('volume', 'usage_based', 'quantity_based'));

-- =====================================================================================
-- 3. UPDATE COLUMN COMMENT
-- =====================================================================================

-- Update column comment to document all three billing types
COMMENT ON COLUMN subscriptions.billing_type IS
'Billing model:
- "volume": Legacy subscriptions (pre-usage-based billing, to be cleaned up)
- "usage_based": Monthly subscriptions using Usage Records API (pay at end of period)
- "quantity_based": Yearly subscriptions using quantity updates with immediate proration (pay upfront)
Determines which billing logic to apply when adding/removing seats.';

COMMIT;

-- =====================================================================================
-- VERIFICATION QUERIES
-- =====================================================================================

-- Verify billing_type column has updated CHECK constraint
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
    AND column_name = 'billing_type';

-- Verify CHECK constraint exists with correct values
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_namespace nsp ON nsp.oid = con.connamespace
WHERE con.conrelid = 'public.subscriptions'::regclass
    AND con.conname = 'subscriptions_billing_type_check';

-- Verify existing subscriptions are unchanged
SELECT
    billing_type,
    COUNT(*) as count
FROM subscriptions
GROUP BY billing_type
ORDER BY billing_type;

-- Test inserting a subscription with 'quantity_based' value (will be rolled back)
DO $$
DECLARE
    test_org_id UUID;
BEGIN
    -- Create a temporary organization for testing
    INSERT INTO organizations (name, owner_id)
    VALUES ('Test Org for Billing Type', (SELECT id FROM auth.users LIMIT 1))
    RETURNING id INTO test_org_id;

    -- Test insert with quantity_based billing type
    INSERT INTO subscriptions (
        organization_id,
        lemonsqueezy_subscription_id,
        billing_type,
        status,
        current_seats
    ) VALUES (
        test_org_id,
        'test_sub_quantity_based',
        'quantity_based',
        'active',
        5
    );

    RAISE NOTICE 'SUCCESS: quantity_based billing_type insertion test passed';

    -- Clean up test data
    DELETE FROM subscriptions WHERE lemonsqueezy_subscription_id = 'test_sub_quantity_based';
    DELETE FROM organizations WHERE id = test_org_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'FAILED: quantity_based billing_type insertion test failed: %', SQLERRM;
END $$;
