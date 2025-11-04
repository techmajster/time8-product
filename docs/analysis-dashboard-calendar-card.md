# Dashboard Calendar Card - Comprehensive Analysis

## Executive Summary

The Dashboard Calendar Card is a sophisticated component that displays a monthly calendar view with leave requests, holidays, and birthday indicators. It's embedded in the dashboard's right column and provides interactive day-clicking functionality that opens a detailed day sheet. This analysis covers architecture, data flow, integration points, performance considerations, and recommendations for improvement.

---

## 1. Component Architecture

### 1.1 Component Hierarchy

```
DashboardClient (app/dashboard/components/DashboardClient.tsx)
└── DashboardCalendar (app/dashboard/components/DashboardCalendar.tsx)
    └── CalendarClient (app/calendar/components/CalendarClient.tsx)
        ├── Calendar Grid Display
        └── Day Details Sheet (Radix UI Sheet)
```

### 1.2 File Locations

| Component | Path | Lines | Purpose |
|-----------|------|-------|---------|
| Dashboard Page | `app/dashboard/page.tsx` | 369 | Server component - data fetching |
| DashboardClient | `app/dashboard/components/DashboardClient.tsx` | 213 | Client wrapper with React Query |
| DashboardCalendar | `app/dashboard/components/DashboardCalendar.tsx` | 84 | Card wrapper for calendar |
| CalendarClient | `app/calendar/components/CalendarClient.tsx` | 939 | Core calendar logic & UI |

### 1.3 Component Props Flow

```typescript
// Dashboard Page → DashboardClient
{
  organizationId: string
  countryCode: string
  userId: string
  colleagues: Array<colleague>
  teamMemberIds: string[]
  teamScope: TeamScope
  // ... other dashboard data
}

// DashboardClient → DashboardCalendar
{
  organizationId: string
  countryCode: string
  userId: string
  colleagues: Array<colleague>
  teamMemberIds: string[]
  teamScope: TeamScope
  calendarTitle: "Kalendarz urlopów"
  badgeText: "Twój kalendarz"
  lastUpdateLabel: "Ostatnia aktualizacja"
  lastUpdateUser: "Paweł Chróściak"  // [Unverified] Hardcoded value
  lastUpdateDate: "28.06.2025"       // [Unverified] Hardcoded value
}

// DashboardCalendar → CalendarClient
{
  organizationId: string
  countryCode: string
  userId: string
  colleagues: Array<colleague>
  teamMemberIds: string[]
  teamScope: TeamScope
  showHeader: false      // Hides "Kalendarz" title
  showPadding: false     // Removes py-11 padding
  workingDays: string[]  // Optional, defaults to Mon-Fri
}
```

---

## 2. Data Flow & State Management

### 2.1 Server-Side Data Fetching (Dashboard Page)

**Location**: `app/dashboard/page.tsx` lines 72-287

The dashboard page performs comprehensive server-side data fetching:

```typescript
// 1. Authentication & Organization Context
const { data: { user } } = await supabase.auth.getUser()
const { data: profile } = await supabase.from('profiles')...
const { data: userOrg } = await supabase.from('user_organizations')...

// 2. Team Scope Calculation
// Determines who can see whose calendars based on:
// - User role (admin sees all, manager sees team, employee sees group)
// - Organization setting: restrict_calendar_by_group
// - User's team_id

// 3. Team Member IDs Array
// Filtered list of user IDs that this user can see calendars for

// 4. Colleagues with Birthdays
const { data: teamMembersWithBirthdays } = await supabaseAdmin
  .from('profiles')
  .select('id, full_name, birth_date')
  .in('id', teamMemberIds)
  .not('birth_date', 'is', null)
```

**Key Logic**:
- **Admin**: Sees all organization members
- **Restriction ON + Has Team**: Sees only team members
- **Restriction ON + No Team**: Sees all organization members
- **Restriction OFF**: Everyone sees everyone

### 2.2 Client-Side Data Fetching (CalendarClient)

**Location**: `app/calendar/components/CalendarClient.tsx` lines 143-198

#### React Query for Leave Requests

```typescript
const { data: leaveRequestsData = [], isLoading: isLoadingLeaveRequests } = useQuery({
  queryKey: ['calendar-leave-requests', startOfMonth, endOfMonth, teamMemberIds.join(',')],
  queryFn: async () => {
    const params = new URLSearchParams({
      start_date: startOfMonth,
      end_date: endOfMonth,
      team_member_ids: teamMemberIds.join(',')
    })
    
    const response = await fetch(`/api/calendar/leave-requests?${params}`)
    return await response.json()
  },
  staleTime: 1000 * 30, // 30 seconds
  enabled: !!organizationId && teamMemberIds.length > 0
})
```

**Benefits**:
- Automatic caching (30-second stale time)
- Automatic refetching on window focus
- Integrated loading states
- Cache invalidation on leave request mutations

#### useEffect for Holidays

```typescript
useEffect(() => {
  fetchHolidays()
}, [currentDate, organizationId, countryCode])

const fetchHolidays = async () => {
  const params = new URLSearchParams({
    year: year.toString(),
    month: month.toString(),
    country_code: countryCode
  })
  
  const response = await fetch(`/api/calendar/holidays?${params}`)
  const holidays = await response.json()
  setHolidays(holidays)
}
```

**Observation**: Holidays are not using React Query. Consider migrating for consistency.

### 2.3 API Endpoints

#### `/api/calendar/leave-requests` (GET)

**File**: `app/api/calendar/leave-requests/route.ts`

**Parameters**:
- `start_date`: YYYY-MM-DD format
- `end_date`: YYYY-MM-DD format
- `team_member_ids`: Comma-separated user IDs

**Query Logic**:
```sql
SELECT id, user_id, start_date, end_date, status, 
       profiles (id, full_name, email, avatar_url),
       leave_types (id, name, color)
FROM leave_requests
WHERE organization_id = ?
  AND status = 'approved'
  AND user_id IN (?)
  AND (start_date <= ? OR end_date >= ?)
```

**Response**:
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "start_date": "2025-07-22",
    "end_date": "2025-07-24",
    "status": "approved",
    "profiles": {
      "id": "uuid",
      "full_name": "Jan Kowalski",
      "email": "jan@example.com",
      "avatar_url": "https://..."
    },
    "leave_types": {
      "id": "uuid",
      "name": "Urlop wypoczynkowy",
      "color": "#3b82f6"
    }
  }
]
```

**Cache**: No cache headers (consider adding)

#### `/api/calendar/holidays` (GET)

**File**: `app/api/calendar/holidays/route.ts`

**Parameters**:
- Option 1: `year` + `month` (legacy)
- Option 2: `start_date` + `end_date` (preferred)
- `country_code`: Default 'PL'

**Query Logic**:
```sql
SELECT *
FROM company_holidays
WHERE (
    organization_id = ?
    OR (type = 'national' AND organization_id IS NULL AND country_code = ?)
  )
  AND date >= ?
  AND date <= ?
