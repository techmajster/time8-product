-- =====================================================================================
-- SEAT MANAGEMENT - SUBSCRIPTIONS TABLE EXTENSIONS
-- File: 20251104000000_add_seat_management_to_subscriptions.sql
--
-- This migration extends the subscriptions table to support seat-based subscription
-- management with grace periods. It adds tracking for current/pending seat counts
-- and synchronization status with Lemon Squeezy.
--
-- Key Features:
-- - Track current seat count (what customer has paid for this period)
-- - Track pending seat count (what will take effect at next renewal)
-- - Track sync status with Lemon Squeezy API
-- - Store subscription item ID for API updates
-- - Performance indexes for background jobs
--
-- Related Spec: .agent-os/specs/2025-11-04-seat-based-subscription-grace-periods/
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- ADD NEW COLUMNS TO SUBSCRIPTIONS TABLE
-- =====================================================================================

-- Current seats: Number of seats the organization has paid for in current billing period
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS current_seats INTEGER NOT NULL DEFAULT 0;

-- Pending seats: Number of seats that will take effect at next renewal (NULL if no change)
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS pending_seats INTEGER;

-- Sync status: Whether Lemon Squeezy has been updated for pending change
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS lemonsqueezy_quantity_synced BOOLEAN NOT NULL DEFAULT FALSE;

-- Subscription item ID: Needed for quantity updates via Lemon Squeezy API
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS lemonsqueezy_subscription_item_id TEXT;

-- =====================================================================================
-- ADD CONSTRAINTS
-- =====================================================================================

-- Ensure current_seats is never negative
ALTER TABLE subscriptions
ADD CONSTRAINT check_current_seats_positive
CHECK (current_seats >= 0);

-- Ensure pending_seats is never negative (when not NULL)
ALTER TABLE subscriptions
ADD CONSTRAINT check_pending_seats_positive
CHECK (pending_seats IS NULL OR pending_seats >= 0);

-- =====================================================================================
-- ADD PERFORMANCE INDEXES
-- =====================================================================================

-- Index for finding subscriptions with pending changes that renew soon
-- Used by ApplyPendingSubscriptionChangesJob (runs every 6 hours)
CREATE INDEX IF NOT EXISTS idx_subscriptions_pending_renewal
  ON subscriptions(renews_at)
  WHERE pending_seats IS NOT NULL;

-- Index for finding subscriptions needing sync before renewal
CREATE INDEX IF NOT EXISTS idx_subscriptions_sync_needed
  ON subscriptions(renews_at, pending_seats)
  WHERE pending_seats IS NOT NULL
    AND lemonsqueezy_quantity_synced = FALSE;

-- Index for active subscriptions queries (already exists, but ensuring it's optimal)
-- Recreate with additional column for seat management queries
DROP INDEX IF EXISTS idx_subscriptions_active;
CREATE INDEX idx_subscriptions_active
  ON subscriptions(organization_id, status, current_seats)
  WHERE status IN ('active', 'on_trial');

-- =====================================================================================
-- ADD COLUMN COMMENTS FOR DOCUMENTATION
-- =====================================================================================

COMMENT ON COLUMN subscriptions.current_seats IS
'Number of seats the organization has paid for in the current billing period. This is the source of truth for access control.';

COMMENT ON COLUMN subscriptions.pending_seats IS
'Number of seats that will take effect at the next renewal. NULL means no change pending. Used for grace period management.';

COMMENT ON COLUMN subscriptions.lemonsqueezy_quantity_synced IS
'Whether Lemon Squeezy has been updated with the pending seat count. Set to TRUE by background job 24h before renewal.';

COMMENT ON COLUMN subscriptions.lemonsqueezy_subscription_item_id IS
'Lemon Squeezy subscription item ID needed for updating seat quantity via API. Format: numeric string (e.g., "1234567").';

-- =====================================================================================
-- DATA MIGRATION: POPULATE EXISTING SUBSCRIPTIONS
-- =====================================================================================

-- Set current_seats to match existing quantity for all active subscriptions
-- This ensures existing subscriptions work correctly with the new grace period system
UPDATE subscriptions
SET current_seats = quantity
WHERE current_seats = 0 AND quantity > 0;

-- Note: lemonsqueezy_subscription_item_id will need to be populated via sync script
-- or captured from next webhook event

COMMIT;

-- =====================================================================================
-- VERIFICATION
-- =====================================================================================

-- Verify new columns exist
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
    AND column_name IN (
        'current_seats',
        'pending_seats',
        'lemonsqueezy_quantity_synced',
        'lemonsqueezy_subscription_item_id'
    )
ORDER BY column_name;

-- Verify indexes exist
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'subscriptions'
    AND indexname IN (
        'idx_subscriptions_pending_renewal',
        'idx_subscriptions_sync_needed',
        'idx_subscriptions_active'
    )
ORDER BY indexname;

-- Verify constraints exist
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
    AND rel.relname = 'subscriptions'
    AND con.conname IN (
        'check_current_seats_positive',
        'check_pending_seats_positive'
    )
ORDER BY con.conname;
