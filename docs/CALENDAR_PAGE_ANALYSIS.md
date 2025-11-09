# Calendar Page Analysis

## Overview
The calendar page (`/calendar`) is a comprehensive team leave management interface that displays a monthly calendar view with leave requests, holidays, birthdays, work schedules, and team availability information.

## Architecture

### File Structure
```
app/calendar/
├── page.tsx                    # Server component - data fetching & auth
└── components/
    ├── CalendarClient.tsx      # Main client component (1053 lines)
    ├── CalendarSkeleton.tsx     # Loading skeleton
    ├── DaySheetSkeleton.tsx     # Day details loading skeleton
    ├── TeamCalendarView.tsx    # Alternative team calendar view (unused?)
    ├── CapacityOverview.tsx     # Team capacity widget (unused?)
    └── UpcomingLeaves.tsx       # Upcoming leaves widget (unused?)

app/api/calendar/
├── leave-requests/route.ts      # Fetch approved leave requests
├── holidays/route.ts            # Fetch holidays (national + company)
├── user-schedule/route.ts      # Fetch user work schedule for date
└── working-team-members/route.ts # Fetch team members working on date
```

## Data Flow

### Server-Side (page.tsx)
1. **Authentication & Authorization**
   - Validates user session
   - Gets user profile and organization context
   - Supports workspace switching via `active-organization-id` cookie
   - Redirects to `/onboarding` if no organization found

2. **Team Scope Determination**
   - Admins: See all organization members
   - Regular users with `restrict_calendar_by_group = true`: See only team/group members
   - Regular users with `restrict_calendar_by_group = false`: See all organization members
   - Uses `user_organizations.team_id` for group filtering

3. **Data Fetching**
   - Leave types (for NewLeaveRequestSheet)
   - Leave balances (for NewLeaveRequestSheet)
   - Pending leave requests (for balance calculation)
   - Colleagues' birthdays (team-filtered)
   - Organization settings (restrict_calendar_by_group)

4. **Props Passed to CalendarClient**
   - `organizationId`: Current organization ID
   - `countryCode`: Organization country code (defaults to 'PL')
   - `userId`: Current user ID
   - `colleagues`: Array of team members with birthdays
   - `teamMemberIds`: Array of user IDs visible in calendar
   - `teamScope`: Team scope object (`{ type: 'organization' | 'team', organizationId, teamId? }`)
   - `workingDays`: Array of working days (defaults to Mon-Fri)
   - `disableResponsive`: Always `true` (disables responsive calendar cell sizing)

### Client-Side (CalendarClient.tsx)
1. **State Management**
   - `internalDate`: Current month being viewed
   - `selectedDay`: Selected day data (null when no selection)
   - `isSheetOpen`: Controls day details sheet visibility
   - `isLoadingDayDetails`: Loading state for day details

2. **Data Fetching (React Query)**
   - `useCalendarLeaveRequests`: Fetches approved leave requests for current month
   - `useHolidays`: Fetches holidays (national + company) for current month
   - Both hooks automatically cache and invalidate on mutations

3. **Prefetching**
   - Prefetches adjacent months on navigation button hover
   - Improves UX by loading next/previous month data proactively

4. **Day Details Fetching**
   - `fetchUserSchedule`: Gets user's work schedule for selected day
   - `fetchWorkingTeamMembers`: Gets team members working on selected day
   - Both called when day is clicked (async operations)

## Features

### 1. Calendar Grid Display
- **Month View**: Standard calendar grid (7 columns × variable rows)
- **Day Cells**: 
  - Height: `h-32` (128px) on mobile, `aspect-square` on desktop (min-width 850px)
  - Background colors based on day status:
    - Working day: `bg-[var(--card-violet)]` (CSS variable)
    - User leave: `bg-green-500/10` (vacation) or `bg-destructive/10` (sick leave)
    - Weekend/Holiday: `bg-accent` with pattern overlay
  - Status labels: Show work hours, leave type, holiday name, or "Niepracujący"
  - Day number: Top-left corner
  - Holiday star icon: Top-right corner (if holiday exists)
  - Avatars: Top-right, stacked vertically (max 2 visible, "+N" badge for overflow)
  - Birthday gift icon: Bottom-left (if birthdays exist)
  - Status label: Bottom-left (work hours, leave type, etc.)

### 2. Day Details Sheet
When a day is clicked, a sheet opens showing:
- **Date Card**: 
  - Day name, date, month, year
  - Dynamic background based on user leave status (matches dashboard)
  - Schedule ready badge (if schedule exists)
  - Day status message (working hours, leave type, holiday, weekend)
