-- =====================================================================================
-- MULTI-WORKSPACE SUPPORT - DROP UNIQUE CONSTRAINT ON CUSTOMERS.ORGANIZATION_ID
-- File: 20251119110000_remove_customer_org_unique_constraint.sql
--
-- This migration enables multi-workspace support by allowing one LemonSqueezy customer
-- to be associated with multiple organizations. This is critical because LemonSqueezy
-- reuses customer IDs for the same email address across different purchases.
--
-- Key Changes:
-- - Drop UNIQUE constraint on customers.organization_id
-- - Drop composite foreign key constraint on subscriptions table
-- - Allow customers table to NOT be tied to organizations
-- - Subscriptions will link directly to organizations via custom_data
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- STEP 1: Drop the composite foreign key constraint on subscriptions
-- This constraint enforces that subscription.customer_id and subscription.organization_id
-- must match a customer record. We need to drop this first before modifying customers table.
-- =====================================================================================

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_customer_organization_match;

-- =====================================================================================
-- STEP 2: Drop the UNIQUE constraint on customers.organization_id
-- This allows one customer record to exist without being tied to a specific organization
-- =====================================================================================

ALTER TABLE customers
  DROP CONSTRAINT IF EXISTS customers_organization_id_key;

-- =====================================================================================
-- STEP 3: Make organization_id nullable on customers table
-- Customers will be identified solely by lemonsqueezy_customer_id
-- Organization linkage happens at the subscription level
-- =====================================================================================

ALTER TABLE customers
  ALTER COLUMN organization_id DROP NOT NULL;

COMMIT;

-- Verify constraint was dropped successfully
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name IN ('customers', 'subscriptions')
  AND (
    tc.constraint_name = 'customers_organization_id_key'
    OR tc.constraint_name = 'subscriptions_customer_organization_match'
  );
