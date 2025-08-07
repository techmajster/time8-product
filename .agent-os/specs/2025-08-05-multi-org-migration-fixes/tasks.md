# Spec Tasks

## Tasks

- [ ] 1. RLS Policy Audit & Resolution
  - [ ] 1.1 Write tests to verify data access across all user roles
  - [ ] 1.2 Audit existing RLS policies in Supabase for multi-org compliance
  - [ ] 1.3 Identify and document all policy violations causing data fetch failures
  - [ ] 1.4 Fix RLS policies to properly scope organization-based access
  - [ ] 1.5 Test admin panel data loading with corrected policies
  - [ ] 1.6 Verify all tests pass for multi-tenant data isolation

- [ ] 2. Admin Panel Function Restoration  
  - [ ] 2.1 Write tests for employee editing and team management workflows
  - [ ] 2.2 Fix employee editing functionality for admin users
  - [ ] 2.3 Restore team creation and management operations
  - [ ] 2.4 Fix manager assignment workflows in team interfaces
  - [ ] 2.5 Replace native browser dialogs with custom shadcn/ui components
  - [ ] 2.6 Verify all admin panel operations work without errors

- [ ] 3. Data Display & Query Fixes
  - [ ] 3.1 Write tests for dynamic data loading vs hardcoded values
  - [ ] 3.2 Replace hardcoded leave balance displays with database queries
  - [ ] 3.3 Fix team member selection dropdowns and manager selection
  - [ ] 3.4 Restore proper user role and permission data loading
  - [ ] 3.5 Fix empty state handling for teams table and data lists
  - [ ] 3.6 Verify all data displays show current database values

- [ ] 4. UI Component & Error Handling
  - [ ] 4.1 Write tests for UI component consistency and error states
  - [ ] 4.2 Standardize all confirmation dialogs to use shadcn/ui Dialog
  - [ ] 4.3 Implement proper empty state components for data tables
  - [ ] 4.4 Fix form submission feedback and success state handling
  - [ ] 4.5 Ensure consistent error messaging across all interfaces
  - [ ] 4.6 Verify all UI components render correctly with proper data

- [ ] 5. Integration Testing & Validation
  - [ ] 5.1 Write comprehensive integration tests for admin workflows
  - [ ] 5.2 Test all user role scenarios (admin, manager, employee)
  - [ ] 5.3 Validate API endpoint responses match frontend expectations
  - [ ] 5.4 Test organization boundary enforcement across all features
  - [ ] 5.5 Verify performance of complex multi-org queries
  - [ ] 5.6 Confirm all regression issues are resolved