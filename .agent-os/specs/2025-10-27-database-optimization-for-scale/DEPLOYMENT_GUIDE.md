# Phase 1 Deployment Guide: Composite Indexes

## Migration Created ✅

**File:** `supabase/migrations/20251027000000_add_composite_indexes_for_scale.sql`

**Contents:**
- 6 composite indexes for performance optimization
- All use `CREATE INDEX CONCURRENTLY` (no table locks)
- Comments explaining each index purpose
- Verification queries to confirm success

---

## Testing Options

### Option 1: Test Locally (Recommended)

**Prerequisites:**
- Docker Desktop running
- Supabase CLI installed

**Steps:**
```bash
# 1. Start Docker Desktop

# 2. Reset database to apply all migrations
npx supabase db reset

# 3. Verify indexes created
npx supabase db diff

# 4. Check verification output at end of migration
# Should see: "✅ Phase 1: All 6 composite indexes created successfully!"
```

### Option 2: Test on Supabase Staging (If you have staging project)

**Steps:**
```bash
# 1. Push migration to staging
npx supabase db push --project-ref <your-staging-ref>

# 2. Connect to staging database
npx supabase db connect --project-ref <your-staging-ref>

# 3. Run verification queries (from migration file)
```

### Option 3: Deploy Directly to Production (WITH CAUTION)

**Only if:**
- You're confident in the migration
- No staging environment available
- Can rollback quickly if needed

---

## Verification Steps

### 1. Check Indexes Were Created

```sql
-- Run this query in Supabase SQL Editor
SELECT
  indexname,
  tablename,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE indexrelname IN (
  'idx_leave_requests_org_status_created',
  'idx_leave_balances_org_year_user',
  'idx_user_orgs_org_active_covering',
  'idx_user_orgs_team_active',
  'idx_leave_requests_date_range',
  'idx_leave_requests_pending_org'
)
ORDER BY indexrelname;

-- Should return 6 rows
```

### 2. Verify Index Usage

```sql
-- Test calendar query uses index
EXPLAIN ANALYZE
SELECT * FROM leave_requests
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
  AND status = 'approved'
ORDER BY created_at DESC
LIMIT 50;

-- Look for: "Index Scan using idx_leave_requests_org_status_created"
```

### 3. Run Test Suite

```bash
# All existing tests should pass (indexes can't break functionality)
npm test

# Expected: All tests pass ✅
```

---

## Deployment to Production

### Pre-Deployment Checklist

- [ ] Migration file reviewed
- [ ] Tested locally OR on staging
- [ ] Verified 6 indexes will be created
- [ ] Team notified of deployment
- [ ] Rollback procedure ready

### Deploy via Supabase Dashboard

**Option A: Automatic (via Git)**
1. Commit migration file
2. Push to main branch
3. Supabase auto-applies migration

**Option B: Manual (via SQL Editor)**
1. Copy contents of migration file
2. Paste into Supabase SQL Editor
3. Execute
4. Verify success message

### Deploy via CLI

```bash
# Push migration to production
npx supabase db push --project-ref <your-production-ref>

# Verify migration applied
npx supabase db remote list --project-ref <your-production-ref>

# Should show: 20251027000000_add_composite_indexes_for_scale.sql
```

---

## Post-Deployment Monitoring

### Immediate (First Hour)

- [ ] Check Supabase dashboard for errors
- [ ] Verify application still working
- [ ] Monitor query performance metrics
- [ ] Check no user complaints

### First 24 Hours

- [ ] Review slow query logs
- [ ] Measure performance improvements
- [ ] Verify index usage in query plans
- [ ] Document actual vs. expected improvements

### Performance Measurements

**Before/After Benchmarks:**

1. **Dashboard Load Time**
   - Test: Load dashboard for org with 1000+ members
   - Expected: 70% faster (500ms → 150ms)

2. **Calendar API Response**
   - Test: GET /api/calendar/leave-requests
   - Expected: 75% faster (800ms → 200ms)

3. **Seat Counting**
   - Test: Check active members count
   - Expected: 83% faster (300ms → 50ms)

---

## Rollback Procedure (If Needed)

### Quick Rollback

```sql
-- Run in Supabase SQL Editor (takes ~3 minutes)

DROP INDEX CONCURRENTLY IF EXISTS idx_leave_requests_pending_org;
DROP INDEX CONCURRENTLY IF EXISTS idx_leave_requests_date_range;
DROP INDEX CONCURRENTLY IF EXISTS idx_user_orgs_team_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_user_orgs_org_active_covering;
DROP INDEX CONCURRENTLY IF EXISTS idx_leave_balances_org_year_user;
DROP INDEX CONCURRENTLY IF EXISTS idx_leave_requests_org_status_created;

SELECT 'Indexes rolled back' as status;
```

### Verification After Rollback

```sql
-- Verify indexes removed
SELECT indexname FROM pg_indexes
WHERE indexname IN (
  'idx_leave_requests_org_status_created',
  'idx_leave_balances_org_year_user',
  'idx_user_orgs_org_active_covering',
  'idx_user_orgs_team_active',
  'idx_leave_requests_date_range',
  'idx_leave_requests_pending_org'
);

-- Should return 0 rows
```

---

## Troubleshooting

### Issue: "Already exists" Error

**Cause:** Index creation attempted twice

**Solution:**
```sql
-- Check if indexes already exist
SELECT indexname FROM pg_indexes
WHERE indexname LIKE 'idx_%'
  AND schemaname = 'public';

-- If they exist, migration was successful (ignore error)
```

### Issue: Index Creation Taking Too Long

**Cause:** Large table, slow index build

**Expected Behavior:**
- Small tables (<10K rows): < 1 minute
- Medium tables (10K-100K rows): 1-5 minutes
- Large tables (>100K rows): 5-15 minutes

**Action:** Wait for completion, CONCURRENTLY means no downtime

### Issue: "Out of Disk Space"

**Cause:** Not enough storage for indexes

**Solution:**
1. Check current database size
2. Estimate index size (~10-20% of table size)
3. Upgrade Supabase plan if needed
4. Rollback indexes if urgent

---

## Success Criteria

After deployment, verify:

- [ ] All 6 indexes created successfully
- [ ] Application functioning normally
- [ ] No error rate increase
- [ ] Performance improvements measured
- [ ] No user complaints
- [ ] Index sizes reasonable (<100MB each typically)
- [ ] Query plans using new indexes

---

## Next Steps After Phase 1

Once Phase 1 is successful and stable (48 hours of monitoring):

**Phase 2: Fix team-utils.ts SQL Anti-Pattern**
- Spec: `.agent-os/specs/2025-10-27-database-optimization-for-scale/sub-specs/phase-2-team-utils-fix.md`
- Risk: LOW
- Effort: 1-2 hours
- Impact: Eliminates SQL injection risk

**Phase 3 & 4: Optional Optimizations**
- Only proceed if needed based on Phase 1 results
- Review performance metrics first

---

## Questions?

- Review full spec: `.agent-os/specs/2025-10-27-database-optimization-for-scale/spec.md`
- Check rollback procedures: `.agent-os/specs/2025-10-27-database-optimization-for-scale/rollback-procedures.md`
- Testing strategy: `.agent-os/specs/2025-10-27-database-optimization-for-scale/testing-strategy.md`
