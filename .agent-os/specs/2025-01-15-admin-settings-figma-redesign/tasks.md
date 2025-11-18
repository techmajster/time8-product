# Spec Tasks

## Tasks

- [x] 1. Database Migration and Schema Updates
  - [x] 1.1 Create migration file to remove deprecated columns (slug, google_domain, require_google_domain, logo_url)
  - [x] 1.2 Add work_start_time and work_end_time columns to organizations table (shift_start_time/shift_end_time already exist)
  - [x] 1.3 Run migration on development database and verify
  - [x] 1.4 Update TypeScript Organization type to remove deprecated fields
  - [x] 1.5 Verify all tests pass after type updates (fixed 23 test files that referenced deprecated columns)

- [x] 2. API Endpoint Updates
  - [x] 2.1 Update PUT /api/admin/settings/organization to reject deprecated fields
  - [x] 2.2 Remove slug uniqueness validation logic
  - [x] 2.3 Update database query to exclude deprecated fields
  - [x] 2.4 Add validation error responses for deprecated fields
  - [x] 2.5 Update API tests to cover new validation rules
  - [x] 2.6 Verify endpoint returns correct responses

- [x] 3. AdminSettingsClient Tab Structure Refactoring
  - [x] 3.1 Update tab definitions to only 4 tabs (Ogólne, Tryb pracy, Urlopy, Rozliczenia)
  - [x] 3.2 Remove tab state for Calendar Visibility, Workspace, Notifications, Additional Rules
  - [x] 3.3 Update tab navigation rendering to show only 4 tabs
  - [x] 3.4 Remove unused tab content sections
  - [x] 3.5 Verify tab navigation works correctly

- [x] 4. Ogólne Tab Updates
  - [x] 4.1 Remove logo upload UI components (file input, preview, upload button)
  - [x] 4.2 Remove organization slug input field from EditOrganizationSheet
  - [x] 4.3 Delete EditGoogleWorkspaceSheet component file
  - [x] 4.4 Remove Google Workspace integration card from Ogólne tab
  - [x] 4.5 Add country flag icons to holiday calendar dropdown
  - [x] 4.6 Add country flag icons to language dropdown
  - [x] 4.7 Add helper text under language selector
  - [x] 4.8 Update EditOrganizationSheet validation to exclude deprecated fields
  - [x] 4.9 Test Ogólne tab renders correctly with new layout

- [x] 5. Create Working Days Grid Component (Tryb pracy Tab)
  - [x] 5.1 Create WorkingDaysGrid.tsx component file
  - [x] 5.2 Implement 7-day horizontal checkbox grid layout
  - [x] 5.3 Add visual states: purple background for active days (Mon-Fri), gray for inactive (Sat-Sun)
  - [x] 5.4 Add checkmark icons for active days, X icons for inactive days
  - [x] 5.5 Apply 50% opacity to checkbox icons
  - [x] 5.6 Add "Wolne święta państwowe" checkbox with description
  - [x] 5.7 Ensure all elements are visual-only (no state management)
  - [x] 5.8 Test component renders correctly on different screen sizes

- [x] 6. Create Work Hours Display Component (Tryb pracy Tab)
  - [x] 6.1 Create WorkHoursDisplay.tsx component file
  - [x] 6.2 Implement time range selector layout (Od/do inline format)
  - [x] 6.3 Add disabled time dropdowns showing 9:00 and 17:00
  - [x] 6.4 Apply 50% opacity and disabled styling
  - [x] 6.5 Add "Edytuj" button (visual-only, no functionality)
  - [x] 6.6 Add section title "Praca codzienna" with subtitle
  - [x] 6.7 Test component matches Figma design

- [x] 7. Integrate Tryb pracy Tab Components
  - [x] 7.1 Import WorkingDaysGrid and WorkHoursDisplay components
  - [x] 7.2 Replace existing WorkModeSettings with new components
  - [x] 7.3 Add horizontal separator between Dni pracujące and Godziny pracy sections
  - [x] 7.4 Apply correct card styling and spacing (24px gaps)
  - [X] 7.5 Test Tryb pracy tab renders with all visual elements

- [x] 8. Urlopy Tab Simplification
  - [x] 8.1 Remove nested tab navigation (remove FigmaTabs for nested tabs)
  - [x] 8.2 Delete EditLeavePoliciesSheet component file
  - [x] 8.3 Remove "Polityki urlopowe" tab content
  - [x] 8.4 Update leave types table to be main tab content
  - [x] 8.5 Add lock icons to mandatory leave types in table
  - [x] 8.6 Update badge styling to match Figma (purple "Świąt" badges)
  - [x] 8.7 Update action buttons: "Utwórz domyślne rodzaje urlopów" (outline), "+ Dodaj rodzaj urlopu" (primary)
  - [x] 8.8 Verify all existing leave type functionality still works (create, edit, delete)
  - [x] 8.9 Test leave types table displays correctly

- [x] 9. Remove Unused Components and Files
  - [x] 9.1 Delete EditGoogleWorkspaceSheet.tsx
  - [x] 9.2 Delete EditLeavePoliciesSheet.tsx
  - [x] 9.3 Remove calendar visibility related components (if standalone files exist)
  - [x] 9.4 Remove workspace deletion related components (if standalone)
  - [x] 9.5 Clean up unused imports in AdminSettingsClient
  - [X] 9.6 Remove unused component tests

- [x] 10. Update Page Data Fetching
  - [x] 10.1 Remove Google Workspace related data queries from page.tsx
  - [x] 10.2 Remove calendar visibility data fetching (if no longer needed)
  - [x] 10.3 Keep leave types, users, teams, subscription data fetching unchanged
  - [x] 10.4 Verify page loads efficiently with reduced queries

- [x] 11. Translation Updates
  - [x] 11.1 Add/update Polish translations for new UI text
  - [x] 11.2 Add helper text for language selector
  - [x] 11.3 Add translations for working days and work hours sections
  - [x] 11.4 Remove translations for deprecated features
  - [x] 11.5 Verify all text displays correctly in Polish

- [ ] 12. Component Testing Updates
  - [ ] 12.1 Update AdminSettingsClient tests for 4-tab structure
  - [ ] 12.2 Add tests for WorkingDaysGrid component
  - [ ] 12.3 Add tests for WorkHoursDisplay component
  - [ ] 12.4 Update Ogólne tab tests (removed fields)
  - [ ] 12.5 Update Urlopy tab tests (no nested tabs)
  - [ ] 12.6 Remove tests for deleted components
  - [ ] 12.7 Verify all tests pass

- [ ] 13. Integration Testing and QA
  - [ ] 13.1 Test complete flow: navigate to admin settings, switch between all 4 tabs
  - [ ] 13.2 Test Ogólne tab: edit organization name, change admin, update locale/calendar
  - [ ] 13.3 Test Tryb pracy tab: verify visual display of working days and hours
  - [ ] 13.4 Test Urlopy tab: create, edit, delete leave types
  - [ ] 13.5 Test Rozliczenia tab: verify unchanged functionality
  - [ ] 13.6 Test API endpoint rejects deprecated fields with proper error messages
  - [ ] 13.7 Verify no console errors or warnings
  - [ ] 13.8 Test responsive design on mobile and tablet
  - [ ] 13.9 Verify all existing leave types data is preserved
  - [ ] 13.10 Run full test suite and verify all tests pass
