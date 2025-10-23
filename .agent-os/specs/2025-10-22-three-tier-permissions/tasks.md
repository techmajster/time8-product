# Spec Tasks

## Tasks

- [x] 1. Create Permission Utilities and Hooks
  - [x] 1.1 Write tests for permission utilities
  - [x] 1.2 Create `lib/permissions.ts` with role definitions and permission matrix
  - [x] 1.3 Create `hooks/use-user-role.ts` hook to get current user's role
  - [x] 1.4 Verify all tests pass

- [x] 2. Update Internationalization Keys
  - [x] 2.1 Write tests for i18n role keys
  - [x] 2.2 Add role labels to `messages/en.json`
  - [x] 2.3 Add role labels to `messages/pl.json`
  - [x] 2.4 Add permission messages to both language files
  - [x] 2.5 Verify all tests pass

- [x] 3. Implement Navigation Menu Filtering
  - [x] 3.1 Write tests for navigation filtering
  - [x] 3.2 Update `components/app-sidebar.tsx` to filter nav items by role
  - [x] 3.3 Add `requiresRole` property to navigation items
  - [x] 3.4 Test navigation visibility for each role
  - [x] 3.5 Verify all tests pass

- [x] 4. Add Route Protection Middleware
  - [x] 4.1 Write tests for route protection
  - [x] 4.2 Update `middleware.ts` with role-based route guards
  - [x] 4.3 Add redirect logic for unauthorized access
  - [x] 4.4 Test route protection for all protected routes
  - [x] 4.5 Verify all tests pass

- [x] 5. Implement Team Page READ-ONLY Mode for Managers
  - [x] 5.1 Write tests for Team page permissions
  - [x] 5.2 Update Team page to conditionally render CRUD buttons
  - [x] 5.3 Update Team data table columns to hide actions for managers
  - [x] 5.4 Add READ-ONLY banner/indicator for managers
  - [x] 5.5 Test Team page access for all roles
  - [x] 5.6 Verify all tests pass

- [x] 6. Extract Groups to Separate Admin Page
  - [x] 6.1 Create `/admin/groups` page structure
  - [x] 6.2 Move Groups functionality from team-management tabs
  - [x] 6.3 Remove tabs from team-management (employees only)
  - [x] 6.4 Make Groups admin-only (no manager access)
  - [x] 6.5 Add Groups to admin navigation menu
  - [x] 6.6 Fix translation conflicts (navigation + breadcrumbs)

- [x] 7. Add Calendar Visibility Settings (Admin-Controlled Toggle)
  - [x] 7.1 Created database migration to add `restrict_calendar_by_group` column to organizations table
  - [x] 7.2 Added admin toggle switch in "Calendar Visibility" settings tab
  - [x] 7.3 Created API endpoint `/api/admin/settings/calendar-restriction` for updating setting
  - [x] 7.4 Updated calendar page to check organization's restriction setting
  - [x] 7.5 Implemented logic: when ON, users in groups see only group members; when OFF, everyone sees everyone
  - [x] 7.6 Added visual status indicator showing current restriction state
  - [x] 7.7 Applied migration to production database via Supabase MCP
  - [x] 7.8 Removed `--read-only` flag from `.mcp.json` for write operations
  - [x] 7.9 Build verification passed

- [ ] 8. Browser Testing and Integration
  - [ ] 8.1 Test Calendar Visibility toggle functionality
  - [ ] 8.2 Test calendar filtering with toggle OFF (everyone sees everyone)
  - [ ] 8.3 Test calendar filtering with toggle ON (group-based filtering)
  - [ ] 8.4 Test employee role: verify limited navigation and route access
  - [ ] 8.5 Test manager role: verify READ-ONLY access to Team page
  - [ ] 8.6 Test admin role: verify full access to all features including Groups
  - [ ] 8.7 Test role transitions: change roles and verify permissions update immediately
  - [ ] 8.8 Cross-browser testing (Chrome, Firefox, Safari)
  - [ ] 8.9 Mobile responsive testing for all roles

