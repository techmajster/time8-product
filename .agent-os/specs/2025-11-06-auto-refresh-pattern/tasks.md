# Spec Tasks

## Tasks

- [ ] 1. Create Unified Event System
  - [ ] 1.1 Create `lib/refetch-events.ts` with event constants and helper functions
  - [ ] 1.2 Verify implementation works with test dispatches

- [ ] 2. Update Team Management Page
  - [ ] 2.1 Create `hooks/use-team-mutations.ts` with delete/cancel/reactivate mutations
  - [ ] 2.2 Add event listener to TeamManagementClient
  - [ ] 2.3 Replace `window.location.reload()` and `router.refresh()` with event dispatch
  - [ ] 2.4 Test all team management actions trigger auto-refresh

- [ ] 3. Update Admin Settings Page
  - [ ] 3.1 Create `hooks/use-settings-mutations.ts` for leave type CRUD
  - [ ] 3.2 Add event listener to AdminSettingsClient
  - [ ] 3.3 Remove manual state updates in favor of refetch
  - [ ] 3.4 Test leave type changes trigger auto-refresh

- [ ] 4. Update Leave Types Manager
  - [ ] 4.1 Add event listener to LeaveTypesManager
  - [ ] 4.2 Replace Supabase client mutations with React Query hooks
  - [ ] 4.3 Test settings page auto-refresh

- [ ] 5. Verify Leave Mutations
  - [ ] 5.1 Review `use-leave-mutations.ts` for consistent event dispatch
  - [ ] 5.2 Add missing event dispatches if any
  - [ ] 5.3 Test leave requests page auto-refresh

- [ ] 6. Final Testing & Cleanup
  - [ ] 6.1 Search and remove any remaining `window.location.reload()` in mutation contexts
  - [ ] 6.2 Test all pages: /leave-requests, /admin/team-management, /admin/settings, /settings
  - [ ] 6.3 Verify no console errors or warnings
