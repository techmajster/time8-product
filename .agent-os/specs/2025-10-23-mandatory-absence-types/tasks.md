# Spec Tasks

## Tasks

- [ ] 1. Database Schema Implementation
  - [ ] 1.1 Write tests for mandatory leave types schema changes
  - [ ] 1.2 Create migration file `20251023000000_add_mandatory_leave_types.sql`
  - [ ] 1.3 Add `is_mandatory` column to `leave_types` table with index
  - [ ] 1.4 Create `ensure_mandatory_leave_types()` function
  - [ ] 1.5 Create `backfill_mandatory_leave_balances()` function for existing employees
  - [ ] 1.6 Create deletion prevention trigger `prevent_mandatory_leave_type_deletion()`
  - [ ] 1.7 Backfill existing Urlop wypoczynkowy and Urlop bezpłatny as mandatory
  - [ ] 1.8 Run ensure function to create missing mandatory types for all orgs
  - [ ] 1.9 Run backfill function to create missing balances for existing employees
  - [ ] 1.10 Run all database schema tests and verify migration success

- [ ] 2. API Endpoint Updates for Deletion Prevention
  - [ ] 2.1 Write tests for DELETE `/api/leave-types/[id]` with mandatory types
  - [ ] 2.2 Update DELETE `/api/leave-types/[id]` to check `is_mandatory` flag
  - [ ] 2.3 Return 403 Forbidden with descriptive error for mandatory type deletion
  - [ ] 2.4 Add audit logging for deletion attempts of mandatory types
  - [ ] 2.5 Verify all DELETE endpoint tests pass

- [ ] 3. API Endpoint Updates for Leave Type Editing
  - [ ] 3.1 Write tests for PUT `/api/leave-types/[id]` with protected fields
  - [ ] 3.2 Update PUT `/api/leave-types/[id]` to validate protected fields for mandatory types
  - [ ] 3.3 Allow editing `days_per_year` (workspace default) for mandatory types
  - [ ] 3.4 Prevent editing `is_mandatory`, `leave_category`, `requires_balance` fields
  - [ ] 3.5 Return 400 Bad Request with field list when protected fields are modified
  - [ ] 3.6 Verify all PUT endpoint tests pass

- [ ] 4. API Updates for Leave Balances with Override Support
  - [ ] 4.1 Write tests for GET `/api/leave-balances` with override information
  - [ ] 4.2 Update GET `/api/leave-balances` to include `is_override` and `workspace_default` fields for admins
  - [ ] 4.3 Update balance queries to prioritize `leave_balances.entitled_days` over `leave_types.days_per_year`
  - [ ] 4.4 Verify balance calculation logic in `/lib/leave-balance-utils.ts` follows override hierarchy
  - [ ] 4.5 Verify all balance endpoint tests pass

- [ ] 5. Employee Edit API for Balance Overrides
  - [ ] 5.1 Write tests for PUT `/api/employees/[id]` with leave balance overrides
  - [ ] 5.2 Update PUT `/api/employees/[id]` to accept `leave_balance_overrides` array
  - [ ] 5.3 Implement upsert logic for leave_balances records with custom entitled_days
  - [ ] 5.4 Add validation for entitled_days range (0-50)
  - [ ] 5.5 Return both new and previous values in response for audit trail
  - [ ] 5.6 Verify all employee edit endpoint tests pass

- [ ] 6. Leave Request Validation Updates
  - [ ] 6.1 Write tests for POST `/api/leave-requests` with mandatory types and unlimited leave
  - [ ] 6.2 Update leave request validation to use override entitled_days when available
  - [ ] 6.3 Skip balance validation for types where `requires_balance = false` (Urlop bezpłatny)
  - [ ] 6.4 Return `is_unlimited: true` for unlimited leave types in response
  - [ ] 6.5 Update balance projection logic to use effective balance (override or default)
  - [ ] 6.6 Verify all leave request validation tests pass

