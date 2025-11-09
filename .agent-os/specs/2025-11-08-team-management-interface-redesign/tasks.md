# Spec Tasks

## Tasks

- [x] 1. Database Migration - Add approver_id Field
  - [x] 1.1 Create migration file `add_approver_id_to_user_organizations.sql`
  - [x] 1.2 Add `approver_id UUID` column to `user_organizations` table
  - [x] 1.3 Add foreign key constraint referencing `profiles(id)` with ON DELETE SET NULL
  - [x] 1.4 Create indexes: `idx_user_organizations_approver_id` and `idx_user_organizations_org_approver`
  - [x] 1.5 Run migration on development database
  - [x] 1.6 Verify migration success and column creation

- [x] 2. Phase 1: Foundation - Tab Navigation System
  - [x] 2.1 Create Tabs UI component or use existing with three tabs
  - [x] 2.2 Add tab state management in TeamManagementClient (`activeTab` state)
  - [x] 2.3 Implement tab content conditional rendering
  - [x] 2.4 Style tabs per Figma (active state highlighting)
  - [x] 2.5 Verify tab switching works correctly

- [x] 3. Phase 1: Foundation - Restructure Page for Tabs
  - [x] 3.1 Wrap TeamManagementClient content in tab container
  - [x] 3.2 Move active employees table to Aktywni tab content
  - [x] 3.3 Move PendingInvitationsSection to Zaproszeni tab content
  - [x] 3.4 Move ArchivedUsersSection to Zarchiwizowani tab content
  - [x] 3.5 Verify each tab displays correct content

- [x] 4. Phase 1: Foundation - Group Filter Component
  - [x] 4.1 Extract group filter chips to reusable component
  - [x] 4.2 Add props: teams list, onFilterChange callback, activeFilter state
  - [x] 4.3 Position below tabs on all three tab views
  - [x] 4.4 Implement filter logic for each tab
  - [x] 4.5 Verify filtering works in all three tabs

- [x] 5. Phase 1: Foundation - Update Page Header
  - [x] 5.1 Add breadcrumb navigation if not present
  - [x] 5.2 Rename "Dodaj pracownika" → "Zaproś nowych użytkowników"
  - [x] 5.3 Update button sizes per Figma specifications
  - [x] 5.4 Verify header matches Figma design

- [x] 6. Phase 2: Dialogs - Cancel Invitation Confirmation
  - [x] 6.1 Create CancelInvitationDialog component using AlertDialog
  - [x] 6.2 Add title: "Czy na pewno chcesz anulować zaproszenie?"
  - [x] 6.3 Add description: "Zaproszona osoba nie będzie mogła dołączyć do Twojego workspace"
  - [x] 6.4 Add buttons: "Tak, anuluj zaproszenie" (outline) + "Zamknij" (primary)
  - [x] 6.5 Wire to cancel action in invitations dropdown menu
  - [x] 6.6 Implement cancel API call on confirmation
  - [x] 6.7 Verify dialog shows and cancels invitation correctly

- [x] 7. Phase 2: Dialogs - Update Archive User Dialog
  - [x] 7.1 Update dialog title to "Czy na pewno chcesz dezaktywować użytkownika?"
  - [x] 7.2 Update description to "Użytkownik utraci dostęp do systemu oraz nie będzie uwzględniany w planowaniu grafiku"
  - [x] 7.3 Update button text to "Tak, archiwizuj użytkownika"
  - [x] 7.4 Remove "nieodwracalna" warning text
  - [x] 7.5 Verify dialog matches Figma design

- [x] 8. Phase 3: Edit Employee Sheet - Create Base Component
  - [x] 8.1 Create file `app/admin/team-management/components/EditEmployeeSheet.tsx`
  - [x] 8.2 Set up Sheet component with size="content" (560px)
  - [x] 8.3 Add SheetTitle: "Szczegóły użytkownika"
  - [x] 8.4 Create form state management (useState for form fields)
  - [x] 8.5 Add loading state for form submission
  - [x] 8.6 Verify sheet opens and closes correctly

