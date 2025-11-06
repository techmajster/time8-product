# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-11-06-auto-refresh-pattern/spec.md

## Technical Requirements

### 1. Unified Event System (`lib/refetch-events.ts`)

Create a centralized event system for managing data refetch operations:

- **Event Constants**: Define string constants for each refetch event type:
  - `REFETCH_LEAVE_REQUESTS` - for leave requests page
  - `REFETCH_TEAM_MANAGEMENT` - for team management page
  - `REFETCH_SETTINGS` - for admin settings and user settings pages

- **Helper Functions**:
  - `dispatchRefetchEvent(eventName: string)` - dispatches custom DOM event
  - Individual typed helpers like `refetchLeaveRequests()`, `refetchTeamManagement()`, `refetchSettings()`

- **Implementation**: Use browser's `CustomEvent` API with `window.dispatchEvent()`

### 2. Team Management Page Updates

**File**: [app/admin/team-management/components/TeamManagementClient.tsx](app/admin/team-management/components/TeamManagementClient.tsx)

- Add `useEffect` hook to listen for `REFETCH_TEAM_MANAGEMENT` events
- On event, call React Query's `refetch()` method to reload data
- Remove all `window.location.reload()` calls
- Remove all `router.refresh()` calls

**New Hook**: [hooks/use-team-mutations.ts](hooks/use-team-mutations.ts)

- Create React Query mutations for:
  - `useDeleteAccount` - delete user account
  - `useCancelInvitation` - cancel pending invitation
  - `useReactivateUser` - reactivate deactivated user
- Each mutation's `onSuccess` callback dispatches `REFETCH_TEAM_MANAGEMENT` event
- Use 300ms delay before closing sheets/dialogs (consistent with leave mutations)

### 3. Admin Settings Page Updates

**File**: [app/admin/settings/components/AdminSettingsClient.tsx](app/admin/settings/components/AdminSettingsClient.tsx)

- Add `useEffect` hook to listen for `REFETCH_SETTINGS` events
- On event, call React Query's `refetch()` method
- Remove manual state updates in favor of automatic refetch

**New Hook**: [hooks/use-settings-mutations.ts](hooks/use-settings-mutations.ts)

- Create React Query mutations for leave type operations:
  - `useCreateLeaveType` - create new leave type
  - `useUpdateLeaveType` - edit existing leave type
  - `useDeleteLeaveType` - delete leave type
- Each mutation's `onSuccess` callback dispatches `REFETCH_SETTINGS` event
- Use 300ms delay before closing dialogs

### 4. Leave Types Manager Updates

**File**: [app/settings/components/LeaveTypesManager.tsx](app/settings/components/LeaveTypesManager.tsx)

- Add `useEffect` hook to listen for `REFETCH_SETTINGS` events
- Replace direct Supabase client mutations with hooks from `use-settings-mutations.ts`
- Ensure data refetch is triggered by events, not manual refetch calls

### 5. Leave Mutations Event Integration

**File**: [hooks/use-leave-mutations.ts](hooks/use-leave-mutations.ts)

- Verify all existing mutations dispatch `REFETCH_LEAVE_REQUESTS` event
- Ensure consistent 300ms delay before closing sheets/dialogs
- Add event dispatch to any mutations missing it

### 6. Event Listener Pattern

All client components that need auto-refresh should follow this pattern:

```typescript
useEffect(() => {
  const handleRefetch = () => {
    refetch()
  }

  window.addEventListener('refetch-event-name', handleRefetch)
  return () => window.removeEventListener('refetch-event-name', handleRefetch)
}, [refetch])
```

### 7. Mutation Hook Pattern

All mutation hooks should follow this pattern:

```typescript
const mutation = useMutation({
  mutationFn: async (data) => {
    // perform mutation
  },
  onSuccess: () => {
    toast.success('Success message')
    dispatchRefetchEvent(EVENT_NAME)
    setTimeout(() => {
      setOpen(false) // close dialog/sheet
    }, 300)
  },
  onError: (error) => {
    toast.error('Error message')
  }
})
```

### 8. Testing Requirements

- Manual browser testing on each affected page:
  - `/leave-requests` - verify existing auto-refresh still works
  - `/admin/team-management` - test delete, cancel, reactivate actions
  - `/admin/settings` - test leave type create, edit, delete
  - `/settings` - test leave type changes reflect automatically

- Code verification:
  - Search codebase for `window.location.reload()` - should find none in mutation contexts
  - Search for `router.refresh()` in mutation contexts - should use events instead
  - Verify all mutations have 300ms delay before closing dialogs

### 9. Performance Considerations

- Events are lightweight DOM events with no data payload
- Refetch operations use React Query's built-in caching and deduplication
- 300ms delay provides smooth UX transition without perceived lag
- No additional network overhead compared to manual refresh
