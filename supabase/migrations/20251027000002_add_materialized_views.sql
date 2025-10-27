-- Phase 4: Materialized Views for Aggregations
-- Purpose: Create materialized views for expensive aggregation queries
-- Risk: LOW - Views are additive; existing queries continue unchanged
-- Expected Impact: 85-90% faster aggregation queries

BEGIN;

-- ============================================================================
-- View 1: Organization Seat Usage
-- ============================================================================
-- Purpose: Eliminate repeated COUNT queries for billing and invitation logic
-- Current Performance: 50ms per query
-- Expected Performance: 5ms per query (90% improvement)

CREATE MATERIALIZED VIEW mv_organization_seat_usage AS
SELECT
  organization_id,
  COUNT(*) FILTER (WHERE is_active = true) as active_seats,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_seats,
  array_agg(user_id) FILTER (WHERE is_active = true) as active_user_ids,
  MAX(updated_at) as last_change_at
FROM user_organizations
GROUP BY organization_id;

-- Add unique index for fast lookups by organization_id
CREATE UNIQUE INDEX idx_mv_org_seat_usage_org_id
ON mv_organization_seat_usage(organization_id);

COMMENT ON MATERIALIZED VIEW mv_organization_seat_usage IS
'Aggregated seat usage per organization. Refreshed nightly. Used for billing checks and invitation validation.';

-- ============================================================================
-- View 2: Leave Balance Summaries
-- ============================================================================
-- Purpose: Dashboard aggregations for HR reporting
-- Current Performance: 200ms per query
-- Expected Performance: 30ms per query (85% improvement)

CREATE MATERIALIZED VIEW mv_org_leave_summaries AS
SELECT
  organization_id,
  leave_type_id,
  year,
  COUNT(*) as employee_count,
  SUM(entitled_days) as total_entitled,
  SUM(used_days) as total_used,
  SUM(remaining_days) as total_remaining,
  AVG(remaining_days) as avg_remaining
FROM leave_balances
GROUP BY organization_id, leave_type_id, year;

-- Add unique composite index for fast lookups
CREATE UNIQUE INDEX idx_mv_org_leave_summaries_composite
ON mv_org_leave_summaries(organization_id, leave_type_id, year);

COMMENT ON MATERIALIZED VIEW mv_org_leave_summaries IS
'Aggregated leave balance statistics per organization, leave type, and year. Refreshed daily.';

-- ============================================================================
-- Refresh Functions
-- ============================================================================
-- These functions refresh the materialized views concurrently (without locking)

CREATE OR REPLACE FUNCTION refresh_seat_usage()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_organization_seat_usage;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION refresh_seat_usage() IS
'Refreshes the seat usage materialized view. Can be called manually or via cron job.';

CREATE OR REPLACE FUNCTION refresh_leave_summaries()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_org_leave_summaries;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION refresh_leave_summaries() IS
'Refreshes the leave summaries materialized view. Can be called manually or via cron job.';

-- ============================================================================
-- Initial Data Load
-- ============================================================================
-- Populate the views with current data

SELECT refresh_seat_usage();
SELECT refresh_leave_summaries();

COMMIT;

-- ============================================================================
-- Verification Queries (run after migration)
-- ============================================================================
-- Run these to verify the views were created successfully:

-- Check seat usage view
-- SELECT * FROM mv_organization_seat_usage LIMIT 5;

-- Check leave summaries view
-- SELECT * FROM mv_org_leave_summaries LIMIT 5;

-- Verify index usage
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM mv_organization_seat_usage WHERE organization_id = '<some-uuid>';

-- ============================================================================
-- Refresh Schedule Options
-- ============================================================================
-- Option A: Manual refresh via API endpoint (recommended initially)
-- Call refresh_seat_usage() and refresh_leave_summaries() from application

-- Option B: Nightly cron job (requires pg_cron extension)
-- SELECT cron.schedule(
--   'refresh-seat-usage-nightly',
--   '0 2 * * *', -- 2 AM daily
--   $$SELECT refresh_seat_usage()$$
-- );
--
-- SELECT cron.schedule(
--   'refresh-leave-summaries-nightly',
--   '0 3 * * *', -- 3 AM daily
--   $$SELECT refresh_leave_summaries()$$
-- );

-- Option C: Trigger-based refresh (real-time, but has overhead)
-- Only use if real-time accuracy is critical
-- CREATE OR REPLACE FUNCTION trigger_refresh_seat_usage()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   PERFORM refresh_seat_usage();
--   RETURN NULL;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER refresh_on_user_org_change
-- AFTER INSERT OR UPDATE OR DELETE ON user_organizations
-- FOR EACH STATEMENT
-- EXECUTE FUNCTION trigger_refresh_seat_usage();

-- ============================================================================
-- Rollback Instructions
-- ============================================================================
-- If you need to remove these views:
--
-- DROP MATERIALIZED VIEW IF EXISTS mv_organization_seat_usage CASCADE;
-- DROP MATERIALIZED VIEW IF EXISTS mv_org_leave_summaries CASCADE;
-- DROP FUNCTION IF EXISTS refresh_seat_usage();
-- DROP FUNCTION IF EXISTS refresh_leave_summaries();
