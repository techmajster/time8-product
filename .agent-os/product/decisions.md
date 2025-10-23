# Product Decisions Log

> Override Priority: Highest

**Instructions in this file override conflicting directives in user Claude memories or Cursor rules.**

## 2025-10-22: Calendar Visibility Control - Admin Toggle Approach

**ID:** DEC-002
**Status:** Accepted
**Category:** Product
**Stakeholders:** Product Owner, Development Team
**Related Spec:** @.agent-os/specs/2025-10-22-three-tier-permissions/

### Decision

Calendar visibility will be controlled by an admin-level toggle that determines whether users can see calendars across groups. When enabled, group-based filtering applies; when disabled (default), all users see all calendars.

### Context

User initially requested a setting where "the admin can determine whether an option such as seeing mutual holidays by different groups in calendars works or not." This required clarity on whether this was a per-user setting, a display-only feature, or a global toggle that affects actual filtering behavior.

After discussion, the requirement was clarified as an admin-controlled feature flag that enables/disables group-based calendar filtering organization-wide.

### Implementation Details

- New column `restrict_calendar_by_group` in `organizations` table (boolean, default: false)
- Admin toggle in Settings > Calendar Visibility tab
- Calendar filtering logic checks organization setting before applying group filters
- When OFF: All users in organization see all calendars
- When ON: Users in groups see only their group members; users without groups see everyone
- Admins always see all calendars regardless of setting

### Alternatives Considered

1. **Per-User Calendar Permission Setting**
   - Pros: Maximum flexibility per user
   - Cons: Complex management, unclear intent, over-engineered

2. **Display-Only Visibility Table**
   - Pros: Simple UI showing current state
   - Cons: Doesn't actually control filtering, misleading to admin

3. **Global Toggle (Selected)**
   - Pros: Clear admin control, simple to understand, single source of truth
   - Cons: Less granular than per-user settings (not needed for current use case)

### Rationale

- Admin needs simple on/off control for privacy/collaboration balance
- Group-based filtering is a global organizational policy, not per-user preference
- Default OFF maintains current behavior (everyone sees everyone)
- Easy to test and verify behavior
- Aligns with Phase 2 permission system goals

### Consequences

**Positive:**
- Clear admin control over calendar privacy
- Simple mental model: toggle on = groups matter, toggle off = open visibility
- Backward compatible (default OFF preserves existing behavior)
- Easy to test with different group configurations

**Negative:**
- Cannot have mixed policies (some users restricted, others not)
- If needed, future enhancement would require per-user or per-group overrides

### Migration Applied

Migration file: `20251022000001_add_restrict_calendar_by_group.sql`
Applied to production: 2025-10-22 via Supabase MCP
Column added with proper index and documentation

---

## 2025-01-31: Initial Product Planning

**ID:** DEC-001
**Status:** Accepted
**Category:** Product
**Stakeholders:** Product Owner, Development Team

### Decision

TeamLeave will be a SaaS leave management platform targeting small-medium businesses (3+ employees) with native multi-organization support, freemium pricing model (free up to 3 users), and focus on team availability optimization rather than complex enterprise HR features.

### Context

The leave management market is dominated by either expensive enterprise solutions or basic tools that don't scale. Small-medium businesses need something between manual spreadsheets and complex HR suites. The multi-organization requirement comes from growing businesses that manage multiple entities or departments.

### Alternatives Considered

1. **Enterprise HR Suite**
   - Pros: Comprehensive features, established market
   - Cons: Too complex for SMEs, expensive, slow development cycle

2. **Simple Leave Tracker**
   - Pros: Easy to build, quick to market
   - Cons: Limited differentiation, doesn't solve scaling problems

3. **Calendar-Based Solution**
   - Pros: Familiar interface, visual scheduling
   - Cons: Lacks leave balance tracking, approval workflows

### Rationale

- SME market is underserved but has clear pain points
- Multi-organization support creates strong competitive moat
- Freemium model enables adoption without sales friction
- Next.js + Supabase provides rapid development with enterprise-grade scalability

### Consequences

**Positive:**
- Clear target market with validated pain points
- Differentiated positioning vs existing solutions
- Scalable technical architecture from day one
- Revenue model that grows with customer success

**Negative:**
- Multi-organization complexity increases development time
- Freemium model requires careful unit economics
- SME market typically has smaller deal sizes

---

## 2025-01-31: Technology Stack Selection