- [ ] 7. Admin Settings UI - Leave Types Management
  - [ ] 7.1 Write tests for mandatory leave type UI indicators
  - [ ] 7.2 Add lock icon component next to mandatory leave types in Admin Settings
  - [ ] 7.3 Add "Mandatory" or "Required" badge to mandatory type names
  - [ ] 7.4 Add tooltip on hover explaining why type cannot be deleted
  - [ ] 7.5 Disable delete button for mandatory types (visual + API validation)
  - [ ] 7.6 Add inline edit or modal for editing workspace default days
  - [ ] 7.7 Show current workspace default prominently in UI
  - [ ] 7.8 Verify all Admin Settings UI tests pass

- [ ] 8. Employee Edit Page - Balance Override UI
  - [ ] 8.1 Write tests for leave balance override UI
  - [ ] 8.2 Add "Leave Balance Overrides" section to employee edit page
  - [ ] 8.3 Display workspace default days for Urlop wypoczynkowy
  - [ ] 8.4 Add editable number input for custom employee balance
  - [ ] 8.5 Add checkbox/toggle for "Use custom balance"
  - [ ] 8.6 Implement form validation for custom days (0-50 range)
  - [ ] 8.7 Show current entitled days prominently
  - [ ] 8.8 Display balance source (workspace default vs. custom) in tooltip
  - [ ] 8.9 Verify all employee edit UI tests pass

- [ ] 9. Employee Dashboard - Balance Display Updates
  - [ ] 9.1 Write tests for balance display with overrides
  - [ ] 9.2 Update dashboard to display accurate balance using override if present
  - [ ] 9.3 Show "Unlimited (subject to approval)" messaging for Urlop bezpłatny
  - [ ] 9.4 Add tooltip or small text indicating balance source (default vs. override)
  - [ ] 9.5 Ensure balance display is consistent across Dashboard and Leave Request pages
  - [ ] 9.6 Verify all dashboard display tests pass

- [ ] 10. Update Invitation/Onboarding Flow for Mandatory Types
  - [ ] 10.1 Write tests for balance creation during signup with mandatory types
  - [ ] 10.2 Update `/app/api/auth/signup-with-invitation/route.ts` to include mandatory types in balance creation
  - [ ] 10.3 Update filter logic from `requires_balance` to `(requires_balance OR is_mandatory)`
  - [ ] 10.4 Update `/app/api/invitations/accept/route.ts` with same filtering logic
  - [ ] 10.5 Verify new employees get mandatory balances created automatically
  - [ ] 10.6 Verify all onboarding flow tests pass

- [ ] 11. Integration Testing and Verification
  - [ ] 11.1 Run Test Query #1 - Verify all orgs have 2 mandatory types
  - [ ] 11.2 Run Test Query #2 - Verify deletion prevention works
  - [ ] 11.3 Run Test Query #3 - Verify all active employees have mandatory balances (0% missing)
  - [ ] 11.4 Run Test Query #4 - Verify balance override behavior works correctly
  - [ ] 11.5 Run Test Query #5 - Verify backfill statistics match expectations
  - [ ] 11.6 Test full workflow: Admin edits workspace default → Employee sees updated balance
  - [ ] 11.7 Test full workflow: Admin sets custom employee balance → Employee sees override
  - [ ] 11.8 Test full workflow: Employee requests Urlop wypoczynkowy → Balance validation works
  - [ ] 11.9 Test full workflow: Employee requests Urlop bezpłatny → Unlimited validation works
  - [ ] 11.10 Test full workflow: New employee joins → Mandatory balances auto-created
  - [ ] 11.11 Verify all integration tests pass

- [ ] 12. Documentation and Code Cleanup
  - [ ] 12.1 Add code comments documenting mandatory type logic in key files
  - [ ] 12.2 Update API documentation with new endpoints and validation rules
  - [ ] 12.3 Document balance override hierarchy in `/lib/leave-balance-utils.ts`
  - [ ] 12.4 Add migration notes to project documentation
  - [ ] 12.5 Clean up any console.log statements used during development
  - [ ] 12.6 Review and update error messages for consistency and clarity
  - [ ] 12.7 Verify all tests still pass after cleanup