```

**Response**:
```json
[
  {
    "id": "uuid",
    "name": "Nowy Rok",
    "date": "2025-01-01",
    "type": "national",
    "country_code": "PL",
    "organization_id": null
  }
]
```

**Cache**: `Cache-Control: public, s-maxage=1800, stale-while-revalidate=3600` ✅

#### `/api/calendar/user-schedule` (GET)

**File**: `app/api/calendar/user-schedule/route.ts`

**Parameters**:
- `userId`: User UUID
- `organizationId`: Organization UUID
- `date`: YYYY-MM-DD format

**Purpose**: Fetches user's work schedule for a specific date

**Response**:
```json
{
  "start": "09:00",
  "end": "17:00",
  "isReady": true
}
```

**Usage**: Only called when day is clicked (for day details sheet)

#### `/api/calendar/working-team-members` (GET)

**File**: `app/api/calendar/working-team-members/route.ts`

**Parameters**:
- `organizationId`: Organization UUID
- `date`: YYYY-MM-DD format
- `userId`: Current user UUID (excluded from results)
- `teamMemberIds`: Comma-separated user IDs

**Purpose**: Fetches team members working on a specific date (excluding current user and those on leave)

**Response**:
```json
[
  {
    "id": "uuid",
    "name": "Anna Nowak",
    "avatar": "https://...",
    "teamName": "Development Team"
  }
]
```

**Usage**: Only called when day is clicked (for day details sheet)

---

## 3. Calendar Grid Implementation

### 3.1 Calendar Generation Algorithm

**Location**: `app/calendar/components/CalendarClient.tsx` lines 527-584

```typescript
const generateCalendarDays = () => {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7 // Convert to Monday = 0
  
  const days = []
  
  // 1. Previous month days (greyed out)
  const prevMonth = new Date(year, month, 0)
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push({
      day: prevMonth.getDate() - i,
      isOutside: true,
      isCurrentMonth: false
    })
  }
  
  // 2. Current month days
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const today = new Date()
    const isToday = year === today.getFullYear() && 
                   month === today.getMonth() && 
                   day === today.getDate()
    
    days.push({
      day,
      isOutside: false,
      isCurrentMonth: true,
      isToday,
      leaves: getLeaveRequestsForDay(day),
      holiday: getHolidayForDay(day),
      birthdays: getBirthdaysForDay(day)
    })
  }
  
  // 3. Next month days to fill the grid (42 days = 6 weeks)
  const remainingDays = 42 - days.length
  for (let day = 1; day <= remainingDays; day++) {
    days.push({
      day,
      isOutside: true,
      isCurrentMonth: false
    })
  }
  
  return days
}
```

**Key Points**:
- Always displays 42 days (6 weeks × 7 days)
- Weeks start on Monday (Polish convention)
- Previous/next month days are greyed out
- Each day includes pre-calculated leave/holiday/birthday data

### 3.2 Calendar Day Cell

**Location**: `app/calendar/components/CalendarClient.tsx` lines 644-710

```typescript
<button
  onClick={() => dayData.isCurrentMonth && handleDayClick(dayData.day)}
  className={`
    relative h-24 rounded-lg flex flex-col cursor-pointer transition-colors
    ${dayData.isOutside 
      ? 'opacity-50 bg-accent' 
      : dayData.isToday 
        ? 'bg-accent' 
        : 'bg-accent hover:bg-accent/80'
    }
  `}
  disabled={dayData.isOutside}
>
  {/* Day Number - Top Left */}
  <div className="flex items-start justify-start p-1.5">
    <span className={`text-base ${dayData.isOutside ? 'text-muted-foreground' : 'text-foreground'}`}>
      {dayData.day}
    </span>
  </div>

  {/* Holiday Indicator - Top Right */}
  {dayData.holiday && (
    <div className="absolute top-1 right-1">
      <span className="text-xs">
        {dayData.holiday.type === 'national' ? '🇵🇱' : '🏢'}
      </span>
    </div>
  )}

  {/* Birthday Indicator - Bottom Left */}
  {dayData.birthdays && dayData.birthdays.length > 0 && (
    <div className="absolute bottom-2 left-2">
      <Gift className="w-5 h-5 text-foreground" />
    </div>
  )}

  {/* Leave Avatars - Top Right, stacked vertically */}
  {dayData.leaves && dayData.leaves.length > 0 && (
    <div className="absolute top-2 right-2">
      <div className="flex flex-col items-start justify-center pb-2 pt-0 px-0">
        {/* First 2 avatars */}
        {dayData.leaves.slice(0, 2).map((leave) => (
          <Avatar key={leave.id} className="w-8 h-8 mb-[-8px] border-2 border-white">
            <AvatarImage src={leave.profiles?.avatar_url} />
            <AvatarFallback>
              {(leave.profiles?.first_name?.[0] || '') + (leave.profiles?.last_name?.[0] || '')}
            </AvatarFallback>
          </Avatar>
        ))}
        
        {/* +N indicator for more than 2 */}
        {dayData.leaves.length > 2 && (
          <div className="w-8 h-8 mb-[-8px] bg-muted border-2 border-white rounded-full flex items-center justify-center">
            <span className="text-sm font-normal text-foreground">
              +{dayData.leaves.length - 2}
            </span>
          </div>
        )}
      </div>
    </div>
  )}
</button>
```

**Visual Elements**:
1. **Day Number**: Top-left, text-base (16px)
2. **Holiday Icon**: Top-right, 🇵🇱 (national) or 🏢 (company)
3. **Birthday Icon**: Bottom-left, Gift icon
4. **Leave Avatars**: Top-right below holiday, vertically stacked
   - Shows first 2 avatars
   - Shows "+N" badge if more than 2 people
   - Avatars have -8px negative margin for overlap

**Styling**:
- Cell height: `h-24` (96px)
- Background: `bg-accent` (from theme)
- Today: Same background (no special highlighting) [Inference] Could be improved
- Hover: `hover:bg-accent/80` (80% opacity)

### 3.3 Helper Functions

#### getLeaveRequestsForDay()

```typescript
const getLeaveRequestsForDay = (day: number) => {
  const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  
  return leaveRequests.filter(leave => {
    const startDate = leave.start_date
    const endDate = leave.end_date
    return dateStr >= startDate && dateStr <= endDate
  })
}
```

**Logic**: Returns all leave requests that overlap with the given day

#### getHolidayForDay()

```typescript
const getHolidayForDay = (day: number) => {
  const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  return holidays.find(holiday => holiday.date === dateStr)
}
```

**Logic**: Finds exact holiday match by date string

#### getBirthdaysForDay()

```typescript
const getBirthdaysForDay = (day: number) => {
  const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
  const monthDay = `${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  
  return colleagues.filter(colleague => {
    if (!colleague.birth_date) return false
    const birthDate = new Date(colleague.birth_date)
    const birthMonthDay = `${(birthDate.getMonth() + 1).toString().padStart(2, '0')}-${birthDate.getDate().toString().padStart(2, '0')}`
    return birthMonthDay === monthDay
  })
}
```

**Logic**: Compares month-day only (ignoring year)

#### isFreeDay()

```typescript
const isFreeDay = (day: number) => {
  const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
  const dayOfWeek = selectedDate.getDay() // 0 = Sunday, 6 = Saturday
  const holiday = getHolidayForDay(day)

  // Check if it's a weekend
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayName = dayNames[dayOfWeek]
  const isWeekend = !workingDays.includes(dayName)
  
  // Check if it's a holiday
  const isHoliday = !!holiday
  
  // Check if user has approved leave
  const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  const hasPersonalLeave = leaveRequests.some(leave => 
    leave.user_id === userId && 
    leave.status === 'approved' &&
    dateStr >= leave.start_date && 
    dateStr <= leave.end_date
  )
  
  return isWeekend || isHoliday || hasPersonalLeave
}
```

**Logic**: Day is "free" if:
1. It's a weekend (based on organization's working days)
2. It's a holiday
3. User has approved personal leave

