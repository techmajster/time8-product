# Phase 6 Part 3: Duplicate Index Removal

## Overview

Remove 2 duplicate indexes that waste storage and slow down write operations. Duplicate indexes provide no benefit but add overhead to INSERT, UPDATE, and DELETE operations.

## Risk Level

**VERY LOW RISK** - Removing duplicate indexes cannot break functionality. The remaining index provides identical coverage.

## Current Problem

### Advisory Warnings

Supabase has flagged **2 duplicate indexes** with `WARN` level:

**Advisory ID:** `duplicate_index`
**Category:** PERFORMANCE
**Level:** WARN
**Facing:** EXTERNAL

### Performance Impact

**Problem:** Duplicate indexes must ALL be maintained on every write operation.

**Example:**
```sql
-- Both indexes cover the same column:
CREATE UNIQUE INDEX customers_lemonsqueezy_customer_id_key ON customers(lemonsqueezy_customer_id);
CREATE INDEX idx_customers_lemonsqueezy_id ON customers(lemonsqueezy_customer_id);

-- PostgreSQL must update BOTH indexes on every INSERT/UPDATE/DELETE
INSERT INTO customers (...) VALUES (...);
-- Updates: customers_lemonsqueezy_customer_id_key + idx_customers_lemonsqueezy_id
```

**Solution:** Drop one of the duplicate indexes:
```sql
-- Keep the UNIQUE index (provides constraint + indexing)
-- Drop the redundant non-unique index
DROP INDEX IF EXISTS idx_customers_lemonsqueezy_id;
```

### Why This Matters

- **Write Performance**: Every write operation updates multiple identical indexes
- **Storage Cost**: Duplicate indexes waste disk space
- **Maintenance Overhead**: VACUUM and ANALYZE process redundant indexes
- **No Benefit**: Second index provides zero additional query performance

---

## Affected Tables and Indexes

### 1. customers table

**Duplicate Indexes:**
- `customers_lemonsqueezy_customer_id_key` (UNIQUE constraint index)
- `idx_customers_lemonsqueezy_id` (redundant non-unique index)

**Column:** `lemonsqueezy_customer_id`

**Recommendation:** Keep `customers_lemonsqueezy_customer_id_key` (UNIQUE), drop `idx_customers_lemonsqueezy_id`

**Rationale:** UNIQUE constraint index serves both purposes:
- Enforces uniqueness (constraint)
- Provides fast lookups (index)

---

### 2. subscriptions table

**Duplicate Indexes:**
- `subscriptions_lemonsqueezy_subscription_id_key` (UNIQUE constraint index)
- `idx_subscriptions_lemonsqueezy_id` (redundant non-unique index)

**Column:** `lemonsqueezy_subscription_id`

**Recommendation:** Keep `subscriptions_lemonsqueezy_subscription_id_key` (UNIQUE), drop `idx_subscriptions_lemonsqueezy_id`

**Rationale:** UNIQUE constraint index serves both purposes:
- Enforces uniqueness (constraint)
- Provides fast lookups (index)

---

## Migration SQL

### Complete Migration

```sql
-- Phase 6 Part 3: Remove Duplicate Indexes
-- Advisory: Resolves 2 duplicate_index warnings

-- Drop duplicate index on customers table
DROP INDEX IF EXISTS public.idx_customers_lemonsqueezy_id;
-- Keeps: customers_lemonsqueezy_customer_id_key (UNIQUE)

-- Drop duplicate index on subscriptions table
DROP INDEX IF EXISTS public.idx_subscriptions_lemonsqueezy_id;
-- Keeps: subscriptions_lemonsqueezy_subscription_id_key (UNIQUE)

-- Verification: Check that UNIQUE indexes still exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'customers'
      AND indexname = 'customers_lemonsqueezy_customer_id_key'
  ) THEN
    RAISE EXCEPTION 'UNIQUE index customers_lemonsqueezy_customer_id_key is missing!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'subscriptions'
      AND indexname = 'subscriptions_lemonsqueezy_subscription_id_key'
  ) THEN
    RAISE EXCEPTION 'UNIQUE index subscriptions_lemonsqueezy_subscription_id_key is missing!';
  END IF;

  RAISE NOTICE 'Verification passed: All required UNIQUE indexes exist';
END $$;
```

---

## Verification Queries

### Before Migration: Confirm Duplicates Exist

```sql
-- Check customers table indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'customers'
  AND indexname IN (
    'customers_lemonsqueezy_customer_id_key',
    'idx_customers_lemonsqueezy_id'
  )
ORDER BY indexname;

-- Check subscriptions table indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'subscriptions'
  AND indexname IN (
    'subscriptions_lemonsqueezy_subscription_id_key',
    'idx_subscriptions_lemonsqueezy_id'
  )
ORDER BY indexname;
```