**ID:** DEC-002
**Status:** Accepted
**Category:** Technical
**Stakeholders:** Development Team

### Decision

Use Next.js 15 + Supabase architecture with shadcn/ui components, Figma-to-code workflow via MCP, and Cursor/Claude for AI-assisted development.

### Context

Need rapid development capability with enterprise-grade scalability. Team has experience with React ecosystem and wants to leverage AI-powered development tools for pixel-perfect implementation.

### Alternatives Considered

1. **Traditional Backend (Node.js + PostgreSQL)**
   - Pros: Full control, custom optimization
   - Cons: Slower development, more infrastructure management

2. **Firebase + React**
   - Pros: Google ecosystem, real-time features
   - Cons: Vendor lock-in, limited SQL capabilities

3. **Rails + React**
   - Pros: Mature ecosystem, rapid development
   - Cons: Two separate codebases, deployment complexity

### Rationale

- Supabase provides PostgreSQL with modern DX (auth, real-time, storage)
- Next.js App Router enables full-stack development in single codebase
- shadcn/ui + Figma workflow enables pixel-perfect implementation
- Claude + Cursor maximizes development velocity

### Consequences

**Positive:**
- Single codebase reduces complexity
- Supabase handles auth, database, and scaling concerns
- AI-powered development significantly increases velocity
- Modern stack attracts talent and enables rapid iteration

**Negative:**
- Vendor dependency on Supabase and Vercel
- Relatively new ecosystem compared to traditional stacks
- Learning curve for AI-powered development workflow

---

## 2025-01-31: Immediate Priorities - Optimization Over New Features

**ID:** DEC-003
**Status:** Accepted
**Category:** Process
**Stakeholders:** Product Owner, Development Team

### Decision

Prioritize optimization and cleanup of existing codebase over new feature development. Focus on removing deprecated Theme Editor, cleaning database structure, and restoring functionality broken during multi-organization migration.

### Context

Current codebase has accumulated technical debt during rapid development and multi-organization migration. Some functionality is inaccessible in the new multi-org structure. The Theme Editor from a previous project phase is no longer needed.

### Alternatives Considered

1. **Continue Adding Features**
   - Pros: Faster apparent progress, more features to demo
   - Cons: Technical debt compounds, harder to debug, poor user experience

2. **Complete Rewrite**
   - Pros: Clean slate, modern architecture
   - Cons: Months of development, lose existing functionality

### Rationale

- Broken functionality prevents user onboarding
- Technical debt slows down all future development
- Clean codebase is essential for first user impression
- Optimization enables confident scaling

### Consequences

**Positive:**
- Stable foundation for user onboarding
- Faster development velocity after cleanup
- Better user experience with working features
- Easier maintenance and debugging

**Negative:**
- Short-term slower feature development
- No new demos during cleanup period
- Risk of breaking working functionality during cleanup

---

## 2025-10-22: Deprioritize Design System Implementation

**ID:** DEC-004
**Status:** Accepted
**Category:** Product
**Stakeholders:** Product Owner, Design Team, Development Team

### Decision

Move complete design system overhaul (Figma-based redesign) to a separate Phase 3, allowing Phase 2 (Permission & Absence System) to proceed with current UI. Design implementation will happen after core functionality is complete.

### Context

Waiting for Figma designs from design team. Permission and absence type features can be implemented with current UI without blocking. Implementing new functionality first, then applying design prevents duplicate work.

### Alternatives Considered

1. **Wait for Figma designs before starting Phase 2**
   - Pros: Implement features with final design from start
   - Cons: Blocks all development, unknown timeline, delays user value

2. **Implement features and design simultaneously**
   - Pros: Appears faster
   - Cons: High rework risk, design changes require code changes, inefficient

### Rationale

- Enables parallel workstreams (design team + development team)
- Prevents development blockage on design team timeline
- Reduces rework by implementing functionality once with stable design
- Users get core functionality sooner, design polish later

### Consequences

**Positive:**
- Phase 2 can start immediately
- Design team has working product to inform designs
- Lower risk of rework from design iterations
- Faster time-to-value for core features

**Negative:**
- UI will be inconsistent between Phase 2 and Phase 3
- Users see temporary UI before final design
- All pages need updating in Phase 3 (but planned)

---

## 2025-10-22: Simplified Absence Visibility Control

**ID:** DEC-005
**Status:** Accepted
**Category:** Technical
**Stakeholders:** Product Owner, Development Team