---

## 4. Day Details Sheet

### 4.1 Architecture

**Component**: Radix UI Sheet (Dialog variant)  
**Location**: `app/calendar/components/CalendarClient.tsx` lines 717-936  
**Trigger**: Click on any current month day in calendar  
**State**: Controlled by `selectedDay` state (null = closed)

```typescript
const [selectedDay, setSelectedDay] = useState<SelectedDayData | null>(null)

<Sheet open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
  <SheetContent size="content"> {/* 560px fixed width */}
    {/* Sheet content */}
  </SheetContent>
</Sheet>
```

### 4.2 Data Collection on Day Click

**Function**: `handleDayClick(day: number)`  
**Location**: Lines 385-524

```typescript
const handleDayClick = async (day: number) => {
  const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
  const selectedDateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  
  // 1. Collect static data
  const holiday = getHolidayForDay(day)
  const dayLeaves = getLeaveRequestsForDay(day)
  const dayBirthdays = getBirthdaysForDay(day)
  
  // 2. Filter planned leaves (exclude user's own)
  const dayPlannedLeaves = leaveRequests
    .filter(leave => 
      selectedDateStr >= leave.start_date && 
      selectedDateStr <= leave.end_date &&
      leave.user_id !== userId
    )
    .map(leave => ({
      id: leave.id,
      user_id: leave.user_id,
      user_name: leave.profiles?.full_name || 'Unknown User',
      user_email: leave.profiles?.email || '',
      user_avatar: leave.profiles?.avatar_url,
      leave_type_name: leave.leave_types?.name || 'Urlop',
      leave_type_color: leave.leave_types?.color || '#3b82f6',
      end_date: leave.end_date
    }))
  
  // 3. Fetch dynamic data (async API calls)
  const workSchedule = await fetchUserSchedule(selectedDateStr)
  const workingTeamMembers = await fetchWorkingTeamMembers(selectedDateStr)
  
  // 4. Determine user's leave status for background
  let userLeaveStatus: 'default' | 'vacation' | 'sick-leave' = 'default'
  const userLeave = leaveRequests.find(leave => 
    leave.user_id === userId && 
    leave.status === 'approved' &&
    selectedDateStr >= leave.start_date && 
    selectedDateStr <= leave.end_date
  )
  
  if (userLeave && userLeave.leave_types) {
    const leaveTypeName = userLeave.leave_types.name || ''
    if (leaveTypeName === 'Urlop wypoczynkowy' || leaveTypeName.toLowerCase().includes('urlop')) {
      userLeaveStatus = 'vacation'
    } else if (leaveTypeName === 'Zwolnienie lekarskie' || leaveTypeName.toLowerCase().includes('zwolnienie')) {
      userLeaveStatus = 'sick-leave'
    } else {
      userLeaveStatus = 'vacation' // Default for other leave types
    }
  }
  
  // 5. Determine day status
  const dayOfWeek = selectedDate.getDay()
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const isWeekend = !workingDays.includes(dayNames[dayOfWeek])
  
  let dayStatus: SelectedDayData['dayStatus']
  if (userLeave && userLeave.leave_types) {
    dayStatus = {
      type: 'leave',
      message: userLeave.leave_types.name || 'Urlop',
      leaveTypeName: userLeave.leave_types.name || 'Urlop'
    }
  } else if (isWeekend && holiday) {
    dayStatus = {
      type: 'weekend',
      message: holiday.name,
      holidayName: holiday.name,
      holidayType: holiday.type as 'national' | 'company'
    }
  } else if (isWeekend) {
    dayStatus = {
      type: 'weekend',
      message: 'Weekend'
    }
  } else if (holiday) {
    dayStatus = {
      type: 'holiday',
      message: holiday.name,
      holidayName: holiday.name,
      holidayType: holiday.type as 'national' | 'company'
    }
  } else if (workSchedule) {
    dayStatus = {
      type: 'working',
      message: `${workSchedule.start} - ${workSchedule.end}`,
      workHours: `${workSchedule.start} - ${workSchedule.end}`
    }
  } else {
    dayStatus = {
      type: 'working',
      message: 'Dzień roboczy'
    }
  }
  
  // 6. Set state and open sheet
  setSelectedDay({
    day,
    month: monthNames[currentDate.getMonth()],
    year: currentDate.getFullYear().toString(),
    dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
    leaves: mappedLeaves,
    holiday: holiday ? { name: holiday.name, type: holiday.type } : undefined,
    birthdays: dayBirthdays,
    plannedLeaves: dayPlannedLeaves,
    workSchedule: workSchedule || undefined,
    workingTeamMembers: workingTeamMembers.length > 0 ? workingTeamMembers : undefined,
    userLeaveStatus,
    dayStatus
  })
  setIsSheetOpen(true)
}
```

**Performance Considerations**:
- Two async API calls (`fetchUserSchedule`, `fetchWorkingTeamMembers`)
- No loading state shown to user [Inference] Should add skeleton UI
- No error handling for failed API calls [Inference] Should add error boundaries

### 4.3 Sheet Structure

#### Header Section

```typescript
<div className="flex flex-col gap-4 p-6">
  <div className="flex flex-col gap-1.5">
    <h2 className="text-xl font-semibold text-foreground">
      Wybrany dzień
    </h2>
  </div>
```

#### Date Card (Dynamic Background)

