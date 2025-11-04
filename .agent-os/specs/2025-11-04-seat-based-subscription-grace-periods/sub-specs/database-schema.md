# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-11-04-seat-based-subscription-grace-periods/spec.md

## Changes Required

### 1. Extend subscriptions table

**New columns needed:**

```sql
-- Migration: Add subscription tracking columns
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS current_seats INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_seats INTEGER,
  ADD COLUMN IF NOT EXISTS lemonsqueezy_quantity_synced BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lemonsqueezy_subscription_item_id TEXT;

-- Add index for job queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_pending_renewal
  ON subscriptions(renews_at)
  WHERE pending_seats IS NOT NULL;

-- Add index for reconciliation queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_active
  ON subscriptions(status)
  WHERE status = 'active';
```

**Column purposes:**
- `current_seats`: The number of seats the organization has paid for in current billing period
- `pending_seats`: The number of seats that will take effect at next renewal (NULL if no change)
- `lemonsqueezy_quantity_synced`: Whether Lemon Squeezy has been updated for pending change
- `lemonsqueezy_subscription_item_id`: The subscription item ID needed for quantity updates via API

**Data migration:**
```sql
-- Populate current_seats from existing quantity field
UPDATE subscriptions
SET current_seats = quantity
WHERE current_seats = 0;

-- Populate lemonsqueezy_subscription_item_id from existing data
-- This may need to be done via application code if not stored yet
```

### 2. Extend users table

**New columns and enum values:**

```sql
-- Add removal tracking
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS removal_effective_date TIMESTAMPTZ;

-- Extend user_status enum (if using enum type)
-- Note: Postgres doesn't allow modifying enums directly, must use this approach
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending_removal') THEN
        ALTER TYPE user_status ADD VALUE 'pending_removal';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'archived') THEN
        ALTER TYPE user_status ADD VALUE 'archived';
    END IF;
END $$;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_pending_removal
  ON users(organization_id, status, removal_effective_date)
  WHERE status = 'pending_removal';

CREATE INDEX IF NOT EXISTS idx_users_archived
  ON users(organization_id, status)
  WHERE status = 'archived';

CREATE INDEX IF NOT EXISTS idx_users_active_and_pending
  ON users(organization_id, status)
  WHERE status IN ('active', 'pending_removal');
```

**Column purposes:**
- `removal_effective_date`: When the user will be archived (typically the subscription renewal date)

**New status values:**
- `pending_removal`: User marked for removal but still has access until renewal
- `archived`: User removed and no longer has access, but data preserved

### 3. Create alerts table (optional but recommended)

```sql
-- Store critical alerts for admin dashboard
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Index for fetching unresolved alerts
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved
  ON alerts(created_at DESC)
  WHERE resolved = FALSE;
```

**Purpose:** Track billing discrepancies and system issues for admin visibility.

## Schema Relationships

```
organizations
    ↓ (1:1)
subscriptions [current_seats, pending_seats, renews_at]
    ↓ (1:N)
users [status: active|pending_removal|archived, removal_effective_date]
```

## Constraints and Validations

```sql
-- Ensure pending_seats is never negative
ALTER TABLE subscriptions
  ADD CONSTRAINT check_pending_seats_positive
  CHECK (pending_seats IS NULL OR pending_seats >= 0);

-- Ensure current_seats is never negative
ALTER TABLE subscriptions
  ADD CONSTRAINT check_current_seats_positive
  CHECK (current_seats >= 0);

-- Ensure removal_effective_date is set when status is pending_removal
-- (Enforced at application level, not database constraint due to complexity)
```

## Data Integrity

**RLS Policies (if using Supabase RLS):**

```sql
-- Allow users to view their own organization's subscription
CREATE POLICY "Users can view own org subscription"
  ON subscriptions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- Only admins can view archived users
CREATE POLICY "Admins can view archived users"
  ON users FOR SELECT
  USING (
    status = 'archived' AND
    EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = users.organization_id
        AND uo.role = 'admin'
    )
  );
```

## Performance Optimization

**Recommended indexes for common queries:**

```sql
-- For finding subscriptions needing sync
CREATE INDEX idx_subscriptions_sync_needed
  ON subscriptions(renews_at, pending_seats)
  WHERE pending_seats IS NOT NULL
    AND lemonsqueezy_quantity_synced = FALSE;

-- For seat availability checks
CREATE INDEX idx_users_seat_count
  ON users(organization_id, status)
  WHERE status IN ('active', 'pending_removal');

-- For archival at renewal
CREATE INDEX idx_users_ready_for_archival
  ON users(organization_id, status, removal_effective_date)
  WHERE status = 'pending_removal';
```

## Rollback Plan

If this feature needs to be rolled back:

```sql
-- Remove new columns (preserves data if needed later)
ALTER TABLE subscriptions
  DROP COLUMN IF EXISTS current_seats,
  DROP COLUMN IF EXISTS pending_seats,
  DROP COLUMN IF EXISTS lemonsqueezy_quantity_synced,
  DROP COLUMN IF EXISTS lemonsqueezy_subscription_item_id;

ALTER TABLE users
  DROP COLUMN IF EXISTS removal_effective_date;

-- Note: Cannot easily remove enum values once added
-- Must create new enum type or handle at application level

DROP TABLE IF EXISTS alerts;
```

## Testing Data

**Seed data for testing:**

```sql
-- Test organization with pending removal
INSERT INTO subscriptions (organization_id, current_seats, pending_seats, renews_at)
VALUES ('test-org-1', 10, 9, NOW() + INTERVAL '1 day');

INSERT INTO users (organization_id, status, removal_effective_date)
VALUES ('test-org-1', 'pending_removal', NOW() + INTERVAL '1 day');

-- Test organization with no pending changes
INSERT INTO subscriptions (organization_id, current_seats, pending_seats, renews_at)
VALUES ('test-org-2', 5, NULL, NOW() + INTERVAL '30 days');
```
