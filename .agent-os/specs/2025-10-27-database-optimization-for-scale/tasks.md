# Spec Tasks

## Phase 1: Composite Index Additions (PRIORITY: HIGH, RISK: ZERO)

- [ ] 1. Create Migration File `S`
  - [ ] 1.1 Write migration file 20251027000000_add_composite_indexes_for_scale.sql
  - [ ] 1.2 Add all 6 index CREATE statements with CONCURRENTLY
  - [ ] 1.3 Add comments explaining each index purpose
  - [ ] 1.4 Add verification queries at end of migration

- [ ] 2. Test Migration Locally `XS`
  - [ ] 2.1 Run `supabase db reset` to apply migration
  - [ ] 2.2 Verify all 6 indexes created successfully
  - [ ] 2.3 Check index sizes are reasonable (<100MB each)
  - [ ] 2.4 Run existing test suite - all must pass

- [ ] 3. Performance Benchmarking `S`
  - [ ] 3.1 Measure dashboard load time before/after
  - [ ] 3.2 Measure calendar API response time before/after
  - [ ] 3.3 Measure seat counting query time before/after
  - [ ] 3.4 Document 50%+ improvement in spec

- [ ] 4. Deploy to Staging `XS`
  - [ ] 4.1 Push migration to staging environment
  - [ ] 4.2 Verify deployment successful
  - [ ] 4.3 Run smoke tests on staging
  - [ ] 4.4 Monitor for 24 hours

- [ ] 5. Deploy to Production `XS`
  - [ ] 5.1 Deploy during low-traffic window
  - [ ] 5.2 Monitor query performance for 48 hours
  - [ ] 5.3 Verify no user complaints
  - [ ] 5.4 Document success metrics

---

## Phase 2: Fix team-utils.ts Anti-Pattern (PRIORITY: MEDIUM, RISK: LOW)

- [ ] 6. Refactor team-utils.ts `S`
  - [ ] 6.1 Update `applyTeamFilter()` function to fetch member IDs first
  - [ ] 6.2 Add edge case handling for empty teams
  - [ ] 6.3 Add JSDoc comments explaining changes
  - [ ] 6.4 Update function signature to async

- [ ] 7. Write Unit Tests `M`
  - [ ] 7.1 Create __tests__/lib/team-utils.test.ts
  - [ ] 7.2 Test organization scope filtering
  - [ ] 7.3 Test team scope filtering
  - [ ] 7.4 Test empty team edge case
  - [ ] 7.5 All tests must pass

- [ ] 8. Manual QA Testing `S`
  - [ ] 8.1 Login as manager with team assigned
  - [ ] 8.2 Verify /leave-requests shows only team members
  - [ ] 8.3 Verify /team shows only team members
  - [ ] 8.4 Login as admin - verify sees all data
  - [ ] 8.5 Verify behavior identical to before changes

- [ ] 9. Deploy to Staging `XS`
  - [ ] 9.1 Create feature branch
  - [ ] 9.2 Create PR with detailed description
  - [ ] 9.3 Deploy to staging for QA review
  - [ ] 9.4 Get approval from team

- [ ] 10. Deploy to Production `XS`
  - [ ] 10.1 Merge PR to main
  - [ ] 10.2 Deploy via Vercel
  - [ ] 10.3 Monitor error rates for 1 hour
  - [ ] 10.4 Verify no issues reported

---

## Phase 3: RLS Policy Optimization (PRIORITY: LOW, RISK: MEDIUM, OPTIONAL)

**Only proceed if performance testing shows RLS bottleneck**

- [ ] 11. Decide Whether to Proceed `XS`
  - [ ] 11.1 Review Phase 1 performance improvements
  - [ ] 11.2 Measure RLS policy evaluation time
  - [ ] 11.3 If <5% of queries affected, SKIP this phase
  - [ ] 11.4 If bottleneck found, proceed to 12

- [ ] 12. Create RLS Migration `M`
  - [ ] 12.1 Write migration 20251027000001_optimize_rls_policies_exists_pattern.sql
  - [ ] 12.2 Update "Users can view organization leave requests" policy
  - [ ] 12.3 Update "Users can view organization leave balances" policy
  - [ ] 12.4 Add rollback migration file

