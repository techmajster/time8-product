# Spec Requirements Document

> Spec: Dashboard Improvements
> Created: 2025-01-04
> Status: Planning

## Overview

Improve the dashboard page by fixing hardcoded Polish text, removing admin client usage where possible, optimizing birthday calculations, implementing proper role-based visibility for the leave requests card, and cleaning up commented-out code for the last update info feature.

## User Stories

### Role-Based Card Visibility

As a **regular user (employee)**, I want to NOT see the "Wnioski urlopowe" (Leave Requests) card on my dashboard, so that I only see information relevant to my role.

As a **manager or admin**, I want to see the "Wnioski urlopowe" card with the count of pending leave requests, so that I can quickly see what requires my attention.

### Internationalization

As a **user of the application**, I want all text in the dashboard to respect the application's internationalization system, so that the interface is consistent and can be properly translated.

As a **developer**, I want hardcoded Polish text replaced with translation keys, so that future translations and maintenance are easier.

### Performance

As a **system administrator**, I want the birthday calculation to be optimized, so that the server component renders efficiently without unnecessary calculations on every render.

As a **security-conscious admin**, I want to minimize admin client usage and rely on proper RLS policies, so that the application follows security best practices.

## Spec Scope

1. **Role-Based Visibility for Leave Requests Card** - Hide "Wnioski urlopowe" card from regular users, show only to managers and admins
2. **Replace Hardcoded Polish Text** - Replace all hardcoded Polish strings with translation keys from `useTranslations('dashboard')`
3. **Optimize Birthday Calculation** - Move birthday calculation logic to a more efficient implementation or cache the result
4. **Remove Admin Client Usage** - Audit and remove `createAdminClient()` calls where RLS policies can handle authorization
5. **Clean Up Last Update Info** - Remove commented-out code for last update info feature that's waiting for shift implementation

## Out of Scope

- Implementing the shift feature (prerequisite for last update info)
- Changing the hardcoded work hours (9:00-15:00) - this requires database schema changes
- Modifying the underlying RLS policies themselves
- Adding new features to the dashboard

## Expected Deliverable

1. **Role-based visibility**: Regular users should not see the leave requests card; managers/admins should see it
2. **Full i18n compliance**: All dashboard text uses translation keys from `messages/pl.json` and `messages/en.json`
3. **Optimized performance**: Birthday calculation no longer runs on every render
4. **Reduced admin client usage**: Server component uses regular Supabase client with RLS where possible
5. **Clean codebase**: Commented code for unimplemented features is removed
