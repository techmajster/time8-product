# Spec Tasks

## Tasks

- [ ] 1. Audit all organization-scoped API routes
  - [ ] 1.1 Create audit spreadsheet/document to track route review status
  - [ ] 1.2 Review all 76 API routes and categorize by organization-scope requirements
  - [ ] 1.3 Document current implementation status (using auth context vs not)
  - [ ] 1.4 Create prioritized fix list with Critical/Medium/Low categories
  - [ ] 1.5 Document findings in audit summary document

- [ ] 2. Fix Priority 1 routes (Employee, Team, Leave Request routes)
  - [ ] 2.1 Write integration tests for multi-workspace isolation on employee routes
  - [ ] 2.2 Audit and fix `/api/employees/[id]/route.ts` for proper organization isolation
  - [ ] 2.3 Audit and fix `/api/employees/[id]/leave-balances/route.ts` for proper organization isolation
  - [ ] 2.4 Audit and fix `/api/teams/[id]/route.ts` for proper organization isolation
  - [ ] 2.5 Audit and fix `/api/teams/[id]/members/route.ts` for proper organization isolation
  - [ ] 2.6 Audit and fix `/api/leave-requests/[id]/route.ts` for proper organization isolation
  - [ ] 2.7 Audit and fix `/api/leave-requests/[id]/approve/route.ts` for proper organization isolation
  - [ ] 2.8 Audit and fix `/api/leave-requests/[id]/cancel/route.ts` for proper organization isolation
  - [ ] 2.9 Audit and fix `/api/leave-requests/[id]/details/route.ts` for proper organization isolation
  - [ ] 2.10 Verify all Priority 1 route tests pass

- [ ] 3. Fix Priority 2 routes (Calendar & Dashboard routes)
  - [ ] 3.1 Write integration tests for multi-workspace isolation on calendar routes
  - [ ] 3.2 Audit and fix `/api/calendar/leave-requests/route.ts` to use standard auth pattern
  - [ ] 3.3 Audit and fix `/api/calendar/holidays/route.ts` to use standard auth pattern
  - [ ] 3.4 Audit and fix `/api/dashboard-data/route.ts` for proper organization filtering
  - [ ] 3.5 Verify all Priority 2 route tests pass

- [ ] 4. Fix Priority 3 routes (Admin & Settings routes)
  - [ ] 4.1 Write integration tests for multi-workspace isolation on admin settings routes
  - [ ] 4.2 Audit and fix `/api/admin/settings/calendar-restriction/route.ts`
  - [ ] 4.3 Audit and fix `/api/admin/settings/google-workspace/route.ts`
  - [ ] 4.4 Audit and fix `/api/admin/settings/organization/route.ts`
  - [ ] 4.5 Audit and fix `/api/admin/leave-balances/route.ts`
  - [ ] 4.6 Audit and fix other admin utility routes (`/api/admin/fix-*`, `/api/admin/create-*`)
  - [ ] 4.7 Verify all Priority 3 route tests pass

- [ ] 5. Fix Priority 4 routes (Billing routes)
  - [ ] 5.1 Write integration tests for multi-workspace isolation on billing routes
  - [ ] 5.2 Audit and fix `/api/billing/subscription/route.ts`
  - [ ] 5.3 Audit and fix `/api/billing/customer-portal/route.ts`
  - [ ] 5.4 Audit and fix `/api/billing/create-checkout/route.ts`
  - [ ] 5.5 Audit and fix other billing utility routes
  - [ ] 5.6 Verify all Priority 4 route tests pass

- [ ] 6. Fix Priority 5 routes (Invitation & User Management routes)
  - [ ] 6.1 Write integration tests for multi-workspace isolation on invitation routes
  - [ ] 6.2 Audit and fix `/api/send-invitation/route.ts` (likely already correct)
  - [ ] 6.3 Audit and fix `/api/invitations/accept/route.ts`
  - [ ] 6.4 Audit and fix `/api/organization/members/route.ts`
  - [ ] 6.5 Audit and fix `/api/team/members/route.ts`
  - [ ] 6.6 Verify all Priority 5 route tests pass

- [ ] 7. Create comprehensive integration test suite
  - [ ] 7.1 Create test utility helpers for multi-workspace test setup
  - [ ] 7.2 Add test for employee API isolation with workspace switching
  - [ ] 7.3 Add test for team API isolation with workspace switching
  - [ ] 7.4 Add test for leave request API isolation with workspace switching
  - [ ] 7.5 Add test for calendar API isolation with workspace switching
  - [ ] 7.6 Add test for admin settings API isolation with workspace switching
  - [ ] 7.7 Add test for billing API isolation with workspace switching
  - [ ] 7.8 Add negative test cases (invalid cookies, unauthorized access attempts)
  - [ ] 7.9 Verify all integration tests pass

- [ ] 8. Create developer documentation
  - [ ] 8.1 Create `docs/api-development-standards.md` with multi-workspace architecture overview
  - [ ] 8.2 Document standard API route pattern with code examples
  - [ ] 8.3 Add testing requirements section with test template
  - [ ] 8.4 Create security checklist for API route development
  - [ ] 8.5 Add examples of common pitfalls and how to avoid them
  - [ ] 8.6 Update project README to reference new documentation

- [ ] 9. Final validation and deployment
  - [ ] 9.1 Run full integration test suite and verify 100% pass rate
  - [ ] 9.2 Manual testing: Create multi-workspace admin test account
  - [ ] 9.3 Manual testing: Switch between workspaces and verify data isolation
  - [ ] 9.4 Manual testing: Attempt unauthorized access and verify rejection
  - [ ] 9.5 Code review: Have another developer review all changes
  - [ ] 9.6 Update roadmap to mark "Multi-Workspace Isolation Audit & Fix" as complete
  - [ ] 9.7 Deploy to production with monitoring enabled
  - [ ] 9.8 Monitor production logs for any workspace isolation errors
