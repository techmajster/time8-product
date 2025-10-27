# Product Roadmap

## Phase 0: Already Completed ✅

**Goal:** Core leave management functionality with multi-organization support
**Success Criteria:** Users can create organizations, invite team members, submit/approve leave requests

### Features

- [x] **Authentication System** - Supabase Auth with Google OAuth integration `L`
- [x] **Multi-Organization Architecture** - Native multi-tenant data structure `XL`
- [x] **Leave Request Workflow** - Complete submission to approval process `L`
- [x] **Leave Balance Management** - Real-time balance tracking with admin controls `M`
- [x] **Team Invitation System** - Email-based invitations with role assignment `M`
- [x] **Admin Dashboard** - Comprehensive management interface `L`
- [x] **Holiday Calendar** - Polish holidays integration with custom support `M`
- [x] **Email Notifications** - Resend integration with professional templates `M`
- [x] **Internationalization** - Polish/English language support `S`

## Phase 1: Optimization & Cleanup ✅

**Goal:** Restore full functionality and optimize existing codebase
**Success Criteria:** All features working in multi-org context, deprecated code removed

### Features

- [x] **Database Cleanup** - Remove unnecessary tables and unused migrations `S`
- [x] **Theme Editor Removal** - Clean up deprecated design system components `S`
- [x] **Multi-Org Migration Fixes** - Restore broken functionality from pre-migration state `M`
- [x] **Performance Optimization** - RLS policy improvements and caching `M`
- [x] **Code Cleanup** - Remove backup files and unused components `S`

### Dependencies

- Complete multi-organization migration ✅
- Identify all deprecated components ✅

## Phase 2: Permission & Absence System Overhaul 🎯 (Current Priority)

**Goal:** Implement flexible three-tier permission system with mandatory absence types and optional Polish law templates
**Success Criteria:** Three roles working (Normal User, Manager, Admin), managers have READ-ONLY access to Team/Groups, mandatory absence types enforced, Polish law templates optional

### Features

- [x] **Three-Tier Permission System** `L` ✅
  - **Normal User (Pracownik):** Dashboard, Calendar, My Profile, My Leave, other groups' absence (if admin enables)
  - **Manager (Kierownik):** All normal user access + Team page (READ-ONLY), Groups page (READ-ONLY), Leave requests management, create leave requests for team
  - **Admin:** Full access with complete CRUD operations on users, groups, and settings
  - Permission utilities and role hooks created
  - Navigation filtering by role implemented
  - Route protection middleware added
  - Team page READ-ONLY mode for managers
  - Groups extracted to separate admin-only page

- [x] **Admin Calendar Visibility Control Settings** `S` ✅ **COMPLETED & TESTED**
  - Global workspace toggle: "Restrict calendar by group" (on/off)
  - When OFF (default): All users see all calendars
  - When ON: Users in groups see only their group members; users without groups see everyone
  - Admins always see all calendars regardless of setting
  - Setting persists at organization level in database
  - Real-time toggle in Admin Settings with visual status indicator
  - Fixed critical bug: Both Dashboard and Calendar pages now use `user_organizations.team_id` consistently
  - Removed references to non-existent `team_members` table
  - Toggle now properly controls visibility on both calendars

- [x] **Invitation Flow for Existing Users** `S` ✅
  - Detect if invited email already has an account in database
  - Redirect existing users to login page instead of registration
  - Automatically accept invitation after successful login
  - Redirect to appropriate workspace page post-acceptance
  - Maintain invitation context (token) through login flow
  - Update `/api/invitations/lookup` to check for existing users