- [x] 9. Phase 3: Edit Employee Sheet - Section 1 (User Data)
  - [x] 9.1 Add Status badge component (green "Aktywny")
  - [x] 9.2 Add Input: Nazwa wyświetlana (full_name)
  - [x] 9.3 Add Input: Adres email (email)
  - [x] 9.4 Add DatePickerWithDropdowns: Data urodzenia (birth_date)
  - [x] 9.5 Add Select: Rola (role - employee/manager/admin)
  - [x] 9.6 Add Select: Grupa (team_id - dropdown instead of radio group)
  - [x] 9.7 Verify all fields load existing data correctly

- [x] 10. Phase 3: Edit Employee Sheet - Section 2 (Leave Balances)
  - [x] 10.1 Create leave types table with 3 columns
  - [x] 10.2 Add Column 1: Rodzaj urlopu (leave type name)
  - [x] 10.3 Add Column 2: Liczba dni na start (entitled_days input)
  - [x] 10.4 Add Column 3: "Domyślne" button with RefreshCcw icon
  - [x] 10.5 Filter to show only `requires_balance = true` leave types
  - [x] 10.6 Implement "Domyślne" button logic (reset to default days)
  - [x] 10.7 Remove "Wykorzystanych" column
  - [x] 10.8 Verify table displays correctly

- [x] 11. Phase 3: Edit Employee Sheet - Section 3 (Leave Approver)
  - [x] 11.1 Add Select dropdown for leave approver
  - [x] 11.2 Fetch managers/admins list (`role IN ('manager', 'admin')`)
  - [x] 11.3 Display approver name and email in dropdown options
  - [x] 11.4 Make field optional (nullable)
  - [x] 11.5 Verify dropdown loads and selects correctly

- [x] 12. Phase 3: Edit Employee Sheet - Form Submission
  - [x] 12.1 Implement form validation (required: full_name, email)
  - [x] 12.2 Create PUT request to `/api/employees/[id]`
  - [x] 12.3 Include approver_id in request body
  - [x] 12.4 Include leave balance overrides (entitled_days only, no used_days)
  - [x] 12.5 Handle success response (close sheet, show toast)
  - [x] 12.6 Handle error response (show error message)
  - [x] 12.7 Verify form submits and saves correctly

- [x] 13. Phase 3: Edit Employee Sheet - Integration
  - [x] 13.1 Add sheet state to TeamManagementClient: `isEditSheetOpen`, `selectedEmployee`
  - [x] 13.2 Replace `router.push()` with `setIsEditSheetOpen(true)` in edit action
  - [x] 13.3 Pass selected employee data to EditEmployeeSheet
  - [x] 13.4 Pass teams, leaveTypes, and approvers data to sheet
  - [x] 13.5 Implement sheet close handler
  - [x] 13.6 Trigger data refresh after successful save
  - [x] 13.7 Verify sheet integration works end-to-end

- [x] 14. Phase 4: Invitations Tab - Simplify Table Structure
  - [x] 14.1 Update PendingInvitationsSection table columns
  - [x] 14.2 Column 1: Imię i nazwisko (name + email stacked)
  - [x] 14.3 Column 2: Akceptujący (approver name - NEW)
  - [x] 14.4 Column 3: Grupa (team name)
  - [x] 14.5 Column 4: Status (purple "Zaproszony" badge - NEW)
  - [x] 14.6 Column 5: Akcja (three-dot menu)
  - [x] 14.7 Remove columns: Zespół, Zaproszony przez, Rola, Wygasa
  - [x] 14.8 Remove Card/CardContent wrapper to match Aktywni tab
  - [x] 14.9 Verify table displays correctly with new structure

