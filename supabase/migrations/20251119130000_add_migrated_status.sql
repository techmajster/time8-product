-- Migration: Add 'migrated' status to subscriptions table
-- Date: 2025-11-19
-- Purpose: Allow marking old subscriptions as 'migrated' during monthly→yearly transitions
-- Related: Task 20.1-20.3 in .agent-os/specs/2025-11-14-two-product-migration/tasks.md

-- Drop the existing status check constraint
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

-- Add new constraint with 'migrated' status included
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN (
    'active',
    'past_due',
    'cancelled',
    'expired',
    'on_trial',
    'paused',
    'migrated'
  ));

-- Add comment explaining the 'migrated' status
COMMENT ON CONSTRAINT subscriptions_status_check ON subscriptions IS
  'Allowed subscription statuses. The "migrated" status indicates a subscription that has been upgraded from monthly to yearly billing.';
