# Testing Strategy

## Overview

Comprehensive testing strategy to ensure database optimizations don't break production.

---

## Phase 1: Index Testing (ZERO RISK)

### Automated Tests

```bash
# Run full test suite
npm test

# Run performance tests specifically
npm test __tests__/performance/
```

**Expected:** All tests pass (indexes cannot break functionality)

### Manual Verification

```sql
-- Verify indexes created
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Check index usage
EXPLAIN ANALYZE
SELECT * FROM leave_requests
WHERE organization_id = 'test-org'
  AND status = 'approved'
ORDER BY created_at DESC;
-- Should show "Index Scan using idx_leave_requests_org_status_created"
```

### Performance Benchmarks

**Before/After Measurements:**
1. Dashboard load time (target: 70% reduction)
2. Calendar API response time (target: 75% reduction)
3. Seat counting query (target: 83% reduction)
4. Team member lookup (target: 60% reduction)

---

## Phase 2: team-utils.ts Testing (LOW RISK)

### Unit Tests

Create `__tests__/lib/team-utils.test.ts`:

```typescript
describe('applyTeamFilter', () => {
  it('filters by organization scope')
  it('filters by team scope with member IDs')
  it('handles empty teams')
  it('maintains backward compatibility')
})
```

### Integration Tests

```bash
# Run existing RLS tests (should all pass)
npm test __tests__/security/rls-policy.test.ts
```

### Manual QA Checklist

- [ ] Login as manager with team
- [ ] Navigate to /leave-requests
- [ ] Verify only team members shown
- [ ] Count matches expected team size
- [ ] Navigate to /team
- [ ] Verify only team members shown
- [ ] Login as admin
- [ ] Verify all organization data visible
- [ ] Check browser console - no errors

---

## Phase 3: RLS Testing (MEDIUM RISK - ONLY IF PROCEEDING)

### Automated Tests

```bash
# Critical: RLS enforcement tests
npm test __tests__/security/rls-policy.test.ts

# Performance regression tests
npm test __tests__/performance/rls-policy-performance.test.ts
```

### Custom Integration Tests

Create two test organizations with users:

```typescript
// Test scenario 1: Cross-org isolation
- Create Org A with User 1
- Create Org B with User 2
- Create leave request in Org A
- Verify User 2 (Org B) cannot see Org A's request

// Test scenario 2: Role-based access
- Create Org with Admin, Manager, Employee
- Verify each role sees correct data

// Test scenario 3: Multi-org user
- Create User with membership in both Org A and Org B
- Verify sees data from both orgs
```

### Staging Soak Test

- Deploy to staging for 48 hours
- Monitor query logs for errors
- Verify no data visibility issues reported

---

## Phase 4: Materialized View Testing (LOW RISK)

### Data Accuracy Verification

```sql
-- Compare view to live table
SELECT
  v.organization_id,
  v.active_seats as view_count,
  t.live_count
FROM mv_organization_seat_usage v
JOIN (
  SELECT organization_id, COUNT(*) as live_count
  FROM user_organizations
  WHERE is_active = true
  GROUP BY organization_id
) t ON v.organization_id = t.organization_id
WHERE v.active_seats != t.live_count;
-- Should return 0 rows (perfect match)
```

### Refresh Testing

```sql
-- Test manual refresh
SELECT refresh_seat_usage();

-- Verify data updated
SELECT organization_id, active_seats, last_change_at
FROM mv_organization_seat_usage
ORDER BY last_change_at DESC
LIMIT 10;
```

---

## Pre-Deployment Checklist

**Before ANY phase:**
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Rollback procedure documented
- [ ] Monitoring dashboard ready
- [ ] Team notified

**Phase 1 specific:**
- [ ] Verify no table locks during index creation
- [ ] Database has sufficient disk space for indexes
- [ ] Backup taken

**Phase 2 specific:**
- [ ] Feature branch tested locally
- [ ] PR reviewed and approved
- [ ] Manual QA completed

**Phase 3 specific (if proceeding):**
- [ ] Performance bottleneck confirmed
- [ ] Comprehensive RLS test suite passing
- [ ] Cross-org isolation verified
- [ ] Rollback migration ready

**Phase 4 specific (if proceeding):**
- [ ] View data accuracy 100%
- [ ] Refresh strategy configured
- [ ] Monitoring for view staleness

---

## Post-Deployment Monitoring

### First Hour
- Monitor error rates (should be unchanged)
- Check query performance metrics
- Watch for user reports

### First 24 Hours
- Review slow query logs
- Verify performance improvements
- Check database CPU/memory usage

### First Week
- Weekly performance review
- Gather user feedback
- Document success metrics

---

## Rollback Triggers

**Initiate rollback if:**
- Error rate increases >10%
- Any data visibility issues reported
- Performance degrades instead of improves
- Database becomes unresponsive
- User complaints about broken functionality

**DO NOT rollback for:**
- Minor cosmetic issues
- Single user edge case
- Non-critical errors
- Expected behavior changes documented in spec

---

## Success Metrics

### Phase 1
- [ ] 50%+ performance improvement measured
- [ ] No test failures
- [ ] No user complaints
- [ ] Database metrics healthy

### Phase 2
- [ ] SQL injection eliminated
- [ ] All tests pass
- [ ] Team filtering still works
- [ ] No error rate increase

### Phase 3 (if done)
- [ ] RLS test suite 100% passing
- [ ] Cross-org isolation verified
- [ ] Performance improvement measured
- [ ] No data leakage

### Phase 4 (if done)
- [ ] View data 100% accurate
- [ ] Refresh working
- [ ] Performance improvement measured
- [ ] No staleness issues
