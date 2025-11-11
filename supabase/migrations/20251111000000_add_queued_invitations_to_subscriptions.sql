-- =====================================================================================
-- ADD QUEUED INVITATIONS STORAGE TO SUBSCRIPTIONS
-- File: 20251111000000_add_queued_invitations_to_subscriptions.sql
--
-- This migration adds temporary storage for queued invitations that are waiting
-- for payment confirmation before being sent.
--
-- Key Features:
-- - Store invitations temporarily as JSONB
-- - Cleared after subscription_payment_success webhook processes them
-- - Used for payment security (no invitations sent until payment confirmed)
--
-- Related Spec: .agent-os/specs/2025-11-11-lemonsqueezy-subscription-sync-fix/
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- ADD QUEUED INVITATIONS COLUMN
-- =====================================================================================

-- Queued invitations: Temporarily stores invitations waiting for payment confirmation
-- Format: JSONB array of objects with {email: string, role: string}
-- Cleared after subscription_payment_success webhook sends the invitations
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS queued_invitations JSONB;

-- =====================================================================================
-- ADD COLUMN COMMENT FOR DOCUMENTATION
-- =====================================================================================

COMMENT ON COLUMN subscriptions.queued_invitations IS
'Temporarily stores invitations waiting for payment confirmation. Format: [{"email": "user@example.com", "role": "employee"}]. Cleared after subscription_payment_success webhook sends invitations.';

COMMIT;

-- =====================================================================================
-- VERIFICATION
-- =====================================================================================

-- Verify new column exists
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
    AND column_name = 'queued_invitations';