- **Request Leave Section**: 
  - Only shown if user doesn't already have leave
  - Button opens NewLeaveRequestSheet with pre-selected date
- **Working Team Members**: 
  - Shows who's working on this day ("Na zmianie będą")
  - Filters out users on approved leave
  - Shows avatar, name, and team name
- **Planned Leaves**: 
  - Shows team members on approved leave ("Zaplanowane urlopy")
  - Excludes current user's own requests
  - Shows avatar, name, email, leave type, and end date

### 3. Visual Indicators
- **Avatars**: Team members on leave (max 2 visible + count badge)
- **Birthday Icons**: Gift icon for colleague birthdays
- **Holiday Stars**: Star icon for holidays
- **Status Labels**: Work hours, leave types, holiday names
- **Background Colors**: Different colors for working days, leave, weekends, holidays
- **Pattern Overlays**: CSS patterns for weekends and holidays

### 4. Navigation
- Previous/Next month buttons
- Month/year display
- Prefetching on hover for smooth navigation
- Can be hidden via `hideNavigation` prop

### 5. Internationalization
- Full i18n support via `next-intl`
- Month names translated
- Day names translated
- All UI text translated
- Supports Polish (pl) and English (en)

## API Endpoints

### GET `/api/calendar/leave-requests`
- **Purpose**: Fetch approved leave requests for date range
- **Query Params**:
  - `start_date`: Start date (YYYY-MM-DD)
  - `end_date`: End date (YYYY-MM-DD)
  - `team_member_ids`: Comma-separated user IDs (optional)
- **Returns**: Array of leave requests with profiles and leave_types
- **Auth**: Uses `authenticateAndGetOrgContext()` for workspace isolation
- **Filtering**: Only approved requests, filtered by organization and team members

### GET `/api/calendar/holidays`
- **Purpose**: Fetch holidays (national + company) for date range
- **Query Params**:
  - `start_date`: Start date (YYYY-MM-DD)
  - `end_date`: End date (YYYY-MM-DD)
  - `country_code`: Country code (defaults to 'PL')
  - OR `year` + `month` (backward compatibility)
- **Returns**: Array of holidays
- **Caching**: 30 minutes cache, 1 hour stale-while-revalidate
- **Filtering**: Organization holidays + national holidays for country

### GET `/api/calendar/user-schedule`
- **Purpose**: Get user's work schedule for specific date
- **Query Params**:
  - `userId`: User ID
  - `organizationId`: Organization ID
  - `date`: Date (YYYY-MM-DD)
- **Returns**: `{ start: "HH:MM", end: "HH:MM", isReady: boolean }` or `null`
- **Source**: `employee_schedules` table

### GET `/api/calendar/working-team-members`
- **Purpose**: Get team members working on specific date
- **Query Params**:
  - `organizationId`: Organization ID
  - `date`: Date (YYYY-MM-DD)
  - `userId`: Current user ID (excluded from results)
  - `teamMemberIds`: Comma-separated user IDs
- **Returns**: Array of working members with avatars and team names
- **Filtering**: Excludes users on approved leave

## Components Breakdown

### CalendarClient.tsx (Main Component)
**Size**: 1053 lines
**Responsibilities**:
- Calendar grid rendering
- Day cell rendering with all visual indicators
- Day click handling and sheet management
- Data fetching coordination
- Month navigation
- Prefetching logic
- Day status calculation
- Birthday detection
- Leave request filtering

**Key Functions**:
- `generateCalendarDays()`: Creates calendar grid days array
- `getDayStatus()`: Determines day background and status label
- `getLeaveRequestsForDay()`: Filters leave requests for specific day
- `getHolidayForDay()`: Finds holiday for specific day
- `getBirthdaysForDay()`: Finds birthdays for specific day
- `isFreeDay()`: Checks if day is weekend/holiday/user leave
- `handleDayClick()`: Opens day details sheet and fetches additional data
- `prefetchAdjacentMonth()`: Prefetches next/previous month data

### CalendarSkeleton.tsx
- Loading skeleton for calendar grid
- Shows month navigation, day headers, and 42 day cells

### DaySheetSkeleton.tsx
- Loading skeleton for day details sheet
- Shows date card and sections structure

### TeamCalendarView.tsx
- Alternative calendar view component
- Appears unused in main calendar page
- Shows leave blocks as horizontal bars spanning multiple days
- Has capacity overview and day details dialog

### CapacityOverview.tsx
- Team capacity widget component
- Appears unused in main calendar page
- Shows weekly capacity breakdown for next 4 weeks
- Includes capacity alerts and team stats

