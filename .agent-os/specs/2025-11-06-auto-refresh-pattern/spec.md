# Spec Requirements Document

> Spec: Standardize Auto-Refresh Pattern Across Application
> Created: 2025-11-06
> Status: Planning

## Overview

Implement a consistent event-driven auto-refresh system across all pages to eliminate manual page reloads and provide seamless data updates after mutations. This will improve user experience by automatically refreshing data when changes occur, removing the need for `window.location.reload()` or manual `router.refresh()` calls.

## User Stories

### Seamless Data Updates After Team Management Actions

As an admin, I want the team management page to automatically refresh after I delete, cancel, or reactivate a user, so that I can immediately see the updated team status without manually reloading the page.

When an admin performs any team management action (delete account, cancel pending invitation, or reactivate user), the system will dispatch a refetch event that triggers the team management data to reload automatically. The UI will update within milliseconds to reflect the new state, providing instant visual feedback.

### Automatic Settings Refresh After Leave Type Changes

As an admin, I want the settings page to automatically update after I create, edit, or delete leave types, so that I can see my changes immediately without refreshing the browser.

When an admin modifies leave types through the admin settings page or the leave types manager component, the system will dispatch a refetch event that updates all affected components. Both the admin settings and user settings pages will reflect the changes instantly.

### Consistent Data Freshness Across All Pages

As a developer, I want a unified event system for triggering data refreshes, so that all pages handle mutations consistently and maintainably.

The system will provide a centralized event dispatching mechanism in `lib/refetch-events.ts` with predefined event constants and helper functions. All mutations will use React Query hooks that dispatch appropriate refetch events, ensuring consistent behavior across the application.

## Spec Scope

1. **Unified Event System** - Create centralized event constants and helper functions in `lib/refetch-events.ts` for dispatching refetch events
2. **Team Management Auto-Refresh** - Implement event-driven refetch in TeamManagementClient and create `use-team-mutations.ts` hook to replace `window.location.reload()` calls
3. **Admin Settings Auto-Refresh** - Add event listener to AdminSettingsClient and create `use-settings-mutations.ts` hook for leave type CRUD operations
4. **Leave Types Manager Integration** - Update LeaveTypesManager to listen for refetch events and use React Query hooks instead of direct Supabase client calls
5. **Leave Mutations Event Dispatch** - Ensure all mutations in `use-leave-mutations.ts` dispatch refetch events with consistent timing

## Out of Scope

- Adding new mutation functionality beyond what exists
- Changing the UI/UX of any pages (visual design remains the same)
- Implementing optimistic updates (future enhancement)
- Adding loading skeletons for refetch operations
- Modifying database schema or RLS policies

## Expected Deliverable

1. All CRUD operations across team management, settings, and leave requests trigger automatic data refresh without manual page reloads
2. No instances of `window.location.reload()` remain in the codebase for mutation handling
3. Consistent event-driven pattern established that can be easily extended to future features
