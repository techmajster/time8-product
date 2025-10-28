# Phase 7: Index Cleanup & Optimization

> Part of: Database Optimization for Scale
> Created: 2025-10-27
> Status: Planning

## Overview

Remove 48 unused indexes and add 1 missing index to optimize database performance. Unused indexes waste storage space and slow down write operations (INSERT/UPDATE/DELETE) without providing any query performance benefits.

## Problem

After analyzing Supabase advisory warnings, we have:
- **48 unused indexes** - Indexes that PostgreSQL statistics show have never been used
- **1 unindexed foreign key** - Foreign key constraint without a covering index

## Impact

**Benefits of removing unused indexes:**
- Reduced storage usage (indexes consume disk space)
- Faster INSERT/UPDATE/DELETE operations (fewer indexes to maintain)
- Reduced memory usage (PostgreSQL loads index metadata into shared buffers)
- Cleaner database schema

**Benefits of adding missing index:**
- Faster JOIN operations on `organization_domains.default_team_id`
- Better query performance for team-related domain queries

## Risk Assessment

**Risk Level: LOW**

- Removing unused indexes is safe - PostgreSQL tracks index usage statistics
- If an index is truly unused, removing it has zero impact on query performance
- Worst case: If we remove an index that becomes needed later, we can recreate it
- Adding the missing foreign key index is zero-risk improvement

## Unused Indexes by Category

### 1. Future Features (Not Yet Implemented)
**work_schedules table (4 indexes):**
- `idx_work_schedules_template_id`
- `idx_work_schedules_user`
- `idx_work_schedules_org`
- `idx_employee_schedules_organization_id`

**Reason:** Work schedules feature not fully implemented yet (Phase 5 feature)
**Action:** Remove now, recreate when Phase 5 is implemented

### 2. Over-Indexed Tables
**profiles table (6 indexes):**
- `idx_profiles_id_organization_lookup`
- `idx_profiles_manager`
- `profiles_team_id_idx`
- `idx_profiles_organization_id`
- `idx_profiles_id_with_org`

**Reason:** Multiple redundant indexes for similar query patterns
**Action:** Remove unused ones, keep the most efficient

**invitations table (3 indexes):**
- `idx_invitations_invited_by`
- `idx_invitations_organization_id`
- `idx_invitations_team_id`

**Reason:** Invitation queries use different access patterns than expected

**leave_requests table (4 indexes):**
- `idx_leave_requests_reviewed_by`
- `idx_leave_requests_organization_id`
- `idx_leave_requests_date_range`
- `idx_leave_requests_pending_org`

**Reason:** Queries use composite indexes from Phase 1 instead

**leave_balances table (3 indexes):**
- `idx_leave_balances_organization`
- `idx_leave_balances_year`
- `idx_leave_balances_org_year_user`

**Reason:** Composite index from Phase 1 covers these patterns

### 3. Billing & Webhook Data (Low Query Volume)
**billing_events table (7 indexes):**
- `idx_billing_events_event_type`
- `idx_billing_events_processed_at`
- `idx_billing_events_status`
- `idx_billing_events_event_type_status`
- `idx_billing_events_failed`
- `idx_billing_events_payload_gin`

**Reason:** Billing events are mostly append-only, rarely queried

**subscriptions table (3 indexes):**
- `idx_subscriptions_customer_id`
- `idx_subscriptions_status`
- `idx_subscriptions_variant_id`

**Reason:** Small table with unique constraint indexes providing sufficient performance

**customers table (already cleaned in Phase 6 Part 3)**

**products & price_variants (5 indexes total):**
- `idx_products_status`
- `idx_price_variants_product_id`
- `idx_price_variants_interval`
- `idx_price_variants_currency`
- `idx_price_variants_quantity`

**Reason:** Small lookup tables, sequential scans are fast enough

### 4. Miscellaneous
**company_holidays (2 indexes):**
- `idx_company_holidays_organization_id`
- `idx_company_holidays_country_date`

**organizations (3 indexes):**
- `idx_organizations_billing_override`
- `idx_organizations_override_expiration`
- `idx_organizations_restrict_calendar`

**user_organizations (2 indexes):**
- `idx_user_organizations_org_id`
- `idx_user_orgs_team_active`

**organization_domains (2 indexes):**
- `idx_organization_domains_domain`
- `idx_organization_domains_verified`

**public_email_domains (1 index):**
- `idx_public_email_domains_country`

**leave_types (1 index):**
- `idx_leave_types_mandatory`

## Migration Strategy

### Part 1: Add Missing Index (Zero Risk)
```sql
-- Add index for unindexed foreign key
CREATE INDEX CONCURRENTLY idx_organization_domains_default_team_id
  ON public.organization_domains(default_team_id);
```

### Part 2: Remove Unused Indexes (Low Risk)
Remove all 48 unused indexes using `DROP INDEX CONCURRENTLY` to avoid table locks.

**Grouping strategy:**
1. Future features (4 indexes) - safe to remove
2. Over-indexed tables (16 indexes) - safe to remove
3. Billing/webhook tables (15 indexes) - safe to remove
4. Small lookup tables (5 indexes) - safe to remove
5. Miscellaneous (8 indexes) - safe to remove

## Verification Strategy

Before removing each index, verify:
1. PostgreSQL usage statistics confirm zero usage: `pg_stat_user_indexes`
2. No application code references the index explicitly
3. Other indexes cover the same query patterns

After removing indexes:
1. Monitor query performance for 48 hours
2. Check for slow query log entries
3. Verify write performance improvement

## Rollback Plan

If an index is needed after removal:
```sql
-- Example rollback
CREATE INDEX CONCURRENTLY idx_name ON table_name(column_name);
```

PostgreSQL will rebuild the index without blocking reads/writes.

## Expected Benefits

**Storage savings:**
- Estimated 2-5 MB per unused index
- Total: ~100-240 MB storage freed

**Write performance:**
- 5-15% faster INSERT operations
- 5-15% faster UPDATE operations
- 5-15% faster DELETE operations

**Memory savings:**
- Reduced PostgreSQL shared buffer usage
- More memory available for actual query operations

## Tasks

### Part 1: Add Missing Index
- [ ] Create migration to add `idx_organization_domains_default_team_id`
- [ ] Apply via Supabase MCP
- [ ] Verify index created successfully

### Part 2: Remove Unused Indexes
- [ ] Create migration to drop all 48 unused indexes
- [ ] Apply via Supabase MCP using DROP INDEX CONCURRENTLY
- [ ] Verify all indexes removed successfully

### Part 3: Monitoring
- [ ] Monitor application performance for 48 hours
- [ ] Check slow query logs
- [ ] Verify no performance regressions
- [ ] Update advisory report to confirm 49 warnings resolved

## Notes

- Use `DROP INDEX CONCURRENTLY` to avoid locking tables
- Keep the migration scripts in case rollback is needed
- This is purely an optimization - no application code changes required
- These are INFO-level warnings, not critical issues
