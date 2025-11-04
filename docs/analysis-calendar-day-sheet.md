# Calendar Day Details Sheet - Analysis

## Overview

The calendar day details sheet is a modal sidebar that opens when users click on any calendar day in both the dashboard calendar widget and the full calendar page. It displays comprehensive information about the selected day including leave requests, holidays, birthdays, and provides actions for requesting leave.

## Implementation Location

**Primary Component**: `app/calendar/components/CalendarClient.tsx`  
**Lines**: 568-759 (Sheet implementation)  
**Used By**: 
- Dashboard: `app/dashboard/components/DashboardCalendar.tsx` (wraps CalendarClient)
- Calendar Page: `app/calendar/page.tsx` (uses CalendarClient directly)

## Component Architecture

### 1. Sheet Trigger

**Location**: `CalendarClient.tsx` lines 318-375

```318:375:app/calendar/components/CalendarClient.tsx
  const handleDayClick = (day: number) => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const dayName = selectedDate.toLocaleDateString('pl-PL', { weekday: 'long' })
    
    // Find holiday for this day
    const holiday = getHolidayForDay(day)
    const isFree = isFreeDay(day)
    
    console.log('🎯 Day clicked:', { day, selectedDate, holiday, isFree })
    
    // Get leave requests for this day
    const dayLeaves = getLeaveRequestsForDay(day)
    const mappedLeaves = dayLeaves.map(leave => ({
      id: leave.id,
      name: leave.profiles?.first_name ? `${leave.profiles.first_name} ${leave.profiles.last_name}` : 'Unknown User',
      email: leave.profiles?.email || '',
      type: leave.leave_types?.name || 'Urlop',
      endDate: leave.end_date,
      avatar_url: leave.profiles?.avatar_url,
      icon: <TreePalm className="h-4 w-4" />
    }))

    // Get birthdays for this day
    const dayBirthdays = getBirthdaysForDay(day)

    // Get planned leaves for this day (team members on leave on this specific date)
    const selectedDateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    
    const dayPlannedLeaves = leaveRequests
      .filter(leave => {
        // Check if the selected date falls within the leave period and exclude your own requests
        return selectedDateStr >= leave.start_date && 
               selectedDateStr <= leave.end_date &&
               leave.user_id !== userId
      })
      .map(leave => ({
        id: leave.id,
        user_id: leave.user_id,
        user_name: leave.profiles?.full_name || `${leave.profiles?.first_name || ''} ${leave.profiles?.last_name || ''}`.trim() || 'Unknown User',
        user_email: leave.profiles?.email || '',
        user_avatar: leave.profiles?.avatar_url,
        leave_type_name: leave.leave_types?.name || 'Urlop',
        leave_type_color: leave.leave_types?.color || '#3b82f6',
        end_date: leave.end_date
      }))

    setSelectedDay({
      day,
      month: monthNames[currentDate.getMonth()],
      year: currentDate.getFullYear().toString(),
      dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      leaves: mappedLeaves,
      holiday: holiday ? { name: holiday.name, type: holiday.type } : undefined,
      birthdays: dayBirthdays,
      plannedLeaves: dayPlannedLeaves
    })
    setIsSheetOpen(true)
  }
```