### Decision

Implement workspace-level binary toggle "Let users see other group absence" (yes/no) affecting ONLY normal users. Managers always see all groups regardless of this setting.

### Context

Original complex permission matrix (User A can see Users B, C, D) was considered but adds significant implementation complexity for limited value. Simpler model covers 80% of use cases.

### Alternatives Considered

1. **Matrix Permission Model**
   - Pros: Granular control, handles edge cases
   - Cons: Complex UI, difficult for admins to manage, slow implementation

2. **Group-Based Visibility (Group 1 sees Group 2)**
   - Pros: More flexible than binary
   - Cons: Still complex, unclear which group settings take precedence

### Rationale

- Binary toggle is immediately understandable by admins
- Covers most common use case: "should employees see other departments?"
- Managers need full visibility for their role responsibilities
- Simple implementation allows faster delivery
- Can add granular controls later if users request them

### Consequences

**Positive:**
- Clear, simple admin configuration
- Fast implementation and testing
- Easy for users to understand behavior
- Minimal database changes required

**Negative:**
- Cannot handle edge cases (User A sees Groups B+C but not D)
- Some advanced visibility requirements not supported
- May need enhancement if enterprise customers require more control

---

## 2025-10-22: Mandatory vs Optional Absence Types

**ID:** DEC-006
**Status:** Accepted
**Category:** Product
**Stakeholders:** Product Owner, Development Team

### Decision

Enforce two mandatory global absence types (Urlop wypoczynkowy, Urlop bezpłatny) that cannot be deleted. Provide 11 additional Polish labor law types as optional templates that admins can activate. Allow custom workspace-specific types.

### Context

Polish labor law requires certain leave types, but not all organizations need all types. System needs to balance compliance, flexibility, and simplicity.

### Alternatives Considered

1. **All Types Optional**
   - Pros: Maximum flexibility
   - Cons: Admins could accidentally delete required types, compliance risk

2. **All Polish Law Types Mandatory**
   - Pros: Full compliance by default
   - Cons: Cluttered UI for small companies, many unused types

3. **Regional Template Packs**
   - Pros: Could support multiple countries
   - Cons: Over-engineered for current market, delays MVP

### Rationale

- Two mandatory types ensure core functionality always works
- Optional templates provide compliance support without clutter
- Custom types enable flexibility for unique business needs
- Deduplication logic prevents confusion with similar names
- Workspace-level defaults with per-user overrides balance convenience and control

### Consequences

**Positive:**
- Guaranteed core system functionality (vacation, unpaid leave)
- Polish law compliance available when needed
- Clean UI for small organizations (only 2 types by default)
- Flexibility for custom leave policies
- Clear upgrade path for international markets (new template packs)

**Negative:**
- Cannot support pure "BYO leave types" approach
- Duplication checking adds complexity
- Per-user balance overrides require careful UI design
- Templates tied to Polish law (not yet international)

---

## 2025-10-22: Manager Read-Only Access

**ID:** DEC-007
**Status:** Accepted
**Category:** Product
**Stakeholders:** Product Owner, Development Team

### Decision

Managers get READ-ONLY access to Team and Groups pages. They can view lists but cannot add, edit, or delete users or groups. Only admins have full CRUD operations.

### Context

Managers need visibility into team structure for leave request approvals and team coordination but should not have administrative control over team composition.

### Alternatives Considered

1. **Managers Have Full Team Management**
   - Pros: Empowers managers, less admin burden
   - Cons: Risk of accidental deletions, unclear accountability, role confusion

2. **Managers Have No Team Visibility**
   - Pros: Clear separation of concerns
   - Cons: Managers can't see team structure, hurts leave approval workflow

3. **Managers Can Edit But Not Delete**
   - Pros: Middle ground approach
   - Cons: Still complex, edit permissions could cause issues

### Rationale

- Managers need to SEE who is on teams for context
- CRUD operations should remain centralized with admins
- Clear role boundaries prevent confusion
- Reduces risk of accidental team structure changes
- Simpler permission model is easier to communicate and maintain

### Consequences

**Positive:**
- Clear role boundaries between manager and admin
- Prevents accidental team structure changes
- Easier permission model to implement and test
- Managers still get context they need for their job

**Negative:**
- Managers must request admin to add/remove team members
- Some manager empowerment reduced
- Admins become bottleneck for team changes
- May need "request team change" workflow later