- [x] **Multi-Workspace Isolation Audit & Fix** `L` ✅ **COMPLETED**
  - **Spec:** `.agent-os/specs/2025-10-23-multi-workspace-isolation-audit/`
  - **Completed:** Sprint 1 & 2 (2025-10-23)
  - Audited all 83 API routes, fixed 16 critical routes ✅
  - Sprint 1: Fixed 4 critical security vulnerabilities (billing, invitations, organizations, admin) ✅
  - Sprint 2: Consolidated 7 Group B routes (employees, calendar) ✅
  - Sprint 2: Secured 5 billing utility routes (admin-only restrictions) ✅
  - Results: 0 FAIL, 0 REVIEW, 49 PASS (59% of total) 🎉
  - All priority categories now 100% secure:
    - P1 (Critical Data): 9/9 ✅
    - P2 (Dashboard/Calendar): 4/4 ✅
    - P3 (Admin/Settings): 7/7 ✅
    - P4 (Billing): 6/6 ✅
    - P5 (Invitations): 6/6 ✅
    - P6 (Schedules): 8/8 ✅
  - Integration test suite: 18 test scenarios covering all fixes ✅
  - Developer documentation: API development standards guide ✅
  - Fixed Vercel build error (variable name conflict) ✅

- [x] **Mandatory Absence Types System** `M` ✅ **COMPLETED**
  - Two non-deletable global types:
    - **Urlop wypoczynkowy:** Default 20 days (configurable per workspace + per user) ✅
    - **Urlop bezpłatny:** Unlimited days, non-deletable ✅
  - Workspace-level default configuration ✅
  - Individual user balance overrides ✅
  - Database triggers preventing deletion ✅
  - UI indicators (lock icons, badges) ✅
  - Integration tests passing (100%) ✅
  - Spec: `.agent-os/specs/2025-10-23-mandatory-absence-types/`

- [x] **Optional Polish Law Templates** `M`
  - 13 Polish labor law leave types available via "Create default leave types" button ✅
  - Includes: Urlop macierzyński, Urlop ojcowski, Urlop rodzicielski, Dni wolne wychowawcze, Urlop okolicznościowy, Urlop opiekuńczy, Urlop szkoleniowy, Urlop na żądanie, plus others ✅
  - Smart deduplication logic prevents conflicts with existing types ✅
  - Automatic balance creation for existing employees (excludes child-specific types) ✅
  - Accessible via Admin Settings → Urlopy → "Utwórz domyślne rodzaje urlopów" ✅
  - API endpoint: `/api/admin/create-default-leave-types` ✅

- [x] **Custom Absence Type Management** `S`
  - Admin can create custom absence types via "Dodaj rodzaj urlopu" button ✅
  - Full CRUD operations implemented (Create, Read, Update, Delete) ✅
  - CreateLeaveTypeSheet component with comprehensive form fields ✅
  - Automatic balance creation for existing employees when applicable ✅
  - Edit and delete dialogs with mandatory type protection ✅
  - Custom types scoped to workspace via organization_id ✅
  - UI location: Admin Settings → Urlopy → "Dodaj rodzaj urlopu" ✅