**Data Collection**:
- Date information (day, month, year, day name)
- Holiday information (if applicable)
- Leave requests for the day (team members on leave)
- Birthdays for the day
- Planned leaves (excluding user's own requests)
- Free day status (weekend/holiday/personal leave)

### 2. Sheet Structure

**Location**: `CalendarClient.tsx` lines 568-759

**Base Component**: Uses Radix UI Dialog (via `@/components/ui/sheet`)  
**Size**: `size="content"` = Fixed 560px width (from `sheet.tsx` line 68)  
**Side**: Right side (default)  
**State Management**: Controlled by `selectedDay` state (null when closed)

```568:759:app/calendar/components/CalendarClient.tsx
      {/* Day Details Sheet */}
      <Sheet open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <SheetContent size="content">
          {/* Accessibility title - visually hidden */}
          <SheetTitle className="sr-only">
            Szczegóły wybranego dnia
          </SheetTitle>
          
          <div className="p-6">
            {/* Header */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Wybrany dzień
              </h2>
            </div>

            {selectedDay && (
              <>
                {/* Date Card - Exact Figma layout with separate date box */}
                <div className="flex items-start gap-6 mb-4">
                  {/* Date Box - Separate contained card */}
                  <div className="bg-card border border rounded-lg p-4 text-center min-w-[80px]">
                    <div className="text-4xl font-bold text-foreground">
                      {selectedDay.day}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {selectedDay.month}
                    </div>
                  </div>
                  
                  {/* Date Info - Next to the date box */}
                  <div className="flex-1 pt-2">
                    <div className="text-lg font-medium text-foreground">
                      {selectedDay.day} {selectedDay.month.toLowerCase()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedDay.dayName.toLowerCase()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedDay.year}
                    </div>
                  </div>
                </div>

                {/* Request Leave Section - Only show if you don't already have leave on this day */}
                {!isFreeDay(selectedDay.day) && (
                  <div className="bg-card border border rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-foreground">
                        Planujesz urlop tego dnia?
                      </p>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Button 
                      className="bg-foreground text-white hover:bg-foreground/90"
                      onClick={() => {
                        // Create date object from selected day
                        const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay.day)
                        
                        // Dispatch custom event with the selected date
                        const event = new CustomEvent('openLeaveRequest', {
                          detail: { date: selectedDate }
                        })
                        window.dispatchEvent(event)
                        
                        // Close the current day details sheet
                        setSelectedDay(null)
                      }}
                    >
                      Złóż wniosek o urlop
                    </Button>
                  </div>
                )}

                {/* Day Status - Only show if it's a free day */}
                {isFreeDay(selectedDay.day) && (
                  <div className="bg-green-100 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-foreground">
                        Status dnia
                      </h3>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-base font-semibold text-foreground">
                      {selectedDay.holiday 
                        ? `Święto: ${selectedDay.holiday.name}`
                        : (() => {
                            // Check if you have leave on this day
                            const selectedDateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDay.day.toString().padStart(2, '0')}`
                            const personalLeave = leaveRequests.find(leave => 
                              leave.user_id === userId && 
                              leave.status === 'approved' &&
                              selectedDateStr >= leave.start_date && 
                              selectedDateStr <= leave.end_date
                            )
                            
                            return personalLeave 
                              ? personalLeave.leave_types?.name || 'Urlop'
                              : 'Dziś masz wolne'
                          })()
                      }
                    </p>
                  </div>
                )}

                {/* Birthday Section - Only show if there are birthdays */}
                {selectedDay.birthdays && selectedDay.birthdays.length > 0 && (
                  <div className="bg-card border border rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-foreground">
                        Dziś urodziny obchodzi
                      </h3>
                      <Gift className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      {selectedDay.birthdays.map((birthday) => {
                        const birthDate = new Date(birthday.birth_date)
                        const formattedDate = `${birthDate.getDate()} ${monthNames[birthDate.getMonth()].toLowerCase()}`
                        
                        return (
                          <div key={birthday.id} className="text-sm">
                            <p className="font-medium text-foreground">{birthday.full_name}</p>
                            <p className="text-muted-foreground">{formattedDate}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Planned Leaves Section - unified with Figma design */}
                {selectedDay.plannedLeaves && selectedDay.plannedLeaves.length > 0 && (
                  <div className="bg-card border border rounded-lg p-4">
                    <div className="flex flex-row gap-3 items-start w-full mb-3">
                      <Info className="w-4 h-4 text-foreground mt-0.5 shrink-0" />
                      <div className="text-sm font-medium leading-5 text-foreground">
                        Zaplanowane urlopy
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-8 w-full">
                      {selectedDay.plannedLeaves.map((leave) => {
                        const endDate = new Date(leave.end_date)
                        const formattedEndDate = `${endDate.getDate().toString().padStart(2, '0')}.${(endDate.getMonth() + 1).toString().padStart(2, '0')}`
                        
                        return (
                          <div key={leave.id} className="flex flex-row gap-4 items-center justify-start min-w-[85px] w-full">
                            <Avatar className="w-10 h-10 rounded-full bg-muted">
                              <AvatarImage src={leave.user_avatar || undefined} />
                              <AvatarFallback className="">
                                {leave.user_name.split(' ').map(n => n[0]).join('') || leave.user_email[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="basis-0 flex flex-col grow items-start justify-start min-h-px min-w-px">
                              <div className="font-medium text-sm text-foreground leading-5 w-full overflow-ellipsis overflow-hidden">
                                {leave.user_name}
                              </div>
                              <div className="font-normal text-sm text-muted-foreground leading-5 w-full overflow-ellipsis overflow-hidden">
                                {leave.user_email}
                              </div>
                            </div>
                            <div className="flex flex-col items-end justify-center text-sm text-right">
                              <div className="font-medium text-foreground leading-5">
                                {leave.leave_type_name}
                              </div>
                              <div className="font-normal text-muted-foreground leading-5">
                                do {formattedEndDate}
                              </div>
                            </div>
                            <div className="bg-cyan-200 rounded-lg shrink-0 w-10 h-10 flex items-center justify-center">
                              <TreePalm className="w-6 h-6 text-foreground" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Footer with Close button - positioned right */}
          <SheetFooter className="flex flex-row justify-end mt-auto p-4 gap-2">
            <Button 
              variant="outline" 
              onClick={() => setSelectedDay(null)}
            >
              Zamknij
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
```

## Sheet Sections

### 1. Header
- **Title**: "Wybrany dzień" (Selected Day)
- Simple text header with no interactive elements

### 2. Date Card
**Layout**: Flexbox with two sections side-by-side
- **Left**: Date box (card with large day number + month)
- **Right**: Full date information (day name, year)
- **Styling**: 
  - Date box: `bg-card border rounded-lg p-4 min-w-[80px]`
  - Day number: `text-4xl font-bold`
  - Month: `text-sm text-muted-foreground`

### 3. Request Leave Section (Conditional)
**Shows When**: Day is NOT a free day (`!isFreeDay(selectedDay.day)`)
- **Content**: "Planujesz urlop tego dnia?" with Calendar icon
- **Action Button**: "Złóż wniosek o urlop"
- **Behavior**: 
  - Dispatches `openLeaveRequest` custom event with selected date
  - Closes the day details sheet
  - Opens `NewLeaveRequestSheet` (listened to by that component)

### 4. Day Status Section (Conditional)
**Shows When**: Day IS a free day (`isFreeDay(selectedDay.day)`)
- **Background**: `bg-green-100`
- **Content**: 
  - If holiday: "Święto: {holiday name}"
  - If personal leave: Shows leave type name
  - Otherwise: "Dziś masz wolne"
- **Logic**: Checks for approved personal leave on the selected date

### 5. Birthday Section (Conditional)
**Shows When**: `selectedDay.birthdays.length > 0`
- **Header**: "Dziś urodziny obchodzi" with Gift icon
- **Content**: List of colleagues with birthdays
  - Full name (bold)
  - Formatted birth date (dd month format)

### 6. Planned Leaves Section (Conditional)
**Shows When**: `selectedDay.plannedLeaves.length > 0`
- **Header**: "Zaplanowane urlopy" with Info icon
- **Layout**: Vertical list of team members on leave
- **Each Item Contains**:
  - Avatar (with fallback initials)
  - Name and email
  - Leave type name and end date (right-aligned)
  - TreePalm icon in cyan background box

### 7. Footer
- **Close Button**: "Zamknij" (Close)
- **Position**: Right-aligned
- **Action**: Sets `selectedDay` to null (closes sheet)

## Data Flow

### Opening the Sheet
1. User clicks calendar day button
2. `handleDayClick(day)` executes
3. Data collection:
   - Date calculations
   - Holiday lookup (`getHolidayForDay`)
   - Leave requests lookup (`getLeaveRequestsForDay`)
   - Birthdays lookup (`getBirthdaysForDay`)
   - Planned leaves filtering
4. State update: `setSelectedDay({...})` with all collected data
5. Sheet opens: `open={!!selectedDay}` becomes true

### Closing the Sheet
1. User clicks close button OR clicks overlay
2. `onOpenChange={() => setSelectedDay(null)}` executes
3. `selectedDay` becomes null
4. Sheet closes: `open={!!selectedDay}` becomes false

### Integration with Leave Request Sheet
1. User clicks "Złóż wniosek o urlop" button
2. Custom event dispatched:
   ```typescript
   const event = new CustomEvent('openLeaveRequest', {
     detail: { date: selectedDate }
   })
   window.dispatchEvent(event)
   ```
3. `NewLeaveRequestSheet` component (in both dashboard and calendar pages) listens for this event
4. `NewLeaveRequestSheet` opens with pre-populated date range

## Key Dependencies

### React Query
- **Usage**: Fetches leave requests with caching
- **Query Key**: `['calendar-leave-requests', startOfMonth, endOfMonth, teamMemberIds.join(',')]`
- **Cache Duration**: 30 seconds
- **Location**: Lines 123-178

### State Management
- `selectedDay`: `SelectedDayData | null` - Controls sheet visibility and content
- `currentDate`: Controls which month is displayed
- `holidays`: Array of holiday data
- `leaveRequests`: Array of leave request data (from React Query)

### Helper Functions
- `getLeaveRequestsForDay(day)`: Filters leave requests for specific day
- `getHolidayForDay(day)`: Finds holiday for specific day
- `getBirthdaysForDay(day)`: Finds birthdays for specific day
- `isFreeDay(day)`: Determines if day is weekend/holiday/personal leave

## Styling Details

### Sheet Container
- **Width**: 560px (fixed via `size="content"`)
- **Side**: Right
- **Padding**: `p-6` (24px) on main content
- **Border**: `border border-border rounded-lg`

### Date Box
- **Min Width**: 80px
- **Padding**: `p-4` (16px)
- **Background**: `bg-card`
- **Day Number**: `text-4xl font-bold`
- **Month**: `text-sm text-muted-foreground`

### Conditional Sections
- **Request Leave Card**: `bg-card border rounded-lg p-4`
- **Day Status Card**: `bg-green-100 rounded-lg p-4`
- **Birthday Card**: `bg-card border rounded-lg p-4`
- **Planned Leaves Card**: `bg-card border rounded-lg p-4`

### Planned Leaves Items
- **Avatar Size**: `w-10 h-10` (40px)
- **Icon Box**: `w-10 h-10` with `bg-cyan-200`
- **Gap Between Items**: `gap-8` (32px)
- **Text**: `text-sm` with proper font weights

## Accessibility

### Screen Reader Support
- **Hidden Title**: `<SheetTitle className="sr-only">` for accessibility
- **Close Button**: Includes `sr-only` span with "Close" text
- **Semantic HTML**: Proper use of headings, buttons, and list structures

### Keyboard Navigation
- Sheet can be closed with Escape key (Radix UI default)
- Focus management handled by Radix UI Dialog

## Potential Issues & Observations

### 1. Hardcoded Polish Text
- All UI text is hardcoded in Polish
- Should use i18n system (`next-intl`) for internationalization
- Currently: "Wybrany dzień", "Planujesz urlop tego dnia?", etc.

### 2. Inconsistent Free Day Logic
- `isFreeDay()` checks personal leave but section logic in sheet is separate
- Could be simplified/consolidated

### 3. Date String Formatting
- Multiple date formatting approaches used throughout
- Some use `toLocaleDateString`, others manual string construction

### 4. Avatar Fallback Logic
- Planned leaves avatar fallback: `leave.user_name.split(' ').map(n => n[0]).join('')`
- Should handle edge cases (single name, empty names)

### 5. Console Logs
- Development console.log statements present (lines 326, 253, etc.)
- Should be removed or conditionally logged

### 6. Sheet Size
- Fixed 560px width may be too narrow for some content
- Planned leaves section could benefit from more space
- Consider responsive sizing

### 7. Missing Loading States
- No loading indicator when fetching leave requests
- `isLoadingLeaveRequests` from React Query is not used in UI

## Integration Points

### With NewLeaveRequestSheet
- Custom event: `openLeaveRequest`
- Event detail: `{ date: Date }`
- Pre-populates date range in leave request form

### With Calendar Display
- Uses same `leaveRequests` data as calendar grid
- Consistent data source ensures accuracy

### With DashboardCalendar
- DashboardCalendar wraps CalendarClient with `showHeader={false}`
- Same sheet component, different context

## Recommendations

### 1. Internationalization
- Replace hardcoded Polish text with translation keys
- Use `getTranslations` from `next-intl`

### 2. Loading States
- Add loading indicator when fetching data
- Show skeleton UI during initial load

### 3. Error Handling
- Add error boundaries for failed data fetches
- Display user-friendly error messages

### 4. Responsive Design
- Consider smaller width on mobile devices
- Test sheet behavior on small screens

### 5. Performance
- Memoize expensive calculations (date formatting, filtering)
- Consider virtualizing planned leaves list if many items

### 6. Code Cleanup
- Remove console.log statements
- Consolidate date formatting utilities
- Extract helper functions to separate file

## Related Components

- **NewLeaveRequestSheet**: `app/leave/components/NewLeaveRequestSheet.tsx`
- **CalendarClient**: `app/calendar/components/CalendarClient.tsx`
- **DashboardCalendar**: `app/dashboard/components/DashboardCalendar.tsx`
- **Sheet UI**: `components/ui/sheet.tsx`

