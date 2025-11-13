-- =====================================================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Migration: Add quantity_based billing type
-- =====================================================================================

-- Step 1: Drop existing CHECK constraint
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_billing_type_check;

-- Step 2: Add new CHECK constraint with 'quantity_based'
ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_billing_type_check
CHECK (billing_type IN ('volume', 'usage_based', 'quantity_based'));

-- Step 3: Update column comment
COMMENT ON COLUMN subscriptions.billing_type IS
'Billing model:
- "volume": Legacy subscriptions (pre-usage-based billing, to be cleaned up)
- "usage_based": Monthly subscriptions using Usage Records API (pay at end of period)
- "quantity_based": Yearly subscriptions using quantity updates with immediate proration (pay upfront)
Determines which billing logic to apply when adding/removing seats.';

-- =====================================================================================
-- VERIFICATION QUERIES
-- =====================================================================================

-- Verify the constraint exists
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_namespace nsp ON nsp.oid = con.connamespace
WHERE con.conrelid = 'public.subscriptions'::regclass
    AND con.conname = 'subscriptions_billing_type_check';

-- Verify existing subscriptions unchanged
SELECT
    billing_type,
    COUNT(*) as count
FROM subscriptions
GROUP BY billing_type
ORDER BY billing_type;
