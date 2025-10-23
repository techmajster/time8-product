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

- [ ] **Multi-Workspace Isolation Audit & Fix** `L` 🔥 **HIGH PRIORITY**
  - Audit all 30+ API routes that reference `organization_id`
  - Ensure all routes respect `active-organization-id` cookie
  - Fix routes that query data without proper workspace context
  - Critical routes to fix:
    - `/api/employees/route.ts` - Employee listing
    - `/api/teams/**` - Team management endpoints
    - `/api/leave-requests/**` - Leave request operations
    - `/api/calendar/**` - Calendar data endpoints
    - `/api/billing/**` - Billing and subscription operations
    - `/api/admin/settings/**` - Admin settings endpoints
    - And 20+ additional organization-aware routes
  - Add integration tests for multi-workspace admin scenarios
  - Document standard cookie usage pattern for future API development
  - Prevent data leakage between workspaces for multi-org admins

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

- [ ] **Optional Polish Law Templates** `M`
  - 11 additional Polish labor law leave types from existing `types/leave.ts`
  - Admin can enable/disable specific templates per workspace
  - Deduplication logic to prevent conflicts with mandatory types
  - Templates only visible in current workspace

- [ ] **Custom Absence Type Management** `S`
  - Admin can create custom absence types per workspace
  - Full CRUD operations on custom types
  - Custom types only visible to workspace users

- [ ] **UI Permission Enforcement** `M`
  - Route guards for unauthorized access
  - Navigation menu filtering by role
  - Component-level button visibility (hide Add/Edit/Delete for managers on Team/Groups)
  - Team page READ-ONLY mode for managers
  - Groups page READ-ONLY mode for managers

### Dependencies

- Phase 1 complete ✅
- Page structure outline from user
- Database schema review for permission tables

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
- [ ] **Data Migration Tools** - Import existing leave data from spreadsheets `L`
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

## Phase 6: Subscription & Growth 💰

**Goal:** Monetization and scaling beyond free tier
**Success Criteria:** Sustainable revenue with smooth upgrade experience

### Features

- [ ] **Subscription System** - Stripe integration with tiered pricing `L`
- [ ] **Usage Analytics** - Track usage against subscription limits `M`
- [ ] **Billing Dashboard** - Self-service subscription management `M`
- [ ] **Feature Gating** - Premium features based on subscription tier `M`
- [ ] **Team Size Limits** - Enforce 3-user free tier with upgrade prompts `S`
- [ ] **Payment Recovery** - Failed payment handling and dunning `M`

### Dependencies

- Stripe vs alternative payment platform decision
- Pricing strategy validation

## Phase 7: Enterprise Features 🏢

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