```typescript
<Card 
  className="border border-border" 
  style={{ 
    backgroundImage: selectedDay.userLeaveStatus === 'vacation' 
      ? 'var(--bg-vacation)' 
      : selectedDay.userLeaveStatus === 'sick-leave'
      ? 'var(--bg-sick-leave)'
      : undefined,
    backgroundColor: selectedDay.userLeaveStatus === 'vacation' || selectedDay.userLeaveStatus === 'sick-leave'
      ? undefined
      : 'var(--bg-default, var(--card-violet))'
  }}
>
  <CardContent className="flex gap-6 items-start">
    <div className="flex flex-1 flex-col gap-4">
      {/* Day name and year */}
      <div className="flex items-center justify-between">
        <p className="text-xl font-normal text-foreground">
          {selectedDay.dayName}
        </p>
        <p className="text-xl font-normal text-muted-foreground">
          {selectedDay.year}
        </p>
      </div>
      
      {/* Day and month */}
      <div className="flex items-end justify-between">
        <p className="text-5xl font-semibold text-foreground">
          {selectedDay.day} {selectedDay.month.toLowerCase()}
        </p>
        {selectedDay.workSchedule?.isReady && (
          <Badge variant="default">Grafik gotowy</Badge>
        )}
      </div>
      
      <Separator />
      
      {/* Day status message */}
      <div className="flex flex-col gap-1">
        {/* Dynamic status based on dayStatus.type */}
      </div>
    </div>
  </CardContent>
</Card>
```

**Background Logic**:
- **vacation**: Uses CSS variable `--bg-vacation` (gradient background) [Inference] Defined in theme
- **sick-leave**: Uses CSS variable `--bg-sick-leave` (different gradient)
- **default**: Uses `--bg-default` or falls back to `--card-violet`

#### Request Leave Section (Conditional)

**Shows When**: `!isFreeDay(selectedDay.day)` (day is not weekend/holiday/personal leave)

```typescript
<Card>
  <CardContent>
    <div className="flex flex-col gap-2">
      <CardHeader className="p-0 pb-2">
        <p className="text-sm font-medium text-foreground">
          Planujesz urlop tego dnia?
        </p>
      </CardHeader>
      <Button 
        variant="outline"
        onClick={() => {
          // Dispatch custom event
          const event = new CustomEvent('openLeaveRequest', {
            detail: { date: selectedDate }
          })
          window.dispatchEvent(event)
          
          // Close sheet
          setSelectedDay(null)
        }}
      >
        <Plus className="h-4 w-4" />
        Złóż wniosek o urlop
      </Button>
    </div>
  </CardContent>
</Card>
```

**Integration**: Dispatches `openLeaveRequest` event that `NewLeaveRequestSheet` listens for

#### Working Team Members Section (Conditional)

**Shows When**: `selectedDay.workingTeamMembers && selectedDay.workingTeamMembers.length > 0`