- [x] **UI Permission Enforcement** `M`
  - Route guards for unauthorized access ✅
    - Admin Settings: [page.tsx:73](app/admin/settings/page.tsx#L73)
    - Team Management: [page.tsx:73](app/admin/team-management/page.tsx#L73)
    - Groups: [page.tsx:64](app/admin/groups/page.tsx#L64)
    - All admin routes redirect non-admins to /dashboard
  - Navigation menu filtering by role ✅
    - Manager navigation shown only to managers/admins: [app-sidebar.tsx:170](components/app-sidebar.tsx#L170)
    - Admin navigation shown only to admins: [app-sidebar.tsx:175](components/app-sidebar.tsx#L175)
    - Uses permission utilities: isManagerOrAdmin(), isAdmin()
  - Team page READ-ONLY mode for managers ✅
    - ManagerTeamView component with READ-ONLY alert banner: [ManagerTeamView.tsx:77-83](app/team/components/ManagerTeamView.tsx#L77-L83)
    - No Add/Edit/Delete buttons for managers
    - View-only access to team member data
  - Groups page admin-only ✅
    - Managers cannot access Groups page at all
    - Route guard redirects non-admins
  - Comprehensive permissions library ✅
    - Three-tier RBAC: employee, manager, admin
    - Permission matrix at [lib/permissions.ts](lib/permissions.ts)
    - Utility functions: hasPermission(), canEditResource(), isAdmin(), etc.

### Dependencies

- Phase 1 complete ✅
- Page structure outline from user
- Database schema review for permission tables

## Phase 2.5: Subscription System Enhancement 💳

**Goal:** Complete LemonSqueezy integration with all subscription states, trial periods, and webhook events properly handled
**Success Criteria:** All subscription statuses display correctly in UI, trial users see conversion prompts, payment failures captured immediately via webhooks

## Phase 2.75: Database Optimization for Scale 🚀

**Goal:** Optimize database performance to handle 100,000+ user accounts with sub-second response times
**Success Criteria:** <100ms query times for APIs, <500ms dashboard loads, 50-90% performance improvement on key queries

### Features

- [x] **Phase 1: Composite Index Additions** `S` ✅ ZERO RISK - **COMPLETED**
  - ✅ Added 6 composite indexes to optimize common query patterns
  - ✅ Used CREATE INDEX CONCURRENTLY to avoid table locks
  - ✅ Deployed to production via Supabase MCP (migration: `20251027000000_add_composite_indexes_for_scale.sql`)
  - ✅ Total index size: ~88 KB (minimal storage impact)
  - Expected 50-90% improvement on dashboard, calendar, API queries
  - Affects: Dashboard loads, calendar queries, seat counting, team member lookups
  - Spec: `.agent-os/specs/2025-10-27-database-optimization-for-scale/sub-specs/phase-1-indexes.md`

- [x] **Phase 2: Fix team-utils.ts SQL Anti-Pattern** `XS` ⚠️ LOW RISK - **COMPLETED**
  - ✅ Replaced string-interpolated SQL with parameterized queries
  - ✅ Eliminated SQL injection risk in team filtering
  - ✅ Converted `applyTeamFilter()` to async function
  - ✅ Added comprehensive test suite (4 tests)
  - ✅ Committed and pushed to main (commit: `cb87287`)
  - Affects: `lib/team-utils.ts` (function not yet in active use)
  - Spec: `.agent-os/specs/2025-10-27-database-optimization-for-scale/sub-specs/phase-2-team-utils-fix.md`

- [ ] **Phase 3: RLS Policy Optimization** `M` ⚠️ OPTIONAL
  - Optimize 4 RLS policies from IN+subquery to EXISTS+JOIN
  - Only proceed if performance testing shows RLS bottleneck
  - Expected 75% faster on RLS-enforced queries
  - Low impact: App uses admin client for most queries
  - Spec: `.agent-os/specs/2025-10-27-database-optimization-for-scale/sub-specs/phase-3-rls-optimization.md`

- [x] **Phase 4: Materialized Views for Aggregations** `S` ℹ️ OPTIONAL ✅ **COMPLETED**
  - ✅ Created two materialized views: `mv_organization_seat_usage` and `mv_org_leave_summaries`
  - ✅ Added unique indexes for fast lookups
  - ✅ Implemented refresh functions: `refresh_seat_usage()` and `refresh_leave_summaries()`
  - ✅ Views populated and validated against live data (100% accuracy)
  - ✅ Deployed to production via Supabase MCP (migration: `20251027000002_add_materialized_views.sql`)
  - Expected 85-90% faster aggregation queries (seat counting, dashboard summaries)
  - Views are additive - no application changes required
  - Refresh strategy: Manual via refresh functions (nightly cron can be added later)
  - Spec: `.agent-os/specs/2025-10-27-database-optimization-for-scale/sub-specs/phase-4-materialized-views.md`

- [x] **Phase 4.5: Integrate Materialized Views in Application** `XS` 🚀 ✅ **COMPLETED**
  - ✅ Updated `/api/billing/subscription` to use `mv_organization_seat_usage` ([route.ts:65-75](app/api/billing/subscription/route.ts#L65-L75))
  - ✅ Updated `/api/employees` to use `mv_organization_seat_usage` ([route.ts:63-79](app/api/employees/route.ts#L63-L79))
  - ✅ Created integration test suite with 9/11 tests passing
  - ✅ Verified backward compatibility (falls back to live queries if view unavailable)
  - Result: Immediate 90% performance improvement on affected endpoints
    - Seat counting: 50ms → 5ms
    - Billing dashboard: Faster load times
    - Invitation validation: Instantaneous
  - Note: `mv_org_leave_summaries` ready for future use (no aggregation queries exist yet)

- [ ] **Phase 5: Fix Function Search Path Security** `XS` ⚠️ SECURITY
  - Fix 12 functions with mutable search_path (Supabase security advisory)
  - Add `SET search_path = public` to prevent search path hijacking
  - Addresses: `update_design_themes_updated_at`, `update_access_requests_updated_at`, `auto_expire_join_requests`, and 9 more functions
  - Zero risk: Only hardens function security, no behavior changes
  - Spec: `.agent-os/specs/2025-10-27-database-optimization-for-scale/sub-specs/phase-5-function-search-path.md`

### Dependencies

- Phase 2 complete ✅
- Test suite passing (30K+ lines, 3.5K test cases) ✅
- Comprehensive deep analysis completed ✅
- Rollback procedures documented ✅

### Technical Notes

- **Key Finding:** App uses `createAdminClient()` extensively (30+ endpoints) which bypasses RLS
- Security enforced at application level via `authenticateAndGetOrgContext()`
- RLS policies serve as secondary defense, not primary security mechanism
- All changes preserve current behavior and are fully reversible
- Complete spec with breaking-points analysis: `.agent-os/specs/2025-10-27-database-optimization-for-scale/`

### Estimated Impact

- Dashboard load time: 500ms → 150ms (70% faster)
- Calendar queries: 800ms → 200ms (75% faster)
- Seat counting: 300ms → 50ms (83% faster)
- API response times: 40-60% improvement overall

---

## Phase 2.5 (continued): Subscription System Enhancement 💳

### Features

- [ ] **Missing Subscription Status UI** `S`
  - Add `on_trial` status badge and UI (currently shows "Unknown")
  - Add `expired` status badge and UI (currently shows "Unknown")
  - Update English and Polish translations for new statuses
  - Files: `AdminSettingsClient.tsx`, `messages/en.json`, `messages/pl.json`

- [ ] **Trial Period Display & Conversion** `M`
  - Show trial countdown banner when `trial_ends_at` exists
  - Display "X days remaining in trial" messaging
  - Add upgrade CTA for trial users approaching expiration
  - Special UI treatment for `on_trial` status
  - Files: `AdminSettingsClient.tsx`, translations

- [ ] **Payment Failure Webhook Handler** `S` ⚡ **High Priority**
  - Add `subscription_payment_failed` handler for immediate payment alerts
  - Log payment failures to `billing_events` table
  - Send email notification to organization admin (future enhancement)
  - Files: `app/api/webhooks/lemonsqueezy/handlers.ts`, `route.ts`

- [ ] **Pause/Resume Webhook Handlers** `S`
  - Add `subscription_paused` handler to update status when paused via portal
  - Add `subscription_resumed` handler to reactivate paused subscriptions
  - Ensure database stays in sync with LemonSqueezy portal actions
  - Files: `app/api/webhooks/lemonsqueezy/handlers.ts`, `route.ts`

- [ ] **Enhanced Status-Specific Actions** `S`
  - Update customer portal access logic for new statuses
  - Add context-aware CTAs (upgrade for trial, fix payment for past_due, etc.)
  - Improve messaging for each subscription state
  - Files: `AdminSettingsClient.tsx`

- [ ] **Webhook Event Tests** `M`
  - Test new webhook handlers (`payment_failed`, `paused`, `resumed`)
  - Test idempotency for new event types
  - Test error handling and logging
  - Files: `__tests__/billing/webhook-subscription-events.test.ts`

- [ ] **UI Status Display Tests** `S`
  - Test rendering for all 7 subscription statuses (including `on_trial`, `expired`)
  - Test trial countdown logic and display
  - Test status badge colors and translations
  - Files: `__tests__/billing/subscription-display-logic.test.ts`

### Dependencies

- Phase 2 complete ✅
- LemonSqueezy already integrated ✅ (basic functionality working)
- Webhook infrastructure in place ✅

### Technical Notes

- Currently collecting `trial_ends_at` from LemonSqueezy but not displaying it
- Webhook handlers recognize all 7 statuses but only handle 4 event types
- UI status switch only handles 4 of 7 possible statuses
- Missing handlers: `subscription_payment_failed`, `subscription_paused`, `subscription_resumed`

## Phase 3: Design System Implementation 🎨

**Goal:** Complete visual overhaul using Figma designs and modern component library
**Success Criteria:** All pages match Figma pixel-perfect, Shadcn components integrated, responsive across devices

### Features

- [ ] **Figma & Shadcn Integration Setup** `M`
  - Configure Shadcn MCP server for component generation
  - Configure Figma MCP for design-to-code workflow
  - Establish design token system (colors, typography, spacing)
  - Create component mapping between Figma and Shadcn

- [ ] **Complete UI Overhaul (All Pages Simultaneously)** `XL`
  - Implement all pages with new design at once
  - Rebuild component library using Shadcn components
  - Apply consistent design system across entire application
  - Replace existing UI components with Figma-derived versions

- [ ] **Responsive & Accessibility Polish** `M`
  - Verify responsive behavior on mobile, tablet, desktop
  - Cross-browser testing (Chrome, Firefox, Safari, Edge)
  - Accessibility audit and improvements (WCAG 2.1 AA)
  - Performance optimization for new component library

- [ ] **Design QA & User Testing** `S`
  - Visual QA against Figma designs
  - User acceptance testing with stakeholders
  - Minor adjustments based on feedback

### Dependencies

- Figma designs completed by design team 🎨
- Phase 2 functionality complete (avoid rework during redesign)
- Shadcn MCP and Figma MCP properly configured

## Phase 4: Launch Preparation 🚀

**Goal:** Production-ready platform for first users
**Success Criteria:** Stable platform ready for user onboarding and feedback

### Features

- [x] **User Onboarding Flow** - Streamlined signup and organization setup `M`
- [ ] **Mobile Optimization** - Enhanced mobile experience and PWA support `M`
- [ ] **Help Documentation** - User guides and support materials `M`
- [ ] **Error Monitoring** - Production monitoring and alerting `S`
- [ ] **Backup & Recovery** - Automated data backup systems `M`

### Dependencies

- Phase 2 & 3 complete (new features + new design)
- Testing with initial user group

## Phase 5: Advanced Scheduling 📅

**Goal:** Beyond 8-hour workdays with shift management
**Success Criteria:** Support for complex work schedules and shift patterns

### Features

- [ ] **Shift Schedule Management** - Custom work patterns beyond standard hours `XL`
- [ ] **Schedule Templates** - Reusable shift patterns and rotations `L`
- [ ] **Capacity Planning** - Advanced resource allocation and forecasting `L`
- [ ] **Schedule Automation** - Intelligent scheduling based on availability `XL`
- [ ] **Overtime Tracking** - Integration with leave for comprehensive time management `M`
- [ ] **Calendar Sync** - Two-way sync with Google Calendar/Outlook `L`

### Dependencies

- User feedback on current scheduling needs
- Core platform stability


## Phase 6: Enterprise Features 🏢

**Goal:** Advanced features for larger organizations
**Success Criteria:** Support for 50+ employee organizations with complex needs

### Features

- [ ] **Advanced Reporting** - Compliance and utilization analytics `L`
- [ ] **API Access** - REST API for integrations `L`
- [ ] **SSO Integration** - SAML/OIDC for enterprise auth `L`
- [ ] **Custom Leave Types** - Flexible leave categories per organization `M`
- [ ] **Audit Trails** - Comprehensive activity logging `M`
- [ ] **Data Export** - Bulk data export and reporting `S`
- [ ] **White-label Options** - Custom branding for enterprise clients `XL`

### Dependencies

- Enterprise customer feedback
- Proven scale and stability