# Spec Requirements Document

> Spec: Team Management Interface Redesign
> Created: 2025-11-08
> Status: Planning

## Overview

Complete redesign of the team management interface matching Figma specifications. This includes converting from a vertically-stacked section layout to a modern tabbed interface (Aktywni/Zaproszeni/Zarchiwizowani), replacing full-page employee editing with a right-side sheet overlay, updating dialog messaging, simplifying the invitations table, and adding new features like per-user leave approver selection.

The redesign improves information architecture, reduces cognitive load, eliminates disruptive full-page navigation, and ensures complete Figma design compliance across all team management workflows.

## User Stories

### Story 1: Admin Views All User States in Unified Interface

As an admin, I want to see all user states (active, invited, archived) in a tabbed interface, so that I can quickly switch between different user categories without scrolling through long stacked sections.

**Workflow:**
1. Admin navigates to Team Management page
2. Sees three tabs at the top: Aktywni (default), Zaproszeni, Zarchiwizowani
3. Clicks on any tab to switch between user states
4. Each tab shows relevant table with appropriate columns and actions
5. Group filters (Wszyscy, UX, UI, Marketing) work consistently across all tabs

**Problem Solved:** Current stacked sections force users to scroll past irrelevant content. Tabs provide clear separation and faster access.

### Story 2: Admin Edits Employee Details Without Page Navigation

As an admin, I want to edit employee details in a side sheet overlay, so that I don't lose my place in the employee list and can quickly edit multiple employees.

**Workflow:**
1. Admin views employee in the Aktywni tab
2. Clicks three-dot menu → "Edytuj"
3. Right-side sheet (560px) slides in with employee details
4. Edits information in compact single-column form
5. Clicks "Zapisz zmiany" and sheet closes
6. Returns to same position in employee list

**Problem Solved:** Current full-page navigation disrupts workflow and requires back-button navigation. Sheet pattern keeps context and enables rapid edits.

### Story 3: Admin Assigns Leave Approver Per Employee

As an admin, I want to assign a specific leave approver to each employee, so that leave requests are routed to the correct manager regardless of team structure.

**Workflow:**
1. Admin opens edit sheet for an employee
2. Scrolls to "Osoba akceptująca urlop" section
3. Selects a manager or admin from dropdown
4. Saves changes
5. Employee's leave requests now route to selected approver

**Problem Solved:** Current system lacks per-user leave approver configuration. This enables flexible approval hierarchies independent of team assignments.

## Spec Scope

1. **Tab Navigation System** - Three tabs (Aktywni, Zaproszeni, Zarchiwizowani) with state management and content switching

2. **Edit Employee Sheet Component** - 560px right-side overlay with user data, leave balances, and leave approver sections

3. **Simplified Invitations Table** - Reduced from current columns to: Name, Approver, Group, Status, Actions with pagination

4. **Updated Dialogs** - Cancel invitation confirmation dialog and updated archive user dialog messaging

5. **Group Filter Component** - Reusable filter chips working across all three tabs

## Out of Scope

- Changes to employee invitation flow (different phase)
- Bulk user operations (future enhancement)
- Custom column configuration (future enhancement)
- Advanced table sorting/filtering (beyond group filters)
- Leave request management features
- Role permission changes

## Expected Deliverable

1. **Functional tab system** - Users can switch between Aktywni, Zaproszeni, Zarchiwizowani tabs with correct content displayed

2. **Working edit sheet** - Clicking "Edytuj" opens 560px sheet with all form fields functional, saves correctly, and refreshes data

3. **Confirmation dialogs** - Cancel invitation shows confirmation dialog before action, archive dialog has updated messaging

4. **Figma compliance** - All 4 designs match pixel-perfect: edit sheet, invitations tab, cancel dialog, archive dialog

5. **Responsive design** - Interface works on different screen sizes with appropriate breakpoints

6. **Data integrity** - All CRUD operations work correctly, leave approver field saves to database, validations in place
