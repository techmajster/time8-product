# Spec Requirements Document

> Spec: Mandatory Absence Types System
> Created: 2025-10-23
> Status: Planning

## Overview

Implement a mandatory absence types system that enforces two non-deletable global leave types for all workspaces, ensuring compliance with Polish labor law while providing workspace-level and per-user configuration flexibility.

## User Stories

### Workspace Administrator Story

As a workspace administrator, I want two mandatory leave types (Urlop wypoczynkowy and Urlop bezpłatny) to be automatically created and non-deletable, so that I can ensure compliance with Polish labor law without risk of accidentally removing essential leave categories.

**Detailed Workflow:**
When an admin navigates to the Admin Settings page to manage leave types, they see all leave types including the two mandatory ones clearly marked with visual indicators (e.g., a lock icon or badge). When they attempt to delete a mandatory type, the system prevents deletion and displays a tooltip/message explaining why these types cannot be removed. The admin can still edit workspace-level defaults (e.g., change default days from 20 to 26 for Urlop wypoczynkowy) and configure individual employee balances, but the types themselves remain permanent fixtures in the system.

### HR Manager Story

As an HR manager, I want to configure workspace-level defaults for Urlop wypoczynkowy and override individual employee balances, so that I can handle different employment scenarios (e.g., 20 days for employees under 10 years seniority, 26 days for those with 10+ years).

**Detailed Workflow:**
The HR manager accesses the leave type management interface where they can set the workspace default for Urlop wypoczynkowy (e.g., 20 days). When editing an individual employee's profile, they can override this default to assign a custom balance (e.g., 26 days for senior employees). The system tracks both workspace defaults and individual overrides, using the override when present and falling back to the workspace default otherwise.

### Employee Story

As an employee, I want to see my accurate leave balances for both paid vacation (Urlop wypoczynkowy) and unpaid leave (Urlop bezpłatny), so that I can plan my time off knowing exactly what's available to me.

**Detailed Workflow:**
When employees view their dashboard or leave request page, they see clear balance information for Urlop wypoczynkowy showing their entitled days, used days, and remaining balance. For Urlop bezpłatny, they see it's available with unlimited days (or appropriate messaging indicating it doesn't require balance tracking). The system prevents employees from requesting more Urlop wypoczynkowy than they have available while allowing unlimited Urlop bezpłatny requests subject to approval.

## Spec Scope

1. **Database Schema Updates** - Add `is_mandatory` boolean column to `leave_types` table and `balance_override` to `leave_balances` table
2. **Mandatory Type Creation** - Automatically create two non-deletable leave types (Urlop wypoczynkowy and Urlop bezpłatny) for new and existing workspaces
3. **Deletion Prevention** - Implement database constraints and API validation to prevent deletion of mandatory leave types
4. **Workspace-Level Defaults** - Allow admins to configure default days for Urlop wypoczynkowy at workspace level (stored in `leave_types.days_per_year`)
5. **Individual Balance Overrides** - Enable per-user balance customization via employee edit page, storing overrides in `leave_balances` table
6. **UI Indicators** - Add visual markers (lock icons, badges, tooltips) in Admin Settings to clearly identify mandatory types
7. **Balance Calculation Logic** - Update leave balance queries to use individual overrides when present, otherwise workspace defaults
8. **Unlimited Leave Handling** - Special handling for Urlop bezpłatny with no balance requirements (unlimited days)

## Out of Scope

- Optional Polish law templates (11 additional leave types) - This is a separate feature in Phase 2
- Custom absence type creation by admins - This is a separate feature in Phase 2
- Migration of existing leave types to mandatory status - We only enforce for new types going forward
- Multi-year balance tracking or carry-over logic changes
- Changes to leave request approval workflow
- UI redesign using Figma designs - That's Phase 3

## Expected Deliverable

1. **Database Changes Applied:** Migration successfully creates `is_mandatory` column, backfills existing Urlop wypoczynkowy and Urlop bezpłatny types, and adds constraints
2. **Non-Deletable Types Verified:** Attempting to delete mandatory leave types via Admin Settings UI shows error message and prevents deletion
3. **Workspace Defaults Working:** Admin can edit default days for Urlop wypoczynkowy in workspace settings and new employees receive this default
4. **Individual Overrides Working:** Admin can edit individual employee's Urlop wypoczynkowy balance via employee edit page, and employee sees custom balance on dashboard
5. **Balance Calculations Accurate:** Leave request validation and balance displays correctly use individual overrides when present, otherwise workspace defaults
6. **Unlimited Leave Functional:** Urlop bezpłatny allows requests without balance limits, subject to approval workflow
