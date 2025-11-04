# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-01-04-dashboard-improvements/spec.md

## Technical Requirements

### 1. Role-Based Visibility for Leave Requests Card

**Location**: [app/dashboard/components/DashboardClient.tsx:152-171](app/dashboard/components/DashboardClient.tsx#L152-L171)

**Current Implementation**:
```tsx
{/* Leave Requests Card */}
<Card className="flex-row items-end justify-between">
  <CardContent className="flex-1">
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium">Wnioski urlopowe</div>
      <div className="text-xl font-semibold">
        {pendingRequestsCount === 0
          ? 'Brak oczekujących'
          : pendingRequestsCount === 1
          ? '1 oczekujący'
          : `${pendingRequestsCount} oczekujących`}
      </div>
    </div>
  </CardContent>
  <CardContent className="flex-shrink-0">
    <Button asChild className="h-8 px-3 text-xs">
      <Link href="/leave-requests">Przejdź do wniosków</Link>
    </Button>
  </CardContent>
</Card>
```

**Required Changes**:
- Add conditional rendering: `{(profile.role === 'admin' || profile.role === 'manager') && ( ... )}`
- Wrap entire card in this condition
- No need to modify server-side logic since `pendingRequestsCount` already respects role-based filtering

---

### 2. Replace Hardcoded Polish Text with Translation Keys

**Files to Modify**:
1. [app/dashboard/components/DashboardClient.tsx](app/dashboard/components/DashboardClient.tsx)
2. [app/dashboard/components/CurrentDayCard.tsx](app/dashboard/components/CurrentDayCard.tsx)
3. [app/dashboard/components/BirthdayCard.tsx](app/dashboard/components/BirthdayCard.tsx)
4. [app/dashboard/components/TeamCard.tsx](app/dashboard/components/TeamCard.tsx)

**Translation Keys to Add to `messages/*.json`**:

```json
{
  "dashboard": {
    // Existing keys...
    "leaveRequests": {
      "title": "Wnioski urlopowe",
      "noPending": "Brak oczekujących",
      "onePending": "1 oczekujący",
      "manyPending": "{count} oczekujących",
      "goToRequests": "Przejdź do wniosków"
    },
    "todayCard": {
      "todayIs": "Dzisiaj jest {dayName}",
      "workingToday": "Pracujesz dzisiaj"
    },
    "birthdayCard": {
      "title": "Najbliższe urodziny",
      "noBirthdays": "Brak urodzin w tym miesiącu"
    },
    "teamCard": {
      "title": "Twój zespół",
      "absent": "Nieobecni ({count})",
      "workingToday": "Dziś pracują",
      "workingTodayCount": "Dziś pracują ({count})",
      "noWorkingMembers": "Brak pracowników w pracy",
      "allTeams": "Wszyscy ({count})",
      "teamWithCount": "{name} ({count})",
      "noTeam": "Bez zespołu ({count})",
      "until": "do {date}"
    }
  }
}
```

**DashboardClient.tsx Changes**:
- Replace line 93: `"Cześć"` → `{t('greeting')}`
- Replace line 107-108: `"Masz jeszcze {days} dni urlopu"` → `{t('vacationBalance', { days: remainingVacationDays })}`
- Replace line 114: `"Niestandardowe saldo"` → `{t('customBalance')}`
- Replace line 156: `"Wnioski urlopowe"` → `{t('leaveRequests.title')}`
- Replace line 158-162: Use `t('leaveRequests.noPending')`, `t('leaveRequests.onePending')`, `t('leaveRequests.manyPending', { count: pendingRequestsCount })`
- Replace line 168: `"Przejdź do wniosków"` → `{t('leaveRequests.goToRequests')}`

**CurrentDayCard.tsx Changes**:
- Add `useTranslations('dashboard')` hook
- Replace hardcoded props with translation keys in parent component

**BirthdayCard.tsx Changes**:
- Add `useTranslations('dashboard')` hook
- Use `t('birthdayCard.title')` and `t('birthdayCard.noBirthdays')`

**TeamCard.tsx Changes**:
- Add `useTranslations('dashboard')` hook
- Replace line 74: `"Twój zespół"` → `{t('teamCard.title')}`
- Replace line 86: `"Wszyscy ({count})"` → `{t('teamCard.allTeams', { count: allTeamMembers.length })}`
- Replace line 95: Team name formatting → `{t('teamCard.teamWithCount', { name: team.name, count: teamMemberCount })}`
- Replace line 103: `"Bez zespołu ({count})"` → `{t('teamCard.noTeam', { count: ... })}`
- Replace line 117: `"Nieobecni ({count})"` → `{t('teamCard.absent', { count: filteredAbsentMembers.length })}`
- Replace line 157: `"do {date}"` → `{t('teamCard.until', { date: endDate })}`
- Replace line 171: `"Dziś pracują ({count})"` → `{t('teamCard.workingTodayCount', { count: workingMembers.length })}`
- Replace line 201: `"Brak pracowników w pracy"` → `{t('teamCard.noWorkingMembers')}`

---

### 3. Optimize Birthday Calculation

**Current Issue**: Birthday calculation runs on every server render at [app/dashboard/page.tsx:250-285](app/dashboard/page.tsx#L250-L285)

**Solution**:
Move the birthday calculation logic into a database query or optimize the calculation to use memoization.

**Approach A - Database Query (Recommended)**:
Create a PostgreSQL function that calculates the nearest birthday:

```sql
CREATE OR REPLACE FUNCTION get_nearest_birthday(member_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  full_name text,
  birth_date date,
  days_until integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.birth_date,
    CASE
      WHEN make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM p.birth_date)::int, EXTRACT(DAY FROM p.birth_date)::int) < CURRENT_DATE
      THEN (make_date((EXTRACT(YEAR FROM CURRENT_DATE) + 1)::int, EXTRACT(MONTH FROM p.birth_date)::int, EXTRACT(DAY FROM p.birth_date)::int) - CURRENT_DATE)::int
      ELSE (make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM p.birth_date)::int, EXTRACT(DAY FROM p.birth_date)::int) - CURRENT_DATE)::int
    END as days_until
  FROM profiles p
  WHERE p.id = ANY(member_ids)
    AND p.birth_date IS NOT NULL
  ORDER BY days_until ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Approach B - Keep in TypeScript but simplify**:
Extract `calculateNearestBirthday` to a utility function in `lib/utils/birthday.ts` and ensure it's only called once during data fetching.

**Recommended**: Use Approach B for simplicity. Create utility function and ensure birthday calculation happens once during the initial data fetch.

---

### 4. Remove Admin Client Usage

**Current Usage**: [app/dashboard/page.tsx:72](app/dashboard/page.tsx#L72)

```tsx
const supabaseAdmin = createAdminClient()
```

**Analysis**:
The admin client is used for the following queries:
1. Leave balances (line 88-103)
2. Leave types (line 115-119)
3. Organization settings (line 122-128)
4. Team members via user_organizations (lines 139-183, 186-220)
5. Teams (lines 225-230)
6. Managed team (lines 234-239)
7. Profiles with birthdays (lines 242-247)
8. Pending leave requests (lines 294-300)
9. Current leave requests (lines 307-328)

**Security Concern**:
Using admin client bypasses RLS entirely. While the code implements manual team scope filtering, this is error-prone.

**Recommendation**:
1. **Keep admin client for now** - The current implementation has complex team scope logic that would require significant RLS policy changes
2. **Add documentation** - Add clear comments explaining why admin client is necessary
3. **Future improvement** - Mark for future refactoring when RLS policies are enhanced

**Action**:
Add comprehensive comments documenting the security model:

```tsx
// SECURITY NOTE: Using admin client to bypass RLS for team-based filtering
// This is necessary because the current RLS policies don't support the complex
// team scope logic (restrict_calendar_by_group setting). The code manually
// filters results based on teamMemberIds which is calculated based on:
// 1. User's role (admin sees all, manager sees team)
// 2. Organization's restrict_calendar_by_group setting
// 3. User's team membership
// Future: Enhance RLS policies to handle this logic at the database level
const supabaseAdmin = createAdminClient()
```

---

### 5. Clean Up Last Update Info

**Location**: [app/dashboard/components/DashboardCalendar.tsx:208-212](app/dashboard/components/DashboardCalendar.tsx#L208-L212)

**Current Code**:
```tsx
// NOTE: Last update info commented out until shift feature is implemented
// lastUpdateLabel="Ostatnia aktualizacja"
// lastUpdateUser={undefined}
// lastUpdateDate={undefined}
```

**Action**:
1. Remove commented-out props from DashboardClient component (lines 208-212)
2. Remove the optional props from DashboardCalendar interface (lines 25-27):
   ```tsx
   lastUpdateLabel?: string
   lastUpdateUser?: string
   lastUpdateDate?: string
   ```
3. Remove the conditional rendering in DashboardCalendar (lines 129-135)

---

## External Dependencies (Conditional)

No new external dependencies are required for this spec. All changes use existing libraries:
- `next-intl` for translations (already in use)
- Existing Supabase client setup
- Existing UI components from `@/components/ui`

---

## Implementation Notes

1. **Translation key naming**: Follow existing convention in `messages/*.json` - nested objects for grouped features
2. **Type safety**: Ensure TypeScript types are updated when removing optional props
3. **Testing**: Manually test with different user roles (admin, manager, user) to verify card visibility
4. **Performance**: Verify birthday calculation doesn't cause performance issues after refactoring
5. **Security audit**: Document the security model for admin client usage clearly in code comments