- [x] 15. Phase 4: Invitations Tab - Add Pagination
  - [x] 15.1 Add pagination state (currentPage, pageSize = 10, totalPages)
  - [x] 15.2 Display "X z Y wierszy" text on left
  - [x] 15.3 Add "Wierszy na stronie" dropdown in center (10/20/50/100)
  - [x] 15.4 Add "Strona X z Y" text with 4 navigation buttons (first/prev/next/last)
  - [x] 15.5 Implement pagination logic (slice data array)
  - [x] 15.6 Layout pagination controls with 3 sections (left, center, right)
  - [x] 15.7 Verify pagination works correctly

- [x] 16. Phase 4: Invitations Tab - Update Empty States & Filters
  - [x] 16.1 Remove "Oczekujące zaproszenia" heading
  - [x] 16.2 Add group filter tabs to PendingInvitationsSection (Wszyscy + team names)
  - [x] 16.3 Implement filter logic for invitations by team
  - [x] 16.4 Pass teams prop to PendingInvitationsSection
  - [x] 16.5 Remove duplicate filter tabs from TeamManagementClient
  - [x] 16.6 Verify filtering works correctly

- [x] 17. Phase 5: API Updates - Employee Update Endpoint
  - [x] 17.1 Review `/api/employees/[id]/route.ts` PUT handler
  - [x] 17.2 Add `approver_id` field handling in request body
  - [x] 17.3 Update `user_organizations.approver_id` in database
  - [x] 17.4 Add validation: approver must be manager/admin role
  - [x] 17.5 Remove `used_days` from leave balance updates
  - [x] 17.6 Return updated employee data in response
  - [x] 17.7 Verify API endpoint works correctly

- [x] 18. Phase 5: Data Fetching - Update Server Component
  - [x] 18.1 Update `app/admin/team-management/page.tsx`
  - [x] 18.2 Add query to fetch managers/admins list for approver dropdown
  - [x] 18.3 Pass approvers data to TeamManagementClient
  - [x] 18.4 Ensure all required data is fetched server-side
  - [x] 18.5 Verify data flows correctly to components

- [x] 19. Phase 5: Cleanup - Remove Old Full-Page Route
  - [x] 19.1 Delete directory `app/admin/team-management/edit-employee/[id]/`
  - [x] 19.2 Delete file `app/admin/team-management/edit-employee/components/EditEmployeePage.tsx`
  - [x] 19.3 Search codebase for references to old edit page route
  - [x] 19.4 Remove or update any direct links
  - [x] 19.5 Verify no broken links or imports

- [x] 20. Phase 5: Testing - Comprehensive End-to-End
  - [x] 20.1 Test tab navigation (switch between all three tabs)
  - [x] 20.2 Test group filtering on each tab
  - [x] 20.3 Test opening edit sheet from active employees table
  - [x] 20.4 Test all form fields in edit sheet (load, edit, save)
  - [x] 20.5 Test leave approver selection and save
  - [x] 20.6 Test "Domyślne" reset button for leave types
  - [x] 20.7 Test cancel invitation confirmation dialog flow
  - [x] 20.8 Test archive user dialog with new messaging
  - [x] 20.9 Test invitations table with pagination
  - [x] 20.10 Test data refresh after mutations
  - [x] 20.11 Test responsive design on different screen sizes
  - [x] 20.12 Test keyboard navigation and accessibility
  - [x] 20.13 Verify all Figma designs match pixel-perfect
  - [x] 20.14 Verify all tests pass

- [x] 21. Phase 5: Table Unification
  - [x] 21.1 Standardize column order across Aktywni/Zaproszeni/Zarchiwizowani tabs
  - [x] 21.2 Update PendingInvitationsSection: swap Grupa/Akceptujący columns
  - [x] 21.3 Update column widths: Grupa from min-w-40 to min-w-64 (all tabs)
  - [x] 21.4 Update header text: "Pracownik" → "Imię i nazwisko", "Akcja" → "Akcje"
  - [x] 21.5 Remove "Zarchiwizowani użytkownicy" heading from ArchivedUsersSection
  - [x] 21.6 Fix TypeScript LeaveBalance interface mismatch (add entitled_days)
  - [x] 21.7 Fix import path in AdminSettingsClient.tsx
  - [x] 21.8 Verify all tables match specification