```typescript
<Card>
  <CardContent>
    <CardHeader className="p-0 pb-3">
      <p className="text-sm font-medium text-foreground">
        Na zmianie będą
      </p>
    </CardHeader>
    <div className="flex flex-col gap-2">
      {selectedDay.workingTeamMembers.map((member) => (
        <div key={member.id} className="flex gap-4 items-center">
          <Avatar className="w-10 h-10">
            <AvatarImage src={member.avatar} />
            <AvatarFallback>
              {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col">
            <p className="font-medium text-foreground">
              {member.name}
            </p>
            {member.teamName && (
              <p className="text-muted-foreground">
                {member.teamName}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

#### Planned Leaves Section (Conditional)

**Shows When**: `selectedDay.plannedLeaves && selectedDay.plannedLeaves.length > 0`

```typescript
<Card>
  <CardContent>
    <CardHeader className="p-0 pb-3">
      <p className="text-sm font-medium text-foreground">
        Zaplanowane urlopy
      </p>
    </CardHeader>
    <div className="flex flex-col gap-2">
      {selectedDay.plannedLeaves.map((leave) => {
        const endDate = new Date(leave.end_date)
        const formattedEndDate = `${endDate.getDate().toString().padStart(2, '0')}.${(endDate.getMonth() + 1).toString().padStart(2, '0')}`
        
        return (
          <div key={leave.id} className="flex gap-4 items-center">
            <Avatar className="w-10 h-10">
              <AvatarImage src={leave.user_avatar} />
              <AvatarFallback>
                {leave.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col">
              <p className="font-medium text-foreground">
                {leave.user_name}
              </p>
              <p className="text-muted-foreground">
                {leave.user_email}
              </p>
            </div>
            <div className="flex flex-col items-end text-sm">
              <p className="font-medium text-foreground">
                {leave.leave_type_name}
              </p>
              <p className="text-muted-foreground">
                do {formattedEndDate}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  </CardContent>
</Card>
```

#### Footer

```typescript
<SheetFooter className="flex flex-row justify-end gap-2 p-6">
  <Button 
    variant="outline" 
    onClick={() => setSelectedDay(null)}
  >
    Zamknij
  </Button>
</SheetFooter>
```

---

## 5. Integration Points

### 5.1 With Dashboard Layout

**File**: `app/dashboard/components/DashboardClient.tsx` lines 119-210

```typescript
<div className="flex gap-4">
  {/* Left Column */}
  <div className="flex-1 flex flex-col gap-4">
    <CurrentDayCard {...} />
    <BirthdayCard {...} />
    <Card>Leave Requests</Card>
    <TeamCard {...} />
  </div>

  {/* Right Column - Calendar */}
  <div className="flex-1">
    <DashboardCalendar {...} />
  </div>
</div>
```

**Layout**: 50/50 split with `flex-1` on both columns

### 5.2 With NewLeaveRequestSheet

**Event System**:

```typescript
// CalendarClient dispatches event
const event = new CustomEvent('openLeaveRequest', {
  detail: { date: selectedDate }
})
window.dispatchEvent(event)

// NewLeaveRequestSheet listens for event
useEffect(() => {
  const handleOpenLeaveRequest = (event: CustomEvent) => {
    const { date } = event.detail
    // Pre-populate form with date
    setStartDate(date)
    setEndDate(date)
    setIsOpen(true)
  }
  
  window.addEventListener('openLeaveRequest', handleOpenLeaveRequest)
  return () => {
    window.removeEventListener('openLeaveRequest', handleOpenLeaveRequest)
  }
}, [])
```

**Location**: `app/leave/components/NewLeaveRequestSheet.tsx`

### 5.3 With React Query Cache

**Mutation Integration**:

When a leave request is created/updated/deleted, the calendar should automatically refetch:

```typescript
// In leave mutations
const queryClient = useQueryClient()

const createLeaveMutation = useMutation({
  mutationFn: createLeaveRequest,
  onSuccess: () => {
    // Invalidate calendar queries
    queryClient.invalidateQueries({ queryKey: ['calendar-leave-requests'] })
  }
})
```

**Current Implementation**: [Unverified] Need to verify if mutations properly invalidate calendar cache

### 5.4 With Team Scope System

**Location**: `app/dashboard/page.tsx` lines 131-183

```typescript
// Admin sees all
if (profile.role === 'admin') {
  teamScope = { type: 'organization', organizationId: profile.organization_id }
  teamMemberIds = allOrgMembers.map(m => m.user_id)
}
// Restriction ON + Has Team
else if (restrictByGroup && userOrg.team_id) {
  teamScope = { type: 'team', teamId: userOrg.team_id, organizationId: profile.organization_id }
  teamMemberIds = teamMembers.map(m => m.user_id)
}
// Everyone else sees all
else {
  teamScope = { type: 'organization', organizationId: profile.organization_id }
  teamMemberIds = allOrgMembers.map(m => m.user_id)
}
```

**Impact on Calendar**:
- Calendar only shows leave requests for `teamMemberIds`
- API endpoint filters by these IDs
- Day details sheet only shows team members within scope

---

## 6. Styling & Theme Integration

### 6.1 Card Wrapper

**Component**: `DashboardCalendar`

```typescript
<Card className="border border-border">
  <CardContent className="p-6">
    {/* Header */}
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <h3 className="text-xl font-semibold text-foreground">
          {calendarTitle}
        </h3>
        <Badge variant="secondary" className="text-xs">
          {badgeText}
        </Badge>
      </div>
    </div>

    {/* Calendar */}
    <div className="mb-6">
      <CalendarClient {...} />
    </div>

    {/* Separator */}
    <Separator className="mb-4" />

    {/* Last update info */}
    {lastUpdateLabel && lastUpdateUser && lastUpdateDate && (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>{lastUpdateLabel}</span>
        <span>{lastUpdateUser}</span>
        <span>{lastUpdateDate}</span>
      </div>
    )}
  </CardContent>
</Card>
```

**Spacing**:
- Card padding: `p-6` (24px)
- Header bottom margin: `mb-6` (24px)
- Calendar bottom margin: `mb-6` (24px)
- Separator bottom margin: `mb-4` (16px)

### 6.2 Month Navigation

```typescript
<div className="flex items-center justify-between h-8">
  <Button
    variant="ghost"
    size="icon"
    onClick={handlePreviousMonth}
    className="h-8 w-8 opacity-50 hover:opacity-100 bg-card"
  >
    <ChevronLeft className="h-4 w-4" />
  </Button>
  
  <h2 className="text-base font-semibold">
    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
  </h2>
  
  <Button
    variant="ghost"
    size="icon"
    onClick={handleNextMonth}
    className="h-8 w-8 opacity-50 hover:opacity-100 bg-card"
  >
    <ChevronRight className="h-4 w-4" />
  </Button>
</div>
```

**UX Details**:
- Buttons are `opacity-50` by default
- Hover increases to `opacity-100`
- Fixed height: `h-8` (32px)
- Icons: `h-4 w-4` (16px)

### 6.3 Day Headers

```typescript
<div className="grid grid-cols-7 gap-2">
  {dayNames.map((dayName) => (
    <div key={dayName} className="flex items-center justify-center h-8">
      <span className="text-xs text-muted-foreground font-normal">
        {dayName}
      </span>
    </div>
  ))}
</div>
```

**Styling**:
- Grid: 7 columns, 8px gap
- Height: `h-8` (32px)
- Text: `text-xs` (12px), `text-muted-foreground`

### 6.4 Calendar Grid

```typescript
<div className="grid grid-cols-7 gap-2">
  {/* Day cells */}
</div>
```

**Grid**:
- 7 columns (Monday-Sunday)
- 8px gap between cells
- 6 rows (42 days total)

### 6.5 Theme Variables Used

```css
/* Used in calendar and day sheet */
--bg-vacation: /* Gradient background for vacation days */
--bg-sick-leave: /* Gradient background for sick leave days */
--bg-default: /* Default background */
--card-violet: /* Fallback card color */
--accent: /* Calendar cell background */
--foreground: /* Text color */
--muted-foreground: /* Secondary text */
--border: /* Border color */
```

[Unverified] Need to verify exact gradient definitions in theme configuration

---

## 7. Performance Analysis

### 7.1 Initial Load

**Server-Side (Dashboard Page)**:
1. User authentication: ~50ms
2. Profile + organization fetch: ~100ms
3. Team scope calculation: ~50ms
4. Team members fetch: ~150ms
5. Colleagues with birthdays: ~100ms

**Total SSR**: ~450ms [Inference] Based on typical query times

**Client-Side (CalendarClient)**:
1. React Query: Leave requests fetch: ~200ms (with 30s cache)
2. Holidays fetch: ~150ms
3. Component render: ~50ms

**Total Client**: ~400ms [Inference] Based on typical API response times

**Overall Initial Load**: ~850ms [Inference] Sum of SSR and client-side

### 7.2 Month Navigation

**Operations**:
1. State update: `setCurrentDate(newDate)` - ~5ms
2. React Query refetch (automatic): ~200ms
3. Holidays refetch (useEffect): ~150ms
4. Re-render calendar grid: ~50ms

**Total**: ~405ms [Inference] User sees loading briefly

**Optimization Opportunity**: Pre-fetch adjacent months

### 7.3 Day Click

**Operations**:
1. Data collection (leaves, holidays, birthdays): ~5ms (in-memory)
2. API call: `fetchUserSchedule()`: ~150ms
3. API call: `fetchWorkingTeamMembers()`: ~200ms
4. State update + sheet open: ~20ms

**Total**: ~375ms [Inference] Noticeable delay before sheet opens

**Optimization Opportunity**: Show loading skeleton immediately

### 7.4 React Query Caching

**Current Configuration**:
```typescript
{
  queryKey: ['calendar-leave-requests', startOfMonth, endOfMonth, teamMemberIds.join(',')],
  staleTime: 1000 * 30, // 30 seconds
  enabled: !!organizationId && teamMemberIds.length > 0
}
```

**Cache Behavior**:
- Fresh data: 0-30 seconds (no refetch)
- Stale data: 30+ seconds (refetch in background, show cached)
- Window focus: Always refetch if stale
- Manual invalidation: On leave request mutations

**Memory Usage**: [Inference] ~10-50KB per month depending on leave requests count

### 7.5 Performance Bottlenecks

1. **Holidays not using React Query**: Extra network requests, no caching benefits
2. **No loading states**: User sees stale data or blank UI
3. **Synchronous day click**: Blocks UI for ~375ms
4. **No prefetching**: Adjacent months not preloaded
5. **Avatar images**: No lazy loading or optimization

---

## 8. Accessibility

### 8.1 Keyboard Navigation

**Current Support**:
- Sheet: Can close with Escape (Radix UI default) ✅
- Month navigation buttons: Tab-accessible ✅
- Calendar day buttons: Tab-accessible ✅
- Sheet close button: Tab-accessible ✅

**Missing**:
- Arrow key navigation between days ❌
- Enter/Space to open day details ❌ [Inference] Only click works
- Focus indicator on calendar days ❌

### 8.2 Screen Reader Support

**Good Practices**:
```typescript
<SheetTitle className="sr-only">
  Szczegóły wybranego dnia
</SheetTitle>
```

**Issues**:
1. Calendar grid has no `role="grid"` or ARIA attributes ❌
2. Day cells missing `aria-label` with full date ❌
3. Leave avatars have no alt text ❌
4. Holiday/birthday indicators are emoji without text alternative ❌

**Recommendation**: Add comprehensive ARIA attributes

### 8.3 Color Contrast

**Verified** [Inference]:
- `text-foreground` on `bg-accent`: Meets WCAG AA ✅
- `text-muted-foreground`: May fail WCAG AAA ⚠️
- Holiday emoji: Good visibility ✅
- Avatar overlapping: Border helps contrast ✅

### 8.4 Focus Management

**Sheet Behavior**:
- Opening sheet: Focus moves to close button (Radix UI default) ✅
- Closing sheet: Focus returns to... [Unverified] Need to verify focus return

---

## 9. Internationalization (i18n)

### 9.1 Current State

**Hardcoded Polish Text**:
```typescript
// Calendar grid
"Kalendarz urlopów"
"Twój kalendarz"
"Ostatnia aktualizacja"
"Paweł Chróściak" // [Unverified] Hardcoded name
"28.06.2025"      // [Unverified] Hardcoded date

// Month names
const monthNames = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
]

// Day names
const dayNames = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela']

// Day sheet
"Wybrany dzień"
"Planujesz urlop tego dnia?"
"Złóż wniosek o urlop"
"Na zmianie będą"
"Zaplanowane urlopy"
"Zamknij"
"Grafik gotowy"
"Masz urlop"
"Weekend"
"Święto narodowe"
"Święto firmowe"
"Tego dnia pracujesz"
```

### 9.2 Translation Structure

**Recommended Structure** (using `next-intl`):

```json
// messages/pl.json
{
  "calendar": {
    "title": "Kalendarz urlopów",
    "badge": "Twój kalendarz",
    "lastUpdate": "Ostatnia aktualizacja",
    "months": {
      "january": "Styczeń",
      "february": "Luty",
      // ... etc
    },
    "days": {
      "monday": "Poniedziałek",
      "tuesday": "Wtorek",
      // ... etc
    },
    "sheet": {
      "title": "Wybrany dzień",
      "planLeave": "Planujesz urlop tego dnia?",
      "submitRequest": "Złóż wniosek o urlop",
      "workingMembers": "Na zmianie będą",
      "plannedLeaves": "Zaplanowane urlopy",
      "close": "Zamknij",
      "scheduleReady": "Grafik gotowy",
      "yourLeave": "Masz urlop",
      "weekend": "Weekend",
      "nationalHoliday": "Święto narodowe",
      "companyHoliday": "Święto firmowe",
      "workingDay": "Tego dnia pracujesz"
    }
  }
}
```

**Implementation**:
```typescript
import { useTranslations } from 'next-intl'

const t = useTranslations('calendar')

// Usage
<h3>{t('title')}</h3>
<Badge>{t('badge')}</Badge>
```

### 9.3 Date Formatting

**Current**: Mix of manual and `toLocaleDateString`

**Recommended**: Use `next-intl` date formatting

```typescript
import { useFormatter } from 'next-intl'

const format = useFormatter()

// Month name
format.dateTime(currentDate, { month: 'long' })

// Day name
format.dateTime(selectedDate, { weekday: 'long' })

// Full date
format.dateTime(selectedDate, { 
  day: 'numeric', 
  month: 'long', 
  year: 'numeric' 
})
```

---

## 10. Issues & Observations

### 10.1 Critical Issues

1. **Hardcoded "Last Update" Information** [[memory:10285]]
   - **Location**: `DashboardClient.tsx` lines 206-207
   - **Issue**: `lastUpdateUser="Paweł Chróściak"` and `lastUpdateDate="28.06.2025"` are hardcoded
   - **Impact**: Misleading information, breaks user preference against hardcoded values [[memory:3197842]]
   - **Fix**: Either remove or fetch from actual data source

2. **Missing Loading States**
   - **Issue**: Calendar shows nothing while fetching data
   - **Impact**: Poor UX, users don't know if app is working
   - **Fix**: Add skeleton UI for calendar grid and sheet

3. **No Error Handling in Day Click**
   - **Issue**: If `fetchUserSchedule` or `fetchWorkingTeamMembers` fails, error is silent
   - **Impact**: Sheet opens with incomplete data, no user feedback
   - **Fix**: Add error boundaries and user-friendly error messages

4. **Holidays Not Using React Query**
   - **Issue**: Holidays use `useState` + `useEffect` instead of React Query
   - **Impact**: No caching, no automatic refetching, inconsistent with leave requests
   - **Fix**: Migrate holidays to React Query with same cache strategy

### 10.2 Performance Issues

5. **No Prefetching of Adjacent Months**
   - **Issue**: Clicking next/prev month requires full API roundtrip
   - **Impact**: ~400ms delay on every month change
   - **Fix**: Prefetch next/prev months on hover or automatically

6. **Synchronous Day Click Blocks UI**
   - **Issue**: `handleDayClick` is async but doesn't show loading state
   - **Impact**: UI feels sluggish, ~375ms delay before sheet opens
   - **Fix**: Open sheet immediately with loading skeleton

7. **Avatar Images Not Optimized**
   - **Issue**: Raw URLs without lazy loading or Next.js Image optimization
   - **Impact**: Slower calendar rendering, especially with many avatars
   - **Fix**: Use Next.js `<Image>` component or lazy load avatars

### 10.3 Accessibility Issues

8. **Missing ARIA Attributes on Calendar Grid**
   - **Issue**: Calendar grid has no semantic structure for screen readers
   - **Impact**: Screen reader users can't navigate calendar effectively
   - **Fix**: Add `role="grid"`, `role="gridcell"`, `aria-label` attributes

9. **Emoji Without Text Alternatives**
   - **Issue**: Holiday (🇵🇱, 🏢) and birthday (🎁) indicators use emoji without `aria-label`
   - **Impact**: Screen readers announce raw emoji or nothing
   - **Fix**: Add `aria-label` or use proper icon components

10. **Focus Management in Sheet**
    - **Issue**: Focus return after closing sheet is unclear
    - **Impact**: Keyboard users may lose context
    - **Fix**: Verify focus returns to clicked day button

### 10.4 Internationalization Issues

11. **All Text Hardcoded in Polish**
    - **Issue**: No i18n implementation despite project having `next-intl` [[memory:10304]]
    - **Impact**: English users see Polish text, violates project standards
    - **Fix**: Migrate all text to translation keys

12. **Inconsistent Date Formatting**
    - **Issue**: Mix of `toLocaleDateString`, manual string construction, and formatted strings
    - **Impact**: Potential locale bugs, hard to maintain
    - **Fix**: Use `next-intl` formatter consistently

### 10.5 Code Quality Issues

13. **Console.log Statements in Production**
    - **Locations**: Lines 118, 152, 213, 321, 344, etc.
    - **Impact**: Console noise, potential performance impact
    - **Fix**: Remove or gate behind `process.env.NODE_ENV === 'development'`

14. **Duplicate Logic in `isFreeDay` and Day Status**
    - **Issue**: Similar logic repeated in `isFreeDay()` and `handleDayClick` day status determination
    - **Impact**: Hard to maintain, potential for inconsistencies
    - **Fix**: Extract shared logic into reusable helper

15. **Magic Numbers and Strings**
    - **Examples**: 
      - `42` (days in calendar grid) - should be constant
      - `'Urlop wypoczynkowy'` - should use enum or constant
      - `'vacation'`, `'sick-leave'` - should use type-safe enum
    - **Impact**: Hard to maintain, violates DRY principle
    - **Fix**: Extract to constants file

### 10.6 UX Issues

16. **Today's Date Not Visually Distinguished**
    - **Issue**: `isToday` sets same `bg-accent` as other days
    - **Impact**: Users can't quickly identify today
    - **Fix**: Add distinct background or border for today

17. **No Visual Feedback During Month Navigation**
    - **Issue**: Month changes but no loading indicator
    - **Impact**: Users don't know if click registered
    - **Fix**: Show loading state during refetch

18. **Sheet Opens With Delay**
    - **Issue**: ~375ms delay before sheet opens (API calls)
    - **Impact**: Feels sluggish, users may double-click
    - **Fix**: Open sheet immediately, show loading inside

19. **No Indication of More Than 2 People on Leave**
    - **Issue**: "+N" badge is tiny and easy to miss
    - **Impact**: Users might not realize multiple people are on leave
    - **Fix**: Consider larger badge or tooltip

### 10.7 Data Issues

20. **Team Scope Logic is Complex**
    - **Location**: `app/dashboard/page.tsx` lines 131-183
    - **Issue**: Multiple nested conditions for determining who sees whose calendar
    - **Impact**: Hard to understand, test, and maintain
    - **Fix**: Extract to separate function with clear documentation

21. **Birthday Calculation Doesn't Handle Edge Cases**
    - **Issue**: Simple string comparison `'MM-DD' === 'MM-DD'`
    - **Edge Cases**: Leap year birthdays, invalid dates, null handling
    - **Impact**: Potential crashes or incorrect birthdays shown
    - **Fix**: Use date library (date-fns) for robust comparison

---

## 11. Recommendations

### 11.1 High Priority (Breaking Issues)

1. **Remove Hardcoded Last Update Info** [[memory:3197842]]
   ```typescript
   // Current (BAD)
   lastUpdateUser="Paweł Chróściak"
   lastUpdateDate="28.06.2025"
   
   // Fix 1: Remove entirely
   // lastUpdateLabel={undefined}
   // lastUpdateUser={undefined}
   // lastUpdateDate={undefined}
   
   // Fix 2: Fetch from real data
   // const lastUpdate = await getLastCalendarUpdate(organizationId)
   // lastUpdateUser={lastUpdate.user.name}
   // lastUpdateDate={format(lastUpdate.date, 'dd.MM.yyyy')}
   ```

2. **Add Loading States**
   ```typescript
   // Calendar grid skeleton
   {isLoadingLeaveRequests ? (
     <CalendarSkeleton />
   ) : (
     <CalendarGrid />
   )}
   
   // Day sheet skeleton
   {isLoadingSchedule ? (
     <SheetSkeleton />
   ) : (
     <SheetContent />
   )}
   ```

3. **Add Error Handling**
   ```typescript
   const handleDayClick = async (day: number) => {
     try {
       const workSchedule = await fetchUserSchedule(selectedDateStr)
       const workingTeamMembers = await fetchWorkingTeamMembers(selectedDateStr)
       // ... rest of logic
     } catch (error) {
       console.error('Error fetching day details:', error)
       toast.error('Nie udało się pobrać szczegółów dnia')
       return
     }
   }
   ```

4. **Migrate Holidays to React Query**
   ```typescript
   const { data: holidays = [] } = useQuery({
     queryKey: ['calendar-holidays', year, month, countryCode],
     queryFn: async () => {
       const params = new URLSearchParams({
         year: year.toString(),
         month: month.toString(),
         country_code: countryCode
       })
       const response = await fetch(`/api/calendar/holidays?${params}`)
       return await response.json()
     },
     staleTime: 1000 * 60 * 60 * 24, // 24 hours (holidays rarely change)
     enabled: !!organizationId
   })
   ```

### 11.2 Medium Priority (UX & Performance)

5. **Add Prefetching**
   ```typescript
   const queryClient = useQueryClient()
   
   // Prefetch next month on hover
   const handleNextMonthHover = () => {
     const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
     const startDate = /* calculate */
     const endDate = /* calculate */
     
     queryClient.prefetchQuery({
       queryKey: ['calendar-leave-requests', startDate, endDate, teamMemberIds.join(',')],
       queryFn: () => fetchLeaveRequests(startDate, endDate, teamMemberIds)
     })
   }
   ```

6. **Highlight Today's Date**
   ```typescript
   className={`
     relative h-24 rounded-lg flex flex-col cursor-pointer transition-colors
     ${dayData.isOutside 
       ? 'opacity-50 bg-accent' 
       : dayData.isToday 
         ? 'bg-primary/10 ring-2 ring-primary' // DISTINCT HIGHLIGHT
         : 'bg-accent hover:bg-accent/80'
     }
   `}
   ```

7. **Optimize Avatar Images**
   ```typescript
   import Image from 'next/image'
   
   <Avatar className="w-8 h-8">
     {leave.profiles?.avatar_url ? (
       <Image 
         src={leave.profiles.avatar_url} 
         alt={leave.profiles.full_name}
         width={32}
         height={32}
         loading="lazy"
       />
     ) : (
       <AvatarFallback>...</AvatarFallback>
     )}
   </Avatar>
   ```

8. **Add Visual Feedback During Navigation**
   ```typescript
   const [isNavigating, setIsNavigating] = useState(false)
   
   const handleNextMonth = () => {
     setIsNavigating(true)
     setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
     // isNavigating will be set to false when data loads
   }
   
   // In render
   {isNavigating && <LoadingOverlay />}
   ```

### 11.3 Low Priority (Polish & Maintenance)

9. **Add Internationalization**
   ```typescript
   import { useTranslations } from 'next-intl'
   
   const t = useTranslations('calendar')
   
   <h3>{t('title')}</h3>
   <p>{t('sheet.planLeave')}</p>
   ```

10. **Add ARIA Attributes**
    ```typescript
    <div 
      role="grid" 
      aria-label={t('calendar.ariaLabel', { month: monthNames[month], year })}
    >
      {/* Day headers */}
      <div role="row">
        {dayNames.map((dayName) => (
          <div key={dayName} role="columnheader">
            {dayName}
          </div>
        ))}
      </div>
      
      {/* Calendar days */}
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} role="row">
          {week.map((dayData, dayIndex) => (
            <button
              key={`${weekIndex}-${dayIndex}`}
              role="gridcell"
              aria-label={getFullDateLabel(dayData)}
              aria-selected={dayData.isToday}
              onClick={() => handleDayClick(dayData.day)}
            >
              {/* Cell content */}
            </button>
          ))}
        </div>
      ))}
    </div>
    ```

11. **Extract Constants**
    ```typescript
    // constants/calendar.ts
    export const CALENDAR_GRID_SIZE = 42 // 6 weeks × 7 days
    export const LEAVE_TYPE_NAMES = {
      VACATION: 'Urlop wypoczynkowy',
      SICK_LEAVE: 'Zwolnienie lekarskie'
    } as const
    export const USER_LEAVE_STATUS = {
      DEFAULT: 'default',
      VACATION: 'vacation',
      SICK_LEAVE: 'sick-leave'
    } as const
    ```

12. **Remove Console Logs**
    ```typescript
    // Use a logger utility instead
    import { logger } from '@/lib/logger'
    
    // Development only logging
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Calendar rendering', { organizationId, userId })
    }
    ```

13. **Extract Team Scope Logic**
    ```typescript
    // lib/calendar-utils.ts
    export function calculateTeamScope(
      profile: Profile,
      userOrg: UserOrg,
      restrictByGroup: boolean,
      allOrgMembers: User[]
    ): { teamScope: TeamScope; teamMemberIds: string[] } {
      // Clear, testable logic
    }
    ```

14. **Use Date Library for Birthday Comparison**
    ```typescript
    import { isSameDay, parse } from 'date-fns'
    
    const getBirthdaysForDay = (day: number) => {
      const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      
      return colleagues.filter(colleague => {
        if (!colleague.birth_date) return false
        
        try {
          const birthDate = parse(colleague.birth_date, 'yyyy-MM-dd', new Date())
          return isSameDay(
            new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day),
            new Date(selectedDate.getFullYear(), birthDate.getMonth(), birthDate.getDate())
          )
        } catch {
          return false
        }
      })
    }
    ```

---

## 12. Testing Considerations

### 12.1 Unit Tests

**Key Functions to Test**:
1. `generateCalendarDays()` - Various months, edge cases
2. `getLeaveRequestsForDay()` - Date overlap logic
3. `getHolidayForDay()` - Exact date matching
4. `getBirthdaysForDay()` - Birthday matching ignoring year
5. `isFreeDay()` - Weekend/holiday/leave logic

**Example Test**:
```typescript
describe('generateCalendarDays', () => {
  it('should always generate 42 days', () => {
    const result = generateCalendarDays(new Date(2025, 6, 1))
    expect(result).toHaveLength(42)
  })
  
  it('should mark current day as isToday', () => {
    const today = new Date()
    const result = generateCalendarDays(today)
    const todayCell = result.find(day => day.isToday)
    expect(todayCell).toBeDefined()
    expect(todayCell?.day).toBe(today.getDate())
  })
  
  it('should handle month with 31 days', () => {
    const result = generateCalendarDays(new Date(2025, 6, 1)) // July
    const currentMonthDays = result.filter(day => day.isCurrentMonth)
    expect(currentMonthDays).toHaveLength(31)
  })
})
```

### 12.2 Integration Tests

**User Flows to Test**:
1. Navigate to dashboard → see calendar with current month
2. Click next/previous month → calendar updates
3. Click on day with leave → sheet opens with correct data
4. Click on day without leave → sheet shows "Request Leave" section
5. Click "Złóż wniosek o urlop" → leave request sheet opens

**Example Test**:
```typescript
describe('Calendar Integration', () => {
  it('should open day details sheet when clicking a day', async () => {
    render(<CalendarClient {...mockProps} />)
    
    const dayButton = screen.getByText('15')
    await userEvent.click(dayButton)
    
    expect(await screen.findByText('Wybrany dzień')).toBeInTheDocument()
  })
  
  it('should show planned leaves in sheet', async () => {
    render(<CalendarClient {...mockPropsWithLeaves} />)
    
    const dayButton = screen.getByText('15')
    await userEvent.click(dayButton)
    
    expect(await screen.findByText('Zaplanowane urlopy')).toBeInTheDocument()
    expect(screen.getByText('Jan Kowalski')).toBeInTheDocument()
  })
})
```

### 12.3 E2E Tests

**Critical Paths**:
1. Full dashboard load → calendar visible
2. Month navigation works
3. Day click → sheet opens
4. Leave request flow from calendar

**Example Test** (Playwright):
```typescript
test('calendar day click opens sheet', async ({ page }) => {
  await page.goto('/dashboard')
  
  // Wait for calendar to load
  await page.waitForSelector('[data-testid="calendar-grid"]')
  
  // Click on day 15
  await page.click('button:has-text("15")')
  
  // Verify sheet opened
  await expect(page.locator('text=Wybrany dzień')).toBeVisible()
})
```

---

## 13. Related Documentation

- **Calendar Day Sheet Analysis**: `docs/analysis-calendar-day-sheet.md`
- **Dashboard Components**: `docs/dashboard-architecture.md` [Unverified] File existence
- **Team Scope System**: `docs/team-scope.md` [Unverified] File existence
- **React Query Setup**: `docs/data-fetching.md` [Unverified] File existence

---

## 14. Conclusion

The Dashboard Calendar Card is a sophisticated component with comprehensive functionality for displaying leave requests, holidays, and birthdays. However, it suffers from several critical issues:

1. **Hardcoded values** that violate project standards [[memory:3197842]]
2. **Missing loading states** that create poor UX
3. **Inconsistent data fetching** (React Query for leaves, useEffect for holidays)
4. **No internationalization** despite project using next-intl [[memory:10304]]
5. **Limited accessibility** support

The component's architecture is sound, leveraging React Query for caching and Radix UI for accessible components. With the recommended fixes, particularly addressing hardcoded values and adding proper loading/error states, this component can become production-ready and maintainable.

**Priority Fixes**:
1. Remove hardcoded "last update" info
2. Add loading states
3. Migrate holidays to React Query
4. Add error handling
5. Implement i18n

**Estimated Effort**: 2-3 days for high-priority fixes, 1-2 weeks for complete refactor with all recommendations.

