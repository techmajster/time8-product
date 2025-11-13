# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-11-13-hybrid-billing-monthly-yearly/spec.md

## Overview

Add 'quantity_based' value to the existing `billing_type` column CHECK constraint to support yearly subscriptions using quantity-based billing with immediate proration.

**No data migration needed** - this is purely a schema change to allow new values.

## Current Schema

```sql
-- From: 20251113000000_migrate_to_usage_based_billing.sql
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS billing_type TEXT
CHECK (billing_type IN ('volume', 'usage_based'))
DEFAULT 'usage_based';
```

**Current allowed values**:
- `'volume'`: Legacy subscriptions (pre-migration, to be cleaned up later)
- `'usage_based'`: Monthly subscriptions using usage records API

## Required Changes

### Migration File

**Name**: `20251113000001_add_quantity_based_billing_type.sql`

**Purpose**: Add 'quantity_based' to billing_type CHECK constraint

```sql
-- =====================================================================================
-- ADD QUANTITY-BASED BILLING TYPE
-- File: 20251113000001_add_quantity_based_billing_type.sql
--
-- This migration adds 'quantity_based' to the billing_type enum to support
-- yearly subscriptions that use quantity updates with immediate proration
-- instead of usage records billed in arrears.
--
-- Billing Types:
-- - 'volume': Legacy subscriptions (pre-usage-based migration, deprecated)
-- - 'usage_based': Monthly subscriptions charged at end of period via usage records
-- - 'quantity_based': Yearly subscriptions charged immediately via quantity updates
--
-- Related Spec: .agent-os/specs/2025-11-13-hybrid-billing-monthly-yearly/
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- 1. DROP EXISTING CHECK CONSTRAINT
-- =====================================================================================

-- Find and drop the existing CHECK constraint on billing_type
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_billing_type_check;

-- =====================================================================================
-- 2. ADD NEW CHECK CONSTRAINT WITH quantity_based
-- =====================================================================================

-- Add updated CHECK constraint with all three values
ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_billing_type_check
CHECK (billing_type IN ('volume', 'usage_based', 'quantity_based'));

-- =====================================================================================
-- 3. UPDATE COLUMN COMMENT
-- =====================================================================================

-- Update comment to reflect new billing type
COMMENT ON COLUMN subscriptions.billing_type IS
'Billing model: "volume" (legacy, deprecated), "usage_based" (monthly subscriptions using usage records API, charged in arrears), "quantity_based" (yearly subscriptions using quantity updates with immediate proration). Determines which billing logic to apply.';

COMMIT;

-- =====================================================================================
-- VERIFICATION QUERIES
-- =====================================================================================

-- Verify CHECK constraint exists with correct values
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
INNER JOIN pg_namespace nsp ON nsp.oid = connamespace
WHERE nsp.nspname = 'public'
    AND rel.relname = 'subscriptions'
    AND con.conname = 'subscriptions_billing_type_check';

-- Should show: CHECK (billing_type IN ('volume', 'usage_based', 'quantity_based'))

-- Verify column comment updated
SELECT
    col_description('subscriptions'::regclass, attnum) AS column_comment
FROM pg_attribute
WHERE attrelid = 'subscriptions'::regclass
    AND attname = 'billing_type';

-- Verify no existing subscriptions have billing_type = 'quantity_based' yet
SELECT
    billing_type,
    COUNT(*) AS count
FROM subscriptions
GROUP BY billing_type;

-- Expected output:
-- | billing_type   | count |
-- |----------------|-------|
-- | volume         | X     | (if any legacy subscriptions exist)
-- | usage_based    | Y     | (existing monthly subscriptions)
-- | quantity_based | 0     | (none yet - will be created by webhook)
```

## Migration Strategy

### Pre-Migration Checks
1. Verify subscriptions table exists
2. Verify billing_type column exists
3. Verify no active transactions that might conflict

### Post-Migration Verification
1. Run verification queries to confirm constraint updated
2. Verify existing subscriptions still have valid billing_type values
3. Test inserting new subscription with 'quantity_based' value
4. Verify column comment updated

### Rollback Plan

If migration needs to be rolled back:

```sql
BEGIN;

-- Remove quantity_based from CHECK constraint
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_billing_type_check;

-- Restore original constraint (two values only)
ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_billing_type_check
CHECK (billing_type IN ('volume', 'usage_based'));

-- Restore original comment
COMMENT ON COLUMN subscriptions.billing_type IS
'Billing model: "volume" for legacy subscriptions, "usage_based" for new subscriptions using usage records API. Determines which billing logic to apply.';

COMMIT;
```

## Impact Analysis

### Existing Data
- ❌ No data changes
- ✅ All existing subscriptions remain valid
- ✅ Existing 'volume' and 'usage_based' values unchanged

### Application Code
- ⚠️ Webhook handlers must be updated to set 'quantity_based' for yearly subscriptions
- ⚠️ SeatManager service must be implemented to handle 'quantity_based' routing
- ✅ Existing 'usage_based' logic continues working unchanged

### Risk Level
🟢 **LOW RISK**
- Schema-only change (no data migration)
- Backward compatible (existing values still valid)
- No changes to existing subscription behavior
- Can be rolled back easily if needed

## Testing Requirements

### Test 1: Migration Success
```sql
-- Run migration
\i supabase/migrations/20251113000001_add_quantity_based_billing_type.sql

-- Verify constraint updated
SELECT pg_get_constraintdef(con.oid)
FROM pg_constraint con
WHERE con.conname = 'subscriptions_billing_type_check';

-- Expected: CHECK (billing_type IN ('volume', 'usage_based', 'quantity_based'))
```

### Test 2: Insert New Quantity-Based Subscription
```sql
-- Test inserting subscription with new billing_type
INSERT INTO subscriptions (
    organization_id,
    billing_type,
    current_seats,
    status
) VALUES (
    'test-org-id',
    'quantity_based',
    6,
    'active'
);

-- Should succeed with no errors
```

### Test 3: Existing Subscriptions Unchanged
```sql
-- Verify existing subscriptions still valid
SELECT id, billing_type, status
FROM subscriptions
WHERE billing_type IN ('volume', 'usage_based');

-- All should still be valid and accessible
```

### Test 4: Invalid Value Rejected
```sql
-- Test that invalid billing_type is rejected
INSERT INTO subscriptions (
    organization_id,
    billing_type,
    current_seats,
    status
) VALUES (
    'test-org-id',
    'invalid_type',
    6,
    'active'
);

-- Should fail with CHECK constraint violation
```

## Related Files

- Previous migration: `supabase/migrations/20251113000000_migrate_to_usage_based_billing.sql`
- Webhook handler: `app/api/webhooks/lemonsqueezy/handlers.ts` (must be updated)
- SeatManager service: `lib/billing/seat-manager.ts` (to be created)

## Success Criteria

✅ Migration runs successfully on staging and production
✅ All existing subscriptions remain valid
✅ New subscriptions can use 'quantity_based' value
✅ CHECK constraint includes all three values
✅ Column comment updated to reflect new type
✅ No errors in application logs
✅ Rollback plan tested and verified working
