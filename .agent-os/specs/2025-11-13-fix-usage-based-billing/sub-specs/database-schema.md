# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-11-13-fix-usage-based-billing/spec.md

## Overview

Add `billing_type` column to `subscriptions` table to track whether a subscription uses volume pricing (legacy) or usage-based billing (new).

## Why This Is Needed

**Problem**: Currently impossible to distinguish between:
- Legacy subscriptions created before usage-based billing was enabled
- New subscriptions using usage-based billing

**Impact**:
- API routes must attempt usage records API and wait for 422 error (reactive)
- No way to proactively detect and handle legacy subscriptions
- Extra API calls and poor error messages for users

**Solution**: Store billing type at creation time, enabling:
- Proactive detection before API calls (faster, better UX)
- Clear error messages explaining legacy subscription limitations
- Ability to query subscriptions by billing model
- Future-proof for potential additional billing models

## Schema Changes

### Add Column

```sql
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS billing_type TEXT
CHECK (billing_type IN ('volume', 'usage_based'))
DEFAULT 'usage_based';
```

**Column Details**:
- **Name**: `billing_type`
- **Type**: `TEXT` with CHECK constraint
- **Allowed Values**: `'volume'` or `'usage_based'`
- **Default**: `'usage_based'` (all new subscriptions)
- **Nullable**: No (enforced by default)

### Add Index

```sql
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_type
ON subscriptions(billing_type);
```

**Index Purpose**:
- Enable fast queries filtering by billing type
- Support analytics on billing model adoption
- Improve performance for proactive legacy detection

### Add Documentation

```sql
COMMENT ON COLUMN subscriptions.billing_type IS
'Billing model: "volume" for legacy subscriptions created before usage-based billing, "usage_based" for new subscriptions using usage records API. Set at creation time based on variant configuration.';
```

## Migration File

**Filename**: `supabase/migrations/20251113000000_add_billing_type_to_subscriptions.sql`

**Full Migration**:

```sql
-- =====================================================================================
-- ADD BILLING TYPE TO SUBSCRIPTIONS
-- File: 20251113000000_add_billing_type_to_subscriptions.sql
--
-- This migration adds billing_type column to track whether subscriptions use
-- volume pricing (legacy) or usage-based billing (new usage records API).
--
-- Key Features:
-- - Distinguish legacy vs. usage-based subscriptions
-- - Enable proactive detection before API calls
-- - Support future billing models
-- - Improve error handling and user messaging
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- ADD COLUMN TO SUBSCRIPTIONS TABLE
-- =====================================================================================

-- Add billing_type column with constraint
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS billing_type TEXT
CHECK (billing_type IN ('volume', 'usage_based'))
DEFAULT 'usage_based';

-- =====================================================================================
-- ADD INDEX FOR PERFORMANCE
-- =====================================================================================

-- Index for querying by billing type
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_type
ON subscriptions(billing_type);

-- =====================================================================================
-- ADD COLUMN DOCUMENTATION
-- =====================================================================================

COMMENT ON COLUMN subscriptions.billing_type IS
'Billing model: "volume" for legacy subscriptions created before usage-based billing was enabled, "usage_based" for new subscriptions using usage records API. Set at creation time based on first_subscription_item.is_usage_based flag from LemonSqueezy webhook.';

-- =====================================================================================
-- DATA MIGRATION (IF NEEDED)
-- =====================================================================================

-- If there are any existing subscriptions, mark them as 'volume' (legacy)
-- This assumes all existing subscriptions were created before usage-based billing
-- New subscriptions will automatically default to 'usage_based'

UPDATE subscriptions
SET billing_type = 'volume'
WHERE billing_type IS NULL
  AND created_at < '2025-11-13 00:00:00'; -- Adjust date to when usage-based was enabled

-- Alternatively, if there are NO existing subscriptions (fresh start):
-- No data migration needed, all new subscriptions will default to 'usage_based'

COMMIT;

-- =====================================================================================
-- VERIFICATION
-- =====================================================================================

-- Verify column exists
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
    AND column_name = 'billing_type';

-- Verify index exists
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'subscriptions'
    AND indexname = 'idx_subscriptions_billing_type';

-- Verify constraint exists
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
    AND rel.relname = 'subscriptions'
    AND con.contype = 'c'
    AND con.conname LIKE '%billing_type%';

-- Count subscriptions by billing type
SELECT
    billing_type,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM subscriptions
GROUP BY billing_type
ORDER BY billing_type;
```