- [ ] 13. Comprehensive RLS Testing `L`
  - [ ] 13.1 Run __tests__/security/rls-policy.test.ts
  - [ ] 13.2 Create integration tests with two test organizations
  - [ ] 13.3 Verify cross-org isolation
  - [ ] 13.4 Verify role-based access (admin/manager/employee)
  - [ ] 13.5 All tests must pass 100%

- [ ] 14. Staging Deployment with Soak Test `M`
  - [ ] 14.1 Deploy to staging
  - [ ] 14.2 Run full integration test suite
  - [ ] 14.3 Manual QA by multiple team members
  - [ ] 14.4 Soak test for 48 hours
  - [ ] 14.5 Monitor for any data visibility issues

- [ ] 15. Production Deployment `S`
  - [ ] 15.1 Schedule deployment during maintenance window
  - [ ] 15.2 Have rollback migration ready
  - [ ] 15.3 Deploy and monitor closely for 24 hours
  - [ ] 15.4 Be ready to rollback immediately if issues

---

## Phase 4: Materialized Views (PRIORITY: LOW, RISK: LOW, OPTIONAL)

**Nice-to-have for dashboard performance**

- [ ] 16. Create Materialized Views Migration `M`
  - [ ] 16.1 Write migration 20251027000002_add_materialized_views.sql
  - [ ] 16.2 Create mv_organization_seat_usage view
  - [ ] 16.3 Create mv_org_leave_summaries view
  - [ ] 16.4 Create refresh functions
  - [ ] 16.5 Add indexes to views

- [ ] 17. Set Up Refresh Strategy `S`
  - [ ] 17.1 Choose refresh strategy (nightly cron recommended)
  - [ ] 17.2 Configure Supabase cron job or pg_cron
  - [ ] 17.3 Test manual refresh via admin endpoint
  - [ ] 17.4 Verify refresh completes in reasonable time

- [ ] 18. Validate View Accuracy `S`
  - [ ] 18.1 Compare view data to live table queries
  - [ ] 18.2 Ensure 100% data accuracy
  - [ ] 18.3 Test refresh updates data correctly
  - [ ] 18.4 Document any refresh lag time

- [ ] 19. Optional: Update Application Code `M` (OPTIONAL)
  - [ ] 19.1 Identify queries that could use views
  - [ ] 19.2 Update queries to use views instead of live tables
  - [ ] 19.3 Measure performance improvement
  - [ ] 19.4 Deploy with careful testing

---

## Post-Deployment Tasks (All Phases)

- [ ] 20. Documentation Updates `S`
  - [ ] 20.1 Update README with performance improvements
  - [ ] 20.2 Document new indexes in database schema docs
  - [ ] 20.3 Update developer onboarding docs
  - [ ] 20.4 Create runbook for rollback procedures

- [ ] 21. Performance Monitoring Dashboard `M`
  - [ ] 21.1 Set up Supabase query performance monitoring
  - [ ] 21.2 Create dashboard tracking key metrics
  - [ ] 21.3 Set up alerts for slow queries
  - [ ] 21.4 Weekly review of performance metrics

- [ ] 22. Team Knowledge Transfer `S`
  - [ ] 22.1 Present optimization results to team
  - [ ] 22.2 Document lessons learned
  - [ ] 22.3 Create guide for future optimizations
  - [ ] 22.4 Update team best practices

---

## Rollback Tasks (If Needed)

- [ ] 23. Phase 1 Rollback `XS`
  - [ ] 23.1 Run DROP INDEX CONCURRENTLY for each index
  - [ ] 23.2 Verify indexes removed
  - [ ] 23.3 Monitor query performance

- [ ] 24. Phase 2 Rollback `XS`
  - [ ] 24.1 Git revert commit with team-utils changes
  - [ ] 24.2 Redeploy previous version
  - [ ] 24.3 Verify functionality restored

- [ ] 25. Phase 3 Rollback `XS`
  - [ ] 25.1 Apply rollback migration with old RLS policies
  - [ ] 25.2 Verify policies restored
  - [ ] 25.3 Run RLS test suite

- [ ] 26. Phase 4 Rollback `XS`
  - [ ] 26.1 Drop materialized views
  - [ ] 26.2 Remove refresh functions
  - [ ] 26.3 Remove cron jobs