### UpcomingLeaves.tsx
- Upcoming leaves widget component
- Appears unused in main calendar page
- Shows next 10 upcoming leaves in next 30 days

## Performance Optimizations

1. **React Query Caching**
   - Leave requests: 2 minutes stale time
   - Holidays: 30 minutes cache, 1 hour stale-while-revalidate
   - Automatic cache invalidation on mutations

2. **Prefetching**
   - Adjacent months prefetched on navigation button hover
   - Reduces perceived loading time

3. **Memoization**
   - `useMemo` for current date calculation
   - Calendar days array regenerated only when month changes

4. **Lazy Loading**
   - Day details fetched only when day is clicked
   - Schedule and team members fetched on-demand

5. **Skeleton Loading**
   - Shows loading states during data fetching
   - Improves perceived performance

## Constants & Configuration

### calendar-constants.ts
- `CALENDAR_GRID_SIZE`: 42 (6 weeks × 7 days)
- `MAX_VISIBLE_AVATARS`: 2
- `ERROR_TOAST_DURATION`: 3000ms
- `DAY_NAMES_LOWERCASE`: Array for day name comparison
- `DEFAULT_WORKING_DAYS`: Mon-Fri
- `LEAVE_TYPE_NAMES`: Vacation and sick leave names
- `USER_LEAVE_STATUS`: Status types for background styling

## Potential Issues & Improvements

### Issues
1. **Unused Components**: `TeamCalendarView`, `CapacityOverview`, `UpcomingLeaves` are defined but not used in main calendar page
2. **Hardcoded Values**: 
   - Work hours "9:00 - 15:00" hardcoded in `getDayStatus()` (line 540)
   - Should use actual schedule data
3. **Error Handling**: 
   - Some API calls have basic error handling but could be more robust
   - Toast notifications for errors but no retry mechanism
4. **Accessibility**: 
   - Good ARIA labels but could improve keyboard navigation
   - Day cells are buttons but could have better focus states
5. **Performance**: 
   - Large component (1053 lines) could be split into smaller components
   - Day details sheet fetches data on every click (could cache)

### Improvements
1. **Component Splitting**: Break CalendarClient into smaller components:
   - `CalendarGrid.tsx`: Grid rendering
   - `DayCell.tsx`: Individual day cell
   - `DayDetailsSheet.tsx`: Day details sheet
   - `CalendarNavigation.tsx`: Month navigation

2. **Caching**: Cache day details (schedule, team members) per date

3. **Error Recovery**: Add retry logic for failed API calls

4. **Accessibility**: 
   - Better keyboard navigation (arrow keys to navigate days)
   - Focus management for sheet opening/closing

5. **Performance**: 
   - Virtualize calendar grid for very large teams
   - Debounce day click handler

6. **Features**:
   - Week view option
   - Year view option
   - Export calendar functionality
   - Print view

## Dependencies

### External Libraries
- `@tanstack/react-query`: Data fetching and caching
- `next-intl`: Internationalization
- `lucide-react`: Icons
- `date-fns`: Date utilities (used in some components)

### Internal Dependencies
- `@/components/ui/*`: shadcn/ui components
- `@/hooks/useLeaveRequests`: Leave requests hook
- `@/hooks/useHolidays`: Holidays hook
- `@/hooks/use-sonner-toast`: Toast notifications
- `@/lib/calendar-constants`: Constants
- `@/lib/team-utils`: Team scope utilities
- `@/app/leave/components/NewLeaveRequestSheet`: Leave request form

## Security Considerations

1. **Authentication**: All API endpoints require authentication
2. **Authorization**: Team scope filtering ensures users only see authorized data
3. **RLS**: Uses admin client for some queries (bypasses RLS) but filters by organization
4. **Data Isolation**: Organization-scoped queries prevent cross-organization data leaks

## Testing Considerations

1. **Unit Tests**: Test day status calculation, date filtering, birthday detection
2. **Integration Tests**: Test API endpoints with different team scopes
3. **E2E Tests**: Test calendar navigation, day selection, leave request creation
4. **Accessibility Tests**: Test keyboard navigation, screen reader compatibility

## Summary

The calendar page is a well-structured, feature-rich component with:
- ✅ Comprehensive leave management visualization
- ✅ Team scope filtering (organization/team-based)
- ✅ Internationalization support
- ✅ Performance optimizations (caching, prefetching)
- ✅ Good accessibility (ARIA labels)
- ⚠️ Large component size (could be split)
- ⚠️ Some unused components
- ⚠️ Hardcoded values in places
- ⚠️ Could benefit from better error recovery

Overall, the calendar page is production-ready but could benefit from refactoring for maintainability and adding missing features like week/year views.