## Data Migration Strategy

### Scenario 1: No Existing Subscriptions (Current State)

**Status**: All old subscriptions have been removed, starting fresh

**Strategy**: No data migration needed
- All new subscriptions will default to 'usage_based'
- Column will be properly set by webhook handler
- Clean slate for usage-based billing

### Scenario 2: If Existing Subscriptions Are Found

**Strategy**: Mark as legacy
```sql
UPDATE subscriptions
SET billing_type = 'volume'
WHERE created_at < '2025-11-13 00:00:00'; -- Date when usage-based enabled
```

**Rationale**:
- Existing subscriptions were created with volume pricing
- Cannot be migrated to usage-based (LemonSqueezy limitation)
- Need to be marked as legacy for proper error handling

## Application Code Changes

### Webhook Handler

**File**: `app/api/webhooks/lemonsqueezy/handlers.ts`

**subscription_created** (around line 400):

```typescript
billing_type: first_subscription_item?.is_usage_based ? 'usage_based' : 'volume',
```

**Logic**:
- Check `first_subscription_item.is_usage_based` flag from LemonSqueezy
- Set `billing_type` based on this flag
- `true` → 'usage_based'
- `false` → 'volume'

### API Routes

**File**: `app/api/billing/update-subscription-quantity/route.ts`

**Proactive Check** (after fetching subscription):

```typescript
if (subscription.billing_type === 'volume') {
  return NextResponse.json({
    error: 'This subscription was created before usage-based billing was enabled',
    details: 'Please create a new subscription to modify seats.',
    legacy_subscription: true
  }, { status: 400 });
}
```

**Benefits**:
- Fails fast before attempting API call
- Clear error message
- Better user experience

## Testing Verification

After migration, verify:

1. **Column Created**:
```sql
SELECT * FROM information_schema.columns
WHERE table_name = 'subscriptions' AND column_name = 'billing_type';
```

2. **Default Value Works**:
```sql
-- Create test subscription (via webhook simulation)
-- Verify billing_type = 'usage_based'
```

3. **Constraint Enforced**:
```sql
-- This should FAIL:
INSERT INTO subscriptions (billing_type, ...) VALUES ('invalid', ...);
```

4. **Index Exists**:
```sql
SELECT * FROM pg_indexes
WHERE tablename = 'subscriptions' AND indexname LIKE '%billing_type%';
```

5. **Queries Work**:
```sql
-- Fast query by billing type
SELECT COUNT(*) FROM subscriptions WHERE billing_type = 'usage_based';
```

## Rollback Plan

If migration needs to be rolled back:

```sql
BEGIN;

-- Drop index
DROP INDEX IF EXISTS idx_subscriptions_billing_type;

-- Drop column
ALTER TABLE subscriptions DROP COLUMN IF EXISTS billing_type;

COMMIT;
```

**Warning**: Rollback will lose billing type information. Only rollback if migration causes issues and you need to redesign.

## Future Considerations

### Potential Additional Billing Types

The CHECK constraint can be extended if new billing models are added:

```sql
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_billing_type_check;

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_billing_type_check
CHECK (billing_type IN ('volume', 'usage_based', 'hybrid', 'custom'));
```

### Querying Patterns

Common queries enabled by this change:

```sql
-- Count subscriptions by billing type
SELECT billing_type, COUNT(*) FROM subscriptions GROUP BY billing_type;

-- Find all usage-based subscriptions
SELECT * FROM subscriptions WHERE billing_type = 'usage_based';

-- Find legacy subscriptions for migration campaign
SELECT * FROM subscriptions WHERE billing_type = 'volume';

-- Analytics: adoption rate of usage-based billing
SELECT
  billing_type,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM subscriptions
GROUP BY billing_type;
```

## Summary

This schema change enables:
- ✅ Proactive legacy subscription detection
- ✅ Better error messages for users
- ✅ Faster API routes (no unnecessary API calls)
- ✅ Future-proof for additional billing models
- ✅ Analytics on billing model adoption
- ✅ Simplified application logic
