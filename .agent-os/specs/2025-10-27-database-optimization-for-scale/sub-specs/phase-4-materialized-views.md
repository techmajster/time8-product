# Phase 4: Materialized Views for Aggregations (OPTIONAL)

## Overview

Create materialized views for expensive aggregation queries (seat counting, dashboard summaries) to eliminate repeated calculations.

## Risk Level

**LOW RISK** - Views are additive; existing queries continue to work unchanged.

## Use Cases

### View 1: Organization Seat Usage

**Purpose:** Eliminate repeated COUNT queries for billing and invitation logic

**Current Query Pattern:**
```sql
-- Executed on every invitation, billing check, admin settings page load
SELECT COUNT(*) FROM user_organizations
WHERE organization_id = $1 AND is_active = true;
```

**Materialized View:**
```sql
CREATE MATERIALIZED VIEW mv_organization_seat_usage AS
SELECT
  organization_id,
  COUNT(*) FILTER (WHERE is_active = true) as active_seats,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_seats,
  array_agg(user_id) FILTER (WHERE is_active = true) as active_user_ids,
  MAX(updated_at) as last_change_at
FROM user_organizations
GROUP BY organization_id;

CREATE UNIQUE INDEX ON mv_organization_seat_usage(organization_id);
```

**Refresh Strategy:**
- Refresh nightly via cron (most seat changes happen during business hours)
- Trigger immediate refresh on user_organizations changes (via function)

**Expected Impact:** 90% faster (50ms → 5ms)

---

### View 2: Leave Balance Summaries

**Purpose:** Dashboard aggregations for HR reporting

**Current Query Pattern:**
```sql
SELECT
  organization_id,
  leave_type_id,
  SUM(entitled_days),
  SUM(used_days),
  SUM(remaining_days)
FROM leave_balances
WHERE year = 2025
GROUP BY organization_id, leave_type_id;
```

**Materialized View:**
```sql
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

CREATE UNIQUE INDEX ON mv_org_leave_summaries(organization_id, leave_type_id, year);
```

**Refresh Strategy:**
- Refresh daily (leave balances change infrequently)
- Manual refresh via admin endpoint if needed

**Expected Impact:** 85% faster (200ms → 30ms)

---

## Migration File

**Filename:** `supabase/migrations/20251027000002_add_materialized_views.sql`

```sql
BEGIN;

-- View 1: Seat usage
CREATE MATERIALIZED VIEW mv_organization_seat_usage AS
SELECT
  organization_id,
  COUNT(*) FILTER (WHERE is_active = true) as active_seats,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_seats,
  array_agg(user_id) FILTER (WHERE is_active = true) as active_user_ids,
  MAX(updated_at) as last_change_at
FROM user_organizations
GROUP BY organization_id;

CREATE UNIQUE INDEX ON mv_organization_seat_usage(organization_id);

-- View 2: Leave summaries
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

CREATE UNIQUE INDEX ON mv_org_leave_summaries(organization_id, leave_type_id, year);

-- Refresh functions
CREATE OR REPLACE FUNCTION refresh_seat_usage()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_organization_seat_usage;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_leave_summaries()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_org_leave_summaries;
END;
$$ LANGUAGE plpgsql;

COMMIT;
```

---

## Refresh Strategy

### Option A: Nightly Cron (Recommended)

```sql
-- Add to Supabase cron jobs or use pg_cron extension
SELECT cron.schedule(
  'refresh-seat-usage-nightly',
  '0 2 * * *', -- 2 AM daily
  $$SELECT refresh_seat_usage()$$
);
```

### Option B: Trigger-Based (Real-time)

```sql
CREATE OR REPLACE FUNCTION trigger_refresh_seat_usage()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM refresh_seat_usage();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_on_user_org_change
AFTER INSERT OR UPDATE OR DELETE ON user_organizations
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_seat_usage();
```

**Note:** Trigger-based refresh has overhead; only use if real-time accuracy required.

---

## Application Integration (OPTIONAL)

Views can be queried like regular tables:

```typescript
// Optional: Query materialized view instead of counting
const { data: seatUsage } = await supabaseAdmin
  .from('mv_organization_seat_usage')
  .select('active_seats, inactive_seats')
  .eq('organization_id', organizationId)
  .single();
```

**No application changes required** - existing queries continue to work.

---

## Success Criteria

- [ ] Views created successfully
- [ ] Refresh functions work
- [ ] View data matches live table data
- [ ] Performance improvement measured
- [ ] Refresh scheduled (cron or trigger)
