-- Phase 6 Part 3: Remove Duplicate Indexes
-- Advisory: Resolves 2 duplicate_index warnings from Supabase
-- Risk Level: VERY LOW - Only removing redundant indexes, UNIQUE constraints remain
-- Date: 2025-10-27

-- Drop duplicate index on customers table
-- Keep: customers_lemonsqueezy_customer_id_key (UNIQUE constraint index)
-- Drop: idx_customers_lemonsqueezy_id (redundant non-unique index)
DROP INDEX IF EXISTS public.idx_customers_lemonsqueezy_id;

-- Drop duplicate index on subscriptions table
-- Keep: subscriptions_lemonsqueezy_subscription_id_key (UNIQUE constraint index)
-- Drop: idx_subscriptions_lemonsqueezy_id (redundant non-unique index)
DROP INDEX IF EXISTS public.idx_subscriptions_lemonsqueezy_id;

-- Verification: Ensure UNIQUE constraint indexes still exist
DO $$
BEGIN
  -- Verify customers UNIQUE index exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'customers'
      AND indexname = 'customers_lemonsqueezy_customer_id_key'
  ) THEN
    RAISE EXCEPTION 'CRITICAL: UNIQUE index customers_lemonsqueezy_customer_id_key is missing!';
  END IF;

  -- Verify subscriptions UNIQUE index exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'subscriptions'
      AND indexname = 'subscriptions_lemonsqueezy_subscription_id_key'
  ) THEN
    RAISE EXCEPTION 'CRITICAL: UNIQUE index subscriptions_lemonsqueezy_subscription_id_key is missing!';
  END IF;

  RAISE NOTICE '✅ Verification passed: All required UNIQUE indexes exist';
  RAISE NOTICE '✅ Duplicate indexes removed successfully';
  RAISE NOTICE '✅ 2 duplicate_index warnings resolved';
END $$;
