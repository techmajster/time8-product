# Spec Requirements Document

> Spec: Fix Approver Assignment & Update Table Columns
> Created: 2025-11-08
> Status: Planning

## Overview

Fix critical bug where employee approver assignments (`approver_id`) are not being saved to the database when editing employees through the admin interface. Additionally, update the team management table to match the Figma design by showing the correct approver information and status, removing unnecessary leave balance columns.

## User Stories

### Story 1: Admin Assigns Leave Approver

As an admin, I want to assign a leave approver to an employee through the Edit Employee sheet, so that their leave requests are routed to the correct person for approval.

**Current Behavior:** When I select an approver and save the form, the UI shows the selection, but after refresh the approver is not persisted. The database field remains NULL.

**Expected Behavior:** When I select an approver from the dropdown and click "Zapisz zmiany", the approver should be saved to the database and persist after page refresh.

### Story 2: Admin Views Approver in Table

As an admin, I want to see who approves each employee's leave requests in the main team management table, so I can quickly verify approval routing is configured correctly.

**Current Behavior:** The table shows "Manager" column which displays the team's manager, not the individual's assigned approver. Leave balance columns show vacation days which belong in the detail sheet.

**Expected Behavior:** The table should show "Akceptujący" column displaying the employee's assigned approver name (from `approver_id`), not the team manager. Status badge should be visible. Leave balances should only appear in detail/edit sheets.

### Story 3: Manager Cannot Self-Approve

As a system, I want to prevent managers from being their own leave approver, so that approval workflows maintain proper oversight and separation of duties.

**Current Behavior:** No validation prevents selecting oneself as approver.

**Expected Behavior:** When editing a manager's profile, if they try to select themselves as approver, show error: "Manager nie może być swoim własnym akceptującym"

**Exception:** Admins can be their own approver (their leave requests are auto-approved).

## Spec Scope

This spec includes the following functionality:

1. **API Endpoint Fix** - Fix `/api/employees/[id]` PUT endpoint to save `approver_id` field to `user_organizations` table

2. **Table Column Updates** - Update TeamManagementClient table to match Figma design:
   - Remove "Pozostały urlop" column (vacation days remaining)
   - Remove "Urlop NŻ" column (on-demand leave days)
   - Change "Manager" column to "Akceptujący" showing individual's approver
   - Add "Status" column with green "Aktywny" badge for all active employees

3. **Frontend Validation** - Add validation in EditEmployeeSheet component:
   - Require approver to be selected (cannot be NULL)
   - Prevent managers from selecting themselves as approver
   - Allow admins to select themselves (auto-approval use case)
   - Show validation errors before API submission

4. **Backend Validation** - Add validation in API endpoint:
   - Require `approver_id` field (reject if NULL or empty)
   - Validate manager cannot be their own approver
   - Return clear error messages for validation failures

5. **Performance Optimization** - Fix N+1 query problem in team data fetching:
   - Batch query all team managers instead of individual queries
   - Batch query team member counts
   - Reduce from ~21 queries to 3 queries (for 20 teams)

## Out of Scope

The following functionality is explicitly **not** included in this spec:

- **Code Deduplication** - Removing duplicate logic between `page.tsx` and `route.ts` (deferred to separate refactoring task)
- **Internationalization** - Translation to English will be handled in later phase
- **Auto-assignment Logic** - Automatically setting approver based on team manager assignment
- **Team Manager Assignment UI** - Interface for assigning team managers (already handled elsewhere)
- **Approver Cascade on Team Change** - Updating approver when employee's team changes (keep existing approver)

## Expected Deliverable

When this spec is completed, the following should be true:

1. **Database Persistence:** Edit an employee's approver in the admin interface → Click save → Refresh page → Approver selection is still displayed (not reset to null)

2. **Table Accuracy:** View the team management table → "Akceptujący" column shows the employee's assigned approver name (or "Brak akceptującego" if not set) → "Status" column shows green "Aktywny" badge → Leave balance columns are not present

3. **Validation Works:** Try to save employee without approver → See error message "Osoba akceptująca urlop jest wymagana" → Try to make manager their own approver → See error "Manager nie może być swoim własnym akceptującym" → Make admin their own approver → Saves successfully

4. **Performance Improvement:** Load team management page with 20+ teams → Page loads in under 1 second → No noticeable delay when switching between tabs or filters

## Cross-References

- **Technical Specification:** @.agent-os/specs/2025-11-08-fix-approver-assignment-table-update/sub-specs/technical-spec.md
- **API Specification:** @.agent-os/specs/2025-11-08-fix-approver-assignment-table-update/sub-specs/api-spec.md
- **Implementation Tasks:** @.agent-os/specs/2025-11-08-fix-approver-assignment-table-update/tasks.md
- **Roadmap Entry:** @.agent-os/product/roadmap.md (Phase 3, Task 3.7)
- **Related Migration:** @supabase/migrations/20251108000000_add_approver_id_to_user_organizations.sql