### After Migration: Verify Only UNIQUE Indexes Remain

```sql
-- Should return 0 rows (duplicates removed)
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_customers_lemonsqueezy_id',
    'idx_subscriptions_lemonsqueezy_id'
  );

-- Should return 2 rows (UNIQUE indexes still exist)
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'customers_lemonsqueezy_customer_id_key',
    'subscriptions_lemonsqueezy_subscription_id_key'
  );
```

---

## Expected Performance Impact

### Write Performance

**customers table:**
- Before: 2 indexes updated per write
- After: 1 index updated per write
- **50% reduction in index maintenance**

**subscriptions table:**
- Before: 2 indexes updated per write
- After: 1 index updated per write
- **50% reduction in index maintenance**

### Storage Savings

Each index stores:
- B-tree structure (~5-10 KB per 1,000 rows)
- Row pointers (~8 bytes per row)

**Estimated savings:**
- customers: ~10-20 KB saved
- subscriptions: ~10-20 KB saved
- **Total: ~20-40 KB saved**

(Small but eliminates unnecessary maintenance overhead)

### Query Performance

**No Change**: Read queries use the UNIQUE index, which remains.

---

## Rollback Procedure

If needed (unlikely), recreate the dropped indexes:

```sql
-- Restore duplicate index on customers (NOT RECOMMENDED)
CREATE INDEX idx_customers_lemonsqueezy_id
ON public.customers(lemonsqueezy_customer_id);

-- Restore duplicate index on subscriptions (NOT RECOMMENDED)
CREATE INDEX idx_subscriptions_lemonsqueezy_id
ON public.subscriptions(lemonsqueezy_subscription_id);
```

**Note:** Rollback should not be necessary. The UNIQUE indexes provide identical functionality.

---

## Testing Strategy

### Functional Tests

1. **Test LemonSqueezy Integration:**
   - Create new customer → verify lookup by `lemonsqueezy_customer_id` works
   - Create new subscription → verify lookup by `lemonsqueezy_subscription_id` works
   - Update customer → verify index maintained correctly
   - Update subscription → verify index maintained correctly

2. **Test Uniqueness Constraint:**
   - Try to insert duplicate `lemonsqueezy_customer_id` → should fail (constraint enforced)
   - Try to insert duplicate `lemonsqueezy_subscription_id` → should fail (constraint enforced)

### Performance Tests

```sql
-- Test customer lookup performance
EXPLAIN ANALYZE
SELECT * FROM customers
WHERE lemonsqueezy_customer_id = 'cus_123';
-- Should use customers_lemonsqueezy_customer_id_key index

-- Test subscription lookup performance
EXPLAIN ANALYZE
SELECT * FROM subscriptions
WHERE lemonsqueezy_subscription_id = 'sub_123';
-- Should use subscriptions_lemonsqueezy_subscription_id_key index
```

### Manual QA Checklist

- [ ] Billing integration still works (customer creation)
- [ ] Subscription creation works via LemonSqueezy webhook
- [ ] Subscription updates work via webhook
- [ ] Customer lookup by LemonSqueezy ID works
- [ ] Subscription lookup by LemonSqueezy ID works
- [ ] UNIQUE constraint prevents duplicate customers
- [ ] UNIQUE constraint prevents duplicate subscriptions
- [ ] No errors in application logs

---

## Task Breakdown

### Task 1: Drop duplicate index on customers table
- SQL: `DROP INDEX IF EXISTS public.idx_customers_lemonsqueezy_id;`
- Expected: 1 warning resolved

### Task 2: Drop duplicate index on subscriptions table
- SQL: `DROP INDEX IF EXISTS public.idx_subscriptions_lemonsqueezy_id;`
- Expected: 1 warning resolved

**Total:** 2 tasks to eliminate 2 warnings

---

## Success Criteria

- [ ] 2 duplicate index warnings eliminated
- [ ] UNIQUE constraint indexes remain on both tables
- [ ] LemonSqueezy integration still functional
- [ ] Customer and subscription lookups work correctly
- [ ] Write performance improved (50% fewer index updates)
- [ ] All existing tests passing
- [ ] No errors in production logs

---

## Migration Timeline

**Estimated Time:** 5 minutes

1. Apply migration SQL (< 1 second)
2. Verify indexes dropped correctly (< 1 second)
3. Run functional tests (2-3 minutes)
4. Monitor production for 1-2 hours

**Downtime:** None (DROP INDEX is non-blocking)

---

## References

- [Supabase: Duplicate Index Linter](https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index)
- [PostgreSQL DROP INDEX](https://www.postgresql.org/docs/current/sql-dropindex.html)
- [PostgreSQL Index Maintenance](https://www.postgresql.org/docs/current/indexes-index-only-scans.html)
