# Spec Tasks

## Tasks

- [x] 1. Database Schema Implementation ✅
  - [x] 1.1 Write tests for mandatory leave types schema changes
  - [x] 1.2 Create migration file `20251023000000_add_mandatory_leave_types.sql`
  - [x] 1.3 Add `is_mandatory` column to `leave_types` table with index
  - [x] 1.4 Create `ensure_mandatory_leave_types()` function
  - [x] 1.5 Create `backfill_mandatory_leave_balances()` function for existing employees
  - [x] 1.6 Create deletion prevention trigger `prevent_mandatory_leave_type_deletion()`
  - [x] 1.7 Backfill existing Urlop wypoczynkowy and Urlop bezpłatny as mandatory
  - [x] 1.8 Run ensure function to create missing mandatory types for all orgs
  - [x] 1.9 Run backfill function to create missing balances for existing employees
  - [x] 1.10 Run all database schema tests and verify migration success

- [x] 2. API Endpoint Updates for Deletion Prevention ✅
  - [x] 2.1 Database trigger handles deletion prevention
  - [x] 2.2 Trigger checks `is_mandatory` flag before DELETE
  - [x] 2.3 Returns descriptive PostgreSQL error for mandatory type deletion
  - [x] 2.4 UI prevents deletion attempts with disabled buttons
  - [x] 2.5 All deletion prevention working correctly

- [x] 3. API Endpoint Updates for Leave Type Editing ✅
  - [x] 3.1 Database-level protection implemented
  - [x] 3.2 Admin can edit `days_per_year` via Admin Settings
  - [x] 3.3 `is_mandatory` flag protected at database level
  - [x] 3.4 UI shows lock icons for mandatory types
  - [x] 3.5 All leave type editing working correctly

- [x] 4. API Updates for Leave Balances with Override Support ✅
  - [x] 4.1 `/api/employees/[id]/leave-balances` returns override info
  - [x] 4.2 Returns `is_override`, `workspace_default`, `effective_entitled_days`
  - [x] 4.3 Balance calculations prioritize `entitled_days` over defaults
  - [x] 4.4 Override hierarchy properly implemented
  - [x] 4.5 All balance API endpoints enhanced

- [x] 5. Employee Edit API for Balance Overrides ✅
  - [x] 5.1 PUT `/api/employees/[id]` accepts `leave_balance_overrides` array
  - [x] 5.2 Upsert logic implemented with conflict resolution
  - [x] 5.3 Validation for entitled_days range (0-50) implemented
  - [x] 5.4 Returns audit trail with previous and new values
  - [x] 5.5 All employee edit API working correctly

- [x] 6. Leave Request Validation Updates ✅
  - [x] 6.1 `hasAvailableBalance()` checks `requires_balance` flag
  - [x] 6.2 Returns `is_unlimited: true` for unlimited leave types
  - [x] 6.3 Urlop bezpłatny (unpaid leave) handled as unlimited
  - [x] 6.4 Balance validation skipped for unlimited types
  - [x] 6.5 All leave request validation working correctly

- [x] 7. Admin Settings UI - Leave Types Management ✅
  - [x] 7.1 Write tests for mandatory leave type UI indicators
  - [x] 7.2 Add lock icon component next to mandatory leave types in Admin Settings
  - [x] 7.3 Add "Obowiązkowy" badge to mandatory type names
  - [x] 7.4 Add tooltip on hover explaining why type cannot be deleted
  - [x] 7.5 Disable delete button for mandatory types (visual + trigger validation)
  - [x] 7.6 Deletion logic updated - only checks `is_mandatory` flag, CASCADE for others
  - [x] 7.7 All other leave types deletable with CASCADE (no balance/request checks)
  - [x] 7.8 Visual indicators working correctly in production

- [x] 8. Employee Edit Page - Balance Override UI ✅
  - [x] 8.1 Existing leave balances table already in UI
  - [x] 8.2 Wired up leave_balance_overrides to API submit
  - [x] 8.3 Page loads existing balances from database
  - [x] 8.4 Editable number inputs for custom entitled_days working
  - [x] 8.5 Form submits overrides to PUT `/api/employees/[id]`
  - [x] 8.6 API validates 0-50 range
  - [x] 8.7 Success message shows count of updated balances
  - [x] 8.8 All employee edit UI fully functional

- [x] 9. Employee Dashboard - Balance Display Updates ✅
  - [x] 9.1 Dashboard loads workspace default days_per_year
  - [x] 9.2 Calculates if balance is override (custom entitled_days)
  - [x] 9.3 Shows "Niestandardowe" badge for custom balances
  - [x] 9.4 Tooltip shows workspace default value for reference
  - [x] 9.5 Balance display enhanced with override indicators
  - [x] 9.6 All dashboard display working correctly

- [x] 10. Update Invitation/Onboarding Flow for Mandatory Types ✅
  - [x] 10.1 Write tests for balance creation during signup with mandatory types
  - [x] 10.2 Update `/app/api/auth/signup-with-invitation/route.ts` to include mandatory types in balance creation
  - [x] 10.3 Update filter logic from `requires_balance` to `(requires_balance OR is_mandatory)`
  - [x] 10.4 Update `/app/api/invitations/accept/route.ts` with same filtering logic
  - [x] 10.5 Verify new employees get mandatory balances created automatically
  - [x] 10.6 All onboarding flow tests verified

- [x] 11. Integration Testing and Verification ✅
  - [x] 11.1 Run Test Query #1 - Verify all orgs have 2 mandatory types (5/5 orgs ✅)
  - [x] 11.2 Run Test Query #2 - Verify deletion prevention works (Trigger blocking deletion ✅)
  - [x] 11.3 Run Test Query #3 - Verify all active employees have mandatory balances (100% coverage ✅)
  - [x] 11.4 Run Test Query #4 - Verify balance override behavior works correctly (Override system working ✅)
  - [x] 11.5 Run Test Query #5 - Verify unlimited leave validation (Urlop bezpłatny unlimited ✅)
  - [x] 11.6 Created integration test scripts in `__tests__/integration/`
  - [x] 11.7 Generated comprehensive test results report (`INTEGRATION_TEST_RESULTS.md`)
  - [x] 11.8 All database-level tests passing (100% success rate)

- [x] 12. Multi-Workspace Bug Fix (CRITICAL) ✅
  - [x] 12.1 Fixed `/api/employees/[id]/organization` to respect `active-organization-id` cookie
  - [x] 12.2 Fixed `/api/employees/[id]/leave-balances` to respect `active-organization-id` cookie
  - [x] 12.3 AddAbsenceSheet now shows correct leave types for selected workspace
  - [x] 12.4 Multi-org admins can now manage users across all their workspaces
  - [x] 12.5 Added Multi-Workspace Isolation Audit task to roadmap Phase 2
  - [x] 12.6 Documented 30+ API routes needing similar cookie checks

- [x] 13. Documentation and Code Cleanup ✅
  - [x] 13.1 Added comprehensive JSDoc comments to leave validation functions
  - [x] 13.2 Documented balance override hierarchy in API endpoints
  - [x] 13.3 Explained unlimited leave type handling (Urlop bezpłatny)
  - [x] 13.4 Created integration test results documentation (`INTEGRATION_TEST_RESULTS.md`)
  - [x] 13.5 Cleaned up development console.log statements from API routes
  - [x] 13.6 Kept essential error logging and removed debug logs
  - [x] 13.7 All integration tests passing (verified in Task 11)
