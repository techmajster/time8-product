# Phase 2: Permission & Absence System Overhaul - Context Summary

**Date Started:** 2025-10-22
**Status:** Planning Phase
**Approach:** Two Parallel Tracks

---

## Project Overview

**Product:** TeamLeave - SaaS leave management platform for SMEs (3+ employees)
**Tech Stack:** Next.js 15 + Supabase + shadcn/ui + TypeScript
**Current Phase:** Phase 2 (Permission & Absence System Overhaul)

---

## Phase 2 Goals

Implement flexible three-tier permission system with mandatory absence types and optional Polish law templates.

**Success Criteria:**
- Three roles working (Normal User, Manager, Admin)
- Managers have READ-ONLY access to Team/Groups pages
- Two mandatory absence types enforced (non-deletable)
- 11 Polish law templates available as optional activations
- Custom workspace-specific absence types supported
- Workspace defaults + per-user balance overrides

---

## Current Application Structure

### User Roles & Access

**Normal User (Pracownik):**
- Dashboard, Calendar, My Profile, My Leave
- Visibility to other groups' absence (if admin enables toggle)

**Manager (Kierownik):**
- All Normal User access
- Team page (READ-ONLY - can view but not add/edit/remove)
- Groups page (READ-ONLY - can view but not add/edit/remove)
- Leave Requests management page
- Can create leave requests for team members

**Admin:**
- Full CRUD access to all features
- User/group management
- Admin settings with visibility controls
- All pages accessible

### Key Pages

**All Users:**
- `/dashboard` - Main dashboard
- `/calendar` - Team calendar view
- `/profile` - User profile
- `/leave` - My leave requests (tabs: All, 2025, 2024)

**Manager + Admin:**
- `/team` - Team view (admin has dynamic tabs, manager sees only their team)
- `/leave-requests` - Leave request management (tabs: All, Pending, Approved, Rejected)

**Admin Only:**
- `/admin/team-management` - Full team management (tabs: Employees w/filters, Groups, Invitations)
- `/admin/team-management/add-employee` - Add employee
- `/admin/team-management/edit-employee/[id]` - Edit employee
- `/admin/settings` - Admin settings (tabs: General, Leave Types, Policies, Billing)
- `/schedule` - Schedule management (tabs: Weekly, Templates, Assignment)

---

## Polish Leave Types (Currently in Codebase)

**Location:** `/types/leave.ts` (lines 314-458)

**13 Types Total:**
1. Urlop wypoczynkowy (Annual - 20/26 days) ← **MANDATORY TYPE**
2. Urlop na żądanie (On-demand - 4 days)
3. Urlop bezpłatny (Unpaid - unlimited) ← **MANDATORY TYPE**
4. Urlop macierzyński (Maternity - 140 days)
5. Urlop ojcowski (Paternity - 14 days)
6. Urlop rodzicielski (Parental - 41-43 weeks)
7. Dni wolne wychowawcze (Childcare - 2 days/child)
8. Urlop okolicznościowy (Special occasions - 1-2 days)
9. Urlop opiekuńczy (Care - 5 days/year)
10. Urlop szkoleniowy (Training - 6 or 21 days)
11. Urlop rehabilitacyjny (Rehabilitation - 10+21 days)
12. Urlop na poszukiwanie pracy (Job search - 3 days)
13. Zwolnienie z powodu siły wyższej (Force majeure - 2 days/year)

---

## Two Parallel Implementation Tracks

### Track 1: Permission System Foundation (Large - L)

**Database Changes:**
- Add workspace settings table for visibility toggle
- Update RLS policies for role-based access

**Implementation:**
- Three-tier role enforcement
- Route guards and middleware
- Navigation menu filtering by role
- UI component-level permission checks
- Team/Groups pages READ-ONLY mode for managers
- Admin visibility toggle: "Let users see other group absence" (yes/no)

**Key Files to Modify:**
- Middleware for route protection
- `/team/page.tsx` - Add READ-ONLY mode for managers
- `/admin/team-management/page.tsx` - Add READ-ONLY mode for managers
- `components/app-sidebar.tsx` - Navigation filtering
- Database migration for settings

### Track 2: Absence Type System Redesign (Medium-Large - M-L)

**Database Changes:**
- Add `is_mandatory` flag to leave_types table
- Add `is_template` flag for Polish law templates
- Add `template_source` field (for future international templates)
- Update leave_balances for per-user overrides

**Implementation:**
- Two mandatory types (non-deletable):
  - Urlop wypoczynkowy (default 20 days, workspace + per-user configurable)
  - Urlop bezpłatny (unlimited, non-deletable)
- 11 optional Polish law templates (activatable by admin)
- Custom workspace-specific types (full CRUD by admin)
- Workspace-level default days configuration
- Individual user balance overrides
- Deduplication logic (prevent enabling templates that duplicate mandatory)

**Key Files to Modify:**
- `types/leave.ts` - Update interfaces
- `lib/leave-types-service.ts` - Add template logic
- `app/admin/settings/components/EditLeaveTypesSheet.tsx` - Template activation UI
- Database migration for type flags
- Leave balance calculation logic

---

## Key Decisions Made

**DEC-004:** Design system deprioritized to Phase 3 (waiting on Figma)
**DEC-005:** Binary visibility toggle affects ONLY normal users (managers always see all)
**DEC-006:** Two mandatory types + 11 optional templates + custom types
**DEC-007:** Managers have READ-ONLY access to Team/Groups pages

---

## Database Structure (Relevant Tables)

**Current Key Tables:**
- `profiles` - User profiles
- `user_organizations` - Multi-org membership with roles
- `teams` - Group/team structure
- `organizations` - Workspace/organization data
- `leave_types` - Absence type definitions
- `leave_balances` - User leave balances per type
- `leave_requests` - Leave request submissions

**Files to Reference:**
- Database migrations: `/supabase/migrations/*.sql`
- Type definitions: `/types/leave.ts`
- Leave services: `/lib/leave-types-service.ts`, `/lib/leave-balance-utils.ts`
- Auth utilities: `/lib/auth-utils-v2.ts`

---

## Next Steps

1. **User provides:** Page structure outline (text-based)
2. **Create Spec 1:** Permission System & Role-Based Access Control
3. **Create Spec 2:** Absence Type System Redesign
4. **Parallel Implementation:** Both tracks simultaneously
5. **Integration Testing:** Ensure both systems work together

---

## Important Notes

- All work uses existing UI (no design changes in Phase 2)
- Phase 3 will handle complete design overhaul with Figma
- Must maintain backward compatibility with existing leave requests
- Polish law compliance remains priority
- System must support future international templates

---

**Context Compacted:** 2025-10-22
**Ready for:** Spec creation once page structure outline received
