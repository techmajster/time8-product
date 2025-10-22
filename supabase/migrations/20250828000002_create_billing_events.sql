-- =====================================================================================
-- LEMON SQUEEZY BILLING INTEGRATION - BILLING EVENTS
-- File: 20250828000002_create_billing_events.sql
-- 
-- This migration creates the billing_events table for webhook event logging.
-- This table is critical for debugging webhook issues and maintaining an audit trail.
--
-- Key Features:
-- - Log all webhook events from Lemon Squeezy
-- - Track processing status and errors
-- - System-only access (no user policies)
-- - Efficient querying with proper indexes
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- TABLE: billing_events
-- Purpose: Log all webhook events for debugging and audit trail
-- Access: System only (service_role)
-- =====================================================================================

CREATE TABLE billing_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    lemonsqueezy_event_id TEXT UNIQUE,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('processed', 'failed', 'skipped')),
    error_message TEXT,
    
    -- Ensure error_message is provided when status is failed
    CONSTRAINT billing_events_error_message_check 
        CHECK ((status = 'failed' AND error_message IS NOT NULL) OR (status != 'failed'))
);

-- Performance indexes for common queries
CREATE INDEX idx_billing_events_event_type ON billing_events(event_type);
CREATE INDEX idx_billing_events_processed_at ON billing_events(processed_at);
CREATE INDEX idx_billing_events_status ON billing_events(status);
CREATE INDEX idx_billing_events_event_type_status ON billing_events(event_type, status);

-- Index for failed events debugging
CREATE INDEX idx_billing_events_failed ON billing_events(processed_at) 
    WHERE status = 'failed';

-- JSONB index for efficient payload queries (if needed for debugging)
CREATE INDEX idx_billing_events_payload_gin ON billing_events USING gin(payload);

-- =====================================================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================================================

-- Enable RLS - No user policies, system access only
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access billing events
CREATE POLICY "Service role can manage billing events" ON billing_events 
    FOR ALL USING (auth.role() = 'service_role');

-- =====================================================================================
-- HELPER FUNCTIONS FOR WEBHOOK EVENT PROCESSING
-- =====================================================================================

-- Function to log webhook events (called from webhook handler)
CREATE OR REPLACE FUNCTION log_billing_event(
    p_event_type TEXT,
    p_lemonsqueezy_event_id TEXT,
    p_payload JSONB,
    p_status TEXT DEFAULT 'processed',
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO billing_events (
        event_type,
        lemonsqueezy_event_id,
        payload,
        status,
        error_message
    )
    VALUES (
        p_event_type,
        p_lemonsqueezy_event_id,
        p_payload,
        p_status,
        p_error_message
    )
    RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$;

-- Function to update event status (for retry scenarios)
CREATE OR REPLACE FUNCTION update_billing_event_status(
    p_event_id UUID,
    p_status TEXT,
    p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE billing_events 
    SET 
        status = p_status,
        error_message = p_error_message,
        processed_at = now()
    WHERE id = p_event_id;
    
    RETURN FOUND;
END;
$$;

-- Function to get event processing statistics (for monitoring)
CREATE OR REPLACE FUNCTION get_billing_event_stats(
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    event_type TEXT,
    total_events BIGINT,
    processed_events BIGINT,
    failed_events BIGINT,
    skipped_events BIGINT,
    success_rate NUMERIC(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        be.event_type,
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE be.status = 'processed') as processed_events,
        COUNT(*) FILTER (WHERE be.status = 'failed') as failed_events,
        COUNT(*) FILTER (WHERE be.status = 'skipped') as skipped_events,
        ROUND(
            (COUNT(*) FILTER (WHERE be.status = 'processed')::NUMERIC / COUNT(*)::NUMERIC) * 100, 
            2
        ) as success_rate
    FROM billing_events be
    WHERE be.processed_at >= (now() - INTERVAL '1 hour' * p_hours)
    GROUP BY be.event_type
    ORDER BY total_events DESC;
END;
$$;

COMMIT;

-- Verify table was created successfully
SELECT 
    table_name,
    CASE 
        WHEN table_name = 'billing_events' THEN '✅ Created'
        ELSE '❌ Missing'
    END as creation_status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name = 'billing_events';