# Spec Tasks

## Tasks

- [x] 1. Fix API Endpoint to Save approver_id
  - [x] 1.1 Add approver_id to request body destructuring
  - [x] 1.2 Add validation: Require approver_id (not NULL or empty)
  - [x] 1.3 Add validation: Manager cannot self-approve
  - [x] 1.4 Add validation: Admin can self-approve (allowed)
  - [x] 1.5 Add approver_id to user_organizations update logic
  - [x] 1.6 Test: Valid approver saves to database
  - [x] 1.7 Test: NULL approver returns validation error
  - [x] 1.8 Test: Manager self-approval returns validation error
  - [x] 1.9 Test: Admin self-approval succeeds

- [x] 2. Update Table Columns to Match Figma
  - [x] 2.1 Add getApproverName() helper function
  - [x] 2.2 Remove getManagerName() helper function
  - [x] 2.3 Update TableHeader: Remove "Pozostały urlop" column
  - [x] 2.4 Update TableHeader: Remove "Urlop NŻ" column
  - [x] 2.5 Update TableHeader: Change "Manager" to "Akceptujący"
  - [x] 2.6 Update TableHeader: Add "Status" column with text-center
  - [x] 2.7 Update TableRow: Remove vacation days cell
  - [x] 2.8 Update TableRow: Remove on-demand leave cell
  - [x] 2.9 Update TableRow: Change manager cell to approver cell
  - [x] 2.10 Update TableRow: Add status badge cell (green "Aktywny")
  - [x] 2.11 Update empty state colSpan from 6 to 5
  - [x] 2.12 Test: Table displays approver name correctly
  - [x] 2.13 Test: Table displays "Brak akceptującego" when NULL
  - [x] 2.14 Test: Status column shows green "Aktywny" badge

- [x] 3. Add Frontend Validation to EditEmployeeSheet
  - [x] 3.1 Add validation: Check approver_id not empty before submit
  - [x] 3.2 Add validation: Prevent manager self-approval
  - [x] 3.3 Add validation: Allow admin self-approval
  - [x] 3.4 Add required indicator (*) to approver label
  - [x] 3.5 Add required attribute to Select component
  - [x] 3.6 Test: Empty approver shows validation error
  - [x] 3.7 Test: Manager self-approval shows validation error
  - [x] 3.8 Test: Admin self-approval succeeds
  - [x] 3.9 Test: Valid approver passes validation

- [x] 4. Optimize Performance (Fix N+1 Queries)
  - [x] 4.1 Extract unique manager IDs from teams array
  - [x] 4.2 Batch query all team managers using IN clause
  - [x] 4.3 Build manager lookup dictionary (id → profile)
  - [x] 4.4 Batch query team member counts
  - [x] 4.5 Build member count dictionary (team_id → count)
  - [x] 4.6 Replace individual queries with dictionary lookups
  - [x] 4.7 Test: Query count reduced from ~41 to 3 (for 20 teams)
  - [x] 4.8 Test: Page load time under 1 second with 20+ teams
  - [x] 4.9 Test: Data accuracy matches previous implementation

- [x] 5. End-to-End Testing
  - [x] 5.1 Test: Edit employee → Set approver → Save → Refresh → Verify persisted
  - [x] 5.2 Test: Edit employee → Clear approver → Save → See validation error
  - [x] 5.3 Test: Edit manager → Set self as approver → Save → See validation error
  - [x] 5.4 Test: Edit admin → Set self as approver → Save → Verify succeeds
  - [x] 5.5 Test: Table shows correct approver in "Akceptujący" column
  - [x] 5.6 Test: Table shows "Brak akceptującego" for NULL approvers
  - [x] 5.7 Test: Table shows green "Aktywny" badge in Status column
  - [x] 5.8 Test: Leave balance columns not present in table
  - [x] 5.9 Test: Change employee team → Approver stays same (not reset)
  - [x] 5.10 Test: Delete approver → Table shows "Brak akceptującego"
