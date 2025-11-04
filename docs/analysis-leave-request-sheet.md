# Comprehensive Analysis: "Złóż wniosek o urlop" Sheet Component

## Executive Summary

The "Złóż wniosek o urlop" (Submit Leave Request) sheet is a reusable client-side React component that enables users to submit new leave requests through a modal sheet interface. It appears in multiple locations throughout the application and uses a custom browser event system for cross-component communication.

---

## 1. Component Structure & Implementation

### 1.1 Component File
**Location**: `app/leave/components/NewLeaveRequestSheet.tsx`

**Type**: Client-side React component (`'use client'`)

**Base UI Library**: shadcn/ui Sheet component

### 1.2 Component Props Interface

```typescript
interface NewLeaveRequestSheetProps {
  leaveTypes: LeaveType[]           // Array of available leave types for the organization
  leaveBalances: LeaveBalance[]      // User's leave balances for each leave type
  userProfile?: UserProfile         // Optional user profile with org context
  initialDate?: Date                // Optional initial date for pre-population
}
```

**Required Props**: `leaveTypes`, `leaveBalances`
**Optional Props**: `userProfile`, `initialDate`

### 1.3 State Management

The component manages the following state variables:

| State Variable | Type | Purpose | Initial Value |
|---------------|------|---------|---------------|
| `isOpen` | `boolean` | Controls sheet visibility | `false` |
| `formData` | `{ leave_type_id: string, reason: string }` | Form input values | `{ leave_type_id: '', reason: '' }` |
| `dateRange` | `DateRange \| undefined` | Selected date range from date picker | `undefined` |
| `calculatedDays` | `number \| null` | Calculated working days in selected range | `null` |
| `isSubmitting` | `boolean` | Submission loading state | `false` |

**State Initialization Pattern**:
- Uses `useState` hooks for local component state
- No external state management (Redux, Zustand, etc.)
- State resets when sheet closes (via `handleClose`)

### 1.4 Key Dependencies

**External Libraries**:
- `react` - Core React functionality
- `date-fns` - Date formatting utilities (imported but not actively used in main logic)
- `react-day-picker` - DateRange type definition
- `sonner` - Toast notifications
- `next/navigation` - Router for page refresh

**Internal Dependencies**:
- `@/components/ui/sheet` - Sheet modal component
- `@/components/ui/date-range-picker` - Date range selection component
- `@/components/ui/dropdown-menu` - Leave type selection dropdown
- `@/lib/leave-validation` - `getApplicableLeaveTypes()` and `isLeaveTypeDisabled()` functions
- `@/hooks/use-sonner-toast` - Custom toast hook (`leaveRequestSubmitted()`)
- `@/lib/supabase/client` - Imported but not directly used (API-based approach instead)

**Note**: The component uses API routes (`/api/working-days`, `/api/leave-requests`) instead of direct Supabase calls, ensuring proper validation and RLS handling.

---

## 2. Usage Locations & Context

### 2.1 `/leave` Page
**File**: `app/leave/page.tsx` (lines 189-200)

**Trigger Component**: `LeaveRequestButton` (line 96)

**Rendering Context**:
```typescript
<NewLeaveRequestSheet
  leaveTypes={leaveTypes || []}
  leaveBalances={leaveBalances || []}
  userProfile={{
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    role: profile.role,
    employment_start_date: profile.employment_start_date,
    organization_id: profile.organization_id
  }}
/>
```

**Page Context**:
- Main leave management page
- Displays leave balances summary cards
- Shows leave request history table
- User can view and manage their leave requests

**Data Fetching**:
- Uses `createAdminClient()` for leave types and balances
- Filters by current organization ID
- Gets current year balances

### 2.2 `/calendar` Page
**File**: `app/calendar/page.tsx` (lines 190-194)

**Trigger Location**: Calendar day details sheet button (`CalendarClient.tsx`, line 673)

**Special Feature**: Pre-populates date from selected calendar day

**Rendering Context**:
```typescript
<NewLeaveRequestSheet 
  leaveTypes={leaveTypes || []} 
  leaveBalances={leaveBalances || []} 
  userProfile={profile} 
/>
```

**Event Dispatch** (from CalendarClient):
```typescript
const event = new CustomEvent('openLeaveRequest', {
  detail: { date: selectedDate }
})
window.dispatchEvent(event)
```

**Page Context**:
- Calendar view showing team schedules
- User can click on a specific day
- Day details sheet shows "Planujesz urlop tego dnia?" section
- Button triggers leave request sheet with pre-filled date

**Data Fetching**:
- Uses `createAdminClient()` for leave types
- Filters leave balances by `requires_balance = true`
- Includes organization's country code for holiday calculations

### 2.3 `/dashboard` Page
**File**: `app/dashboard/page.tsx` (lines 345-349)

**Trigger Component**: `LeaveRequestButton` component (used in dashboard layout)

**Rendering Context**:
```typescript
<NewLeaveRequestSheet 
  leaveTypes={leaveTypes || []} 
  leaveBalances={leaveBalances || []} 
  userProfile={profile} 
/>
```

**Page Context**:
- Main dashboard overview
- Shows team status, birthdays, current day info
- Quick access to submit leave requests

**Data Fetching**:
- Similar to `/leave` page
- Uses admin client for data access
- Filters by active organization

### 2.4 Multiple Instance Issue

**Problem**: The sheet component is rendered as a separate instance on each page that uses it. This means:
- Each page has its own sheet instance listening to the same global event
- Multiple instances could theoretically conflict if multiple pages are loaded simultaneously
- Props (leaveTypes, leaveBalances) are fetched separately on each page

**Potential Solution**: Similar to `GlobalLeaveRequestSheet` pattern used for leave request details, could be made global with context provider.

---

## 3. Event System Architecture

### 3.1 Custom Event: `openLeaveRequest`

The component uses a browser-native custom event system for cross-component communication, allowing the sheet to be opened from multiple locations without prop drilling.

### 3.2 Event Dispatchers

#### 3.2.1 LeaveRequestButton
**File**: `app/dashboard/components/LeaveRequestButton.tsx`

**Dispatch Pattern**:
```typescript
const event = new CustomEvent('openLeaveRequest')
window.dispatchEvent(event)
```

**Usage**: Dashboard and leave pages

**Event Detail**: None (empty event)

#### 3.2.2 NewLeaveRequestButton
**File**: `app/leave/components/NewLeaveRequestButton.tsx`

**Dispatch Pattern**:
```typescript
window.dispatchEvent(new Event('openLeaveRequest'))
```

**Usage**: Leave page (alternative button)

**Event Detail**: None (uses plain `Event` instead of `CustomEvent`)

**Issue**: Inconsistent pattern - uses `Event` instead of `CustomEvent`, which means it cannot carry event details even if needed in the future.

#### 3.2.3 CalendarClient
**File**: `app/calendar/components/CalendarClient.tsx` (lines 664-667)

**Dispatch Pattern**:
```typescript
const event = new CustomEvent('openLeaveRequest', {
  detail: { date: selectedDate }
})
window.dispatchEvent(event)
```

**Usage**: Calendar day details sheet

**Event Detail**: `{ date: Date }` - Includes selected calendar date for pre-population

**Special Feature**: Only dispatcher that includes date information in event detail

### 3.3 Event Listener

**Location**: `NewLeaveRequestSheet.tsx` (lines 41-58)

**Implementation**:
```typescript
useEffect(() => {
  const handleOpenLeaveRequest = (event: CustomEvent) => {
    setIsOpen(true)
    // If event has a date, set it as initial date range
    if (event.detail?.date) {
      const selectedDate = new Date(event.detail.date)
      setDateRange({
        from: selectedDate,
        to: selectedDate
      })
    }
  }

  window.addEventListener('openLeaveRequest', handleOpenLeaveRequest as EventListener)
  return () => {
    window.removeEventListener('openLeaveRequest', handleOpenLeaveRequest as EventListener)
  }
}, [])
```

**Event Handling**:
- Listens to `openLeaveRequest` event on window object
- Opens sheet by setting `isOpen` to `true`
- Checks for `event.detail.date` and pre-populates date range if present
- Properly cleans up event listener on unmount

**Type Safety Issue**: Uses `as EventListener` type assertion, which loses type safety for `CustomEvent` detail. The handler expects `CustomEvent` but is cast to `EventListener`, which doesn't have `detail` property in TypeScript types.

### 3.4 Event Flow Diagram

```
User Action
    │
    ├─> Click "Złóż wniosek o urlop" button
    │   │
    │   └─> Dispatch 'openLeaveRequest' event
    │       │
    │       └─> NewLeaveRequestSheet listener catches event
    │           │
    │           ├─> Set isOpen = true
    │           │
    │           └─> If event.detail.date exists:
    │               └─> Pre-populate dateRange
    │
    └─> Sheet opens and displays form
```

### 3.5 Potential Issues

1. **Inconsistent Event Types**: 
   - `LeaveRequestButton` uses `CustomEvent`
   - `NewLeaveRequestButton` uses plain `Event`
   - `CalendarClient` uses `CustomEvent` with detail
   - **Impact**: Type safety issues, `NewLeaveRequestButton` cannot pass data even if needed

2. **Type Safety**: Event listener uses `as EventListener` assertion, losing CustomEvent detail typing

3. **Global Event Pollution**: Using window-level events means any component can dispatch, potentially causing unintended side effects

---

## 4. Form Fields & UI/UX Elements

### 4.1 Leave Type Selection Dropdown

**Label**: "Jaki urlop chcesz wybrać?"

**Component**: `DropdownMenu` from shadcn/ui

**Display Logic**:
- **When no selection**: Shows "Wybierz typ urlopu" placeholder
- **When selected**: Shows leave type name and balance information

**Selected State Display**:
```typescript
<div className="flex flex-col items-start">
  <span className="font-medium text-sm">{selectedLeaveType.name}</span>
  {!selectedLeaveType.requires_balance ? (
    <span className="text-xs text-muted-foreground">Bez limitu</span>
  ) : balance ? (
    <span className="text-xs text-muted-foreground">
      Dostępne {balance.remaining_days} dni
    </span>
  ) : null}
</div>
```

**Dropdown Options**:
- Filtered using `getApplicableLeaveTypes()` function
- Each option shows:
  - Leave type name (bold)
  - Balance information ("Bez limitu" or "Dostępne X dni")
  - Disabled state with reason (in red text)

**Filtering Logic** (from `lib/leave-validation.ts`):
- Filters by organization ID
- Hides conditional leave types (maternity, paternity, childcare) if user has 0 entitled days
- Shows all other types (disabled if no balance available)

**Disabled State**:
- Uses `isLeaveTypeDisabled()` to check if option should be disabled
- Shows red error message if disabled with reason
- Example reasons: "Niewystarczające saldo", "Brak przypisanego salda"

**Visual Separators**: Uses `DropdownMenuSeparator` between options

### 4.2 Date Range Picker

**Label**: "Termin urlopu"

**Component**: `DateRangePicker` from `@/components/ui/date-range-picker`

**Props**:
- `date`: Current date range state
- `onDateChange`: Updates date range state
- `placeholder`: "Wybierz typ urlopu" ⚠️ **BUG**: Should say "Wybierz daty" or similar
- `className`: "h-9 w-full"

**Features**:
- Two-month calendar view
- Range selection mode
- Polish locale support with capitalized months
- Week starts on Monday (`weekStartsOn={1}`)

**Working Days Display**:
```typescript
{calculatedDays !== null && (
  <p className="text-sm text-muted-foreground mt-1">
    Dni roboczych: {calculatedDays}
  </p>
)}
```

**Issue**: Placeholder text says "Wybierz typ urlopu" but should reference dates, not leave type.

### 4.3 Reason/Description Textarea

**Label**: "Chcesz coś dodać? (opcjonalnie)"

**Component**: `Textarea` from shadcn/ui

**Properties**:
- **Optional**: Yes (not required for submission)
- **Placeholder**: "Opisz powód urlopu"
- **Minimum Height**: 76px (`min-h-[76px]`)
- **Resizable**: No (`resize-none`)
- **Controlled**: Yes (value bound to `formData.reason`)

**Purpose**: Additional information for manager/approver

### 4.4 Footer Actions

**Layout**: Fixed at bottom with `p-6 pt-0` padding

**Cancel Button**:
- Variant: `outline`
- Size: `sm`
- Action: Calls `handleClose()` to close sheet
- Label: "Anuluj"

**Submit Button**:
- Variant: Default (primary)
- Size: `sm`
- Type: `submit`
- **Disabled When**:
  - No leave type selected (`!formData.leave_type_id`)
  - No start date (`!dateRange?.from`)
  - No end date (`!dateRange?.to`)
  - Invalid calculated days (`!calculatedDays || calculatedDays <= 0`)
  - Currently submitting (`isSubmitting`)

**Loading State**:
- Text changes to "Składanie wniosku..." when `isSubmitting` is true
- Button is disabled during submission

**Layout Issues**:
- Footer uses `flex flex-row gap-2 items-center justify-between`
- Buttons are placed at opposite ends
- Could benefit from better spacing/alignment

---

## 5. Working Days Calculation

### 5.1 Calculation Flow

**Trigger**: Automatically calculates when both `dateRange.from` and `dateRange.to` are set

**useEffect Hook** (lines 81-87):
```typescript
useEffect(() => {
  if (dateRange?.from && dateRange?.to) {
    calculateWorkingDays()
  } else {
    setCalculatedDays(null)
  }
}, [dateRange])
```

### 5.2 API Endpoint

**Endpoint**: `/api/working-days` (POST)

**Request Body**:
```json
{
  "startDate": "2024-01-15",
  "endDate": "2024-01-20"
}
```

**Response**:
```json
{
  "working_days": 4,
  "start_date": "2024-01-15",
  "end_date": "2024-01-20",
  "holidays_in_period": [...],
  "organization_id": "...",
  "calculation_method": "database_function"
}
```

**API Implementation** (`app/api/working-days/route.ts`):
- Uses Supabase RPC function `calculate_working_days_with_holidays`
- Excludes weekends (Saturday, Sunday)
- Excludes national holidays (filtered by organization's country code)
- Excludes organization-specific holidays
- Falls back to client-side calculation if database function fails

### 5.3 Fallback Calculation

**Location**: `NewLeaveRequestSheet.tsx` (lines 120-129)

**Method**: `calculateBasicWorkingDays()`

**Logic**:
- Iterates through each day in range
- Counts days that are not Saturday (6) or Sunday (0)
- Does NOT account for holidays (only weekends)

**Usage**: Called when API request fails or returns error

**Limitation**: Only excludes weekends, not holidays. This could lead to incorrect day counts if API fails.

### 5.4 Display

Shown below date picker when `calculatedDays !== null`:
```
Dni roboczych: {calculatedDays}
```

**Styling**: `text-sm text-muted-foreground mt-1`

---

## 6. Form Validation

### 6.1 Client-Side Validation

**Pre-Submission Checks** (lines 134-142):

1. **Required Fields Check**:
   ```typescript
   if (!formData.leave_type_id || !dateRange?.from || !dateRange?.to || 
       !userProfile?.organization_id || !userProfile?.id) {
     toast.error('Missing required information')
     return
   }
   ```

2. **Working Days Validation**:
   ```typescript
   if (!calculatedDays || calculatedDays <= 0) {
     toast.error('Invalid date range - no working days selected')
     return
   }
   ```

**Submit Button Disabled State** (line 354):
- Combines all validation checks
- Also checks `isSubmitting` to prevent double submission

### 6.2 Server-Side Validation

**API Endpoint**: `/api/leave-requests` (POST)

**Validations Performed** (from `app/api/leave-requests/route.ts`):

1. **Required Fields**: `leave_type_id`, `start_date`, `end_date`
2. **Leave Type Validation**: Verifies leave type belongs to organization
3. **Overlap Detection**: Checks for overlapping approved/pending requests
4. **Date Logic**: Ensures start_date <= end_date

**Error Responses**:
- `400`: Missing fields, invalid leave type, overlapping requests
- `403`: Manager trying to create request for employee outside their team
- `500`: Database/server errors

### 6.3 Leave Type Filtering

**Function**: `getApplicableLeaveTypes()` from `lib/leave-validation.ts`

**Logic**:
1. Filters by organization ID
2. Hides conditional leave types if user has 0 entitled days:
   - Urlop macierzyński (Maternity)
   - Urlop ojcowski (Paternity)
   - Dni wolne wychowawcze (Childcare days)
   - Urlop rodzicielski (Parental)
3. Shows all other types (may be disabled if no balance)

**Function**: `isLeaveTypeDisabled()` from `lib/leave-validation.ts`

**Checks**:
- If `requires_balance = false`: Never disabled (unlimited types)
- If `requires_balance = true` and `remaining_days < requestedDays`: Disabled
- If `requires_balance = true` and no balance exists: Disabled with reason

---

## 7. Submission Flow

### 7.1 Submission Process

**Step 1: Form Validation** (lines 134-142)
- Validates required fields
- Checks calculated days > 0

**Step 2: Date Formatting** (lines 148-153)
```typescript
const formatDateLocal = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
```
**Purpose**: Prevents timezone-related off-by-one errors by formatting in local timezone

**Step 3: Request Payload** (lines 155-161)
```typescript
{
  leave_type_id: formData.leave_type_id,
  start_date: formatDateLocal(dateRange.from),
  end_date: formatDateLocal(dateRange.to),
  days_requested: calculatedDays,
  reason: formData.reason || null,
}
```

**Step 4: API Call** (lines 166-172)
- POST to `/api/leave-requests`
- JSON payload in request body
- Content-Type: application/json

**Step 5: Success Handling** (lines 184-190)
- Sets timeout to close sheet after 1.5 seconds
- Calls `leaveRequestSubmitted()` toast hook
- Refreshes router to update page data

**Step 6: Error Handling** (lines 192-218)
- Comprehensive error message extraction
- Handles Error objects, Supabase errors, and generic objects
- Shows user-friendly error toast

### 7.2 API Processing

**Endpoint**: `/api/leave-requests` (POST)

**Server-Side Steps**:

1. **Authentication**: Uses `authenticateAndGetOrgContext()`
2. **Field Validation**: Checks required fields
3. **Leave Type Validation**: Verifies type belongs to organization
4. **Overlap Detection**: Checks for conflicting requests
5. **Status Determination**:
   - Auto-approves if admin creating for themselves
   - Auto-approves if admin creating with `auto_approve` flag
   - Otherwise sets to `pending`
6. **Database Insert**: Creates leave request record
7. **Email Notification**: Sends notification to managers (if pending) or user (if approved)
8. **Response**: Returns success message and leave request data

### 7.3 User Feedback

**Success**:
- Toast notification via `leaveRequestSubmitted()` hook
- Sheet closes after 1.5 seconds
- Page refreshes to show new request

**Error**:
- Error toast with descriptive message
- Sheet remains open for user to correct issues
- Detailed error logged to console for debugging

---

## 8. Date Initialization Logic

### 8.1 Dual useEffect Pattern

The component uses two separate `useEffect` hooks for date initialization:

**Hook 1** (lines 41-58): Event-based initialization
```typescript
useEffect(() => {
  const handleOpenLeaveRequest = (event: CustomEvent) => {
    setIsOpen(true)
    if (event.detail?.date) {
      const selectedDate = new Date(event.detail.date)
      setDateRange({
        from: selectedDate,
        to: selectedDate
      })
    }
  }
  window.addEventListener('openLeaveRequest', handleOpenLeaveRequest as EventListener)
  return () => {
    window.removeEventListener('openLeaveRequest', handleOpenLeaveRequest as EventListener)
  }
}, [])
```

**Hook 2** (lines 61-68): Prop-based initialization
```typescript
useEffect(() => {
  if (initialDate && isOpen) {
    setDateRange({
      from: initialDate,
      to: initialDate
    })
  }
}, [initialDate, isOpen])
```

### 8.2 Potential Issues

1. **Race Condition**: Both hooks can set date range, potentially conflicting
2. **Redundancy**: Two mechanisms for same purpose (event detail vs prop)
3. **No Reset**: When sheet closes, date range is not reset, so reopening shows previous selection
4. **Missing Dependency**: First hook doesn't include `setDateRange` in dependency array (though safe since setState is stable)

### 8.3 Recommended Consolidation

Could be merged into single hook:
```typescript
useEffect(() => {
  if (isOpen) {
    // Priority: event detail > prop > undefined
    const dateToUse = eventDetailDate || initialDate
    if (dateToUse) {
      setDateRange({
        from: dateToUse,
        to: dateToUse
      })
    }
  }
}, [isOpen, initialDate, eventDetailDate])
```

---

## 9. Identified Issues & Recommendations

### 9.1 Critical Issues

#### Issue 1: Incorrect Placeholder Text
**Location**: Line 322 in `NewLeaveRequestSheet.tsx`

**Problem**: DateRangePicker placeholder says "Wybierz typ urlopu" but should reference dates

**Current**:
```typescript
<DateRangePicker
  placeholder="Wybierz typ urlopu"  // ❌ Wrong - references leave type
/>
```

**Should Be**:
```typescript
<DateRangePicker
  placeholder="Wybierz daty urlopu"  // ✅ Correct
/>
```

**Impact**: Confusing UX, users might think they need to select leave type first

#### Issue 2: Inconsistent Event Dispatch Patterns
**Problem**: Three different patterns for dispatching same event

**Current Patterns**:
1. `new CustomEvent('openLeaveRequest')` - LeaveRequestButton
2. `new Event('openLeaveRequest')` - NewLeaveRequestButton ⚠️
3. `new CustomEvent('openLeaveRequest', { detail: { date } })` - CalendarClient

**Impact**: 
- Type safety issues
- `NewLeaveRequestButton` cannot pass data even if needed
- Inconsistent codebase

**Recommendation**: Standardize on `CustomEvent` with optional detail:
```typescript
window.dispatchEvent(new CustomEvent('openLeaveRequest', {
  detail: { date?: Date }
}))
```

#### Issue 3: Multiple Sheet Instances
**Problem**: Sheet component rendered separately on each page

**Impact**:
- Multiple instances listening to same event
- Potential conflicts if multiple pages loaded
- Redundant prop fetching

**Recommendation**: Consider global pattern similar to `GlobalLeaveRequestSheet`:
- Single instance in root layout
- Context provider for data (leaveTypes, leaveBalances)
- Event system or context method to open

### 9.2 Medium Priority Issues

#### Issue 4: Date Range Not Reset on Close
**Problem**: When sheet closes, `dateRange` state persists

**Impact**: Reopening sheet shows previous date selection, which might be confusing

**Recommendation**: Reset date range in `handleClose()`:
```typescript
const handleClose = () => {
  setIsOpen(false)
  setDateRange(undefined)  // Reset date range
  setFormData({ leave_type_id: '', reason: '' })  // Optionally reset form
}
```

#### Issue 5: Type Safety in Event Listener
**Problem**: Uses `as EventListener` assertion, losing CustomEvent typing

**Current**:
```typescript
window.addEventListener('openLeaveRequest', handleOpenLeaveRequest as EventListener)
```

**Recommendation**: Use proper typing:
```typescript
window.addEventListener('openLeaveRequest', handleOpenLeaveRequest as (e: CustomEvent<{ date?: Date }>) => void)
```

#### Issue 6: Fallback Calculation Missing Holidays
**Problem**: `calculateBasicWorkingDays()` only excludes weekends, not holidays

**Impact**: If API fails, working days count may be incorrect (includes holidays)

**Recommendation**: Either:
- Improve fallback to fetch holidays, OR
- Show warning when using fallback, OR
- Remove fallback and show error message instead

### 9.3 Minor Issues

#### Issue 7: Unused Imports
**Location**: Line 4-5, 14

**Unused**:
- `format, differenceInDays, parseISO` from date-fns
- `pl` locale from date-fns
- `createClient` from supabase/client (uses API instead)

**Recommendation**: Remove unused imports

#### Issue 8: Date Initialization Consolidation
**Problem**: Two useEffect hooks for same purpose

**Recommendation**: Consolidate into single hook (see section 8.3)

#### Issue 9: Form Reset Logic
**Problem**: Form data not reset when sheet closes

**Recommendation**: Reset form state in `handleClose()` or when sheet opens

---

## 10. Code Quality Observations

### 10.1 Strengths

1. **Good Error Handling**: Comprehensive error handling with user-friendly messages
2. **API-First Approach**: Uses API routes instead of direct Supabase calls, ensuring proper validation
3. **Working Days Calculation**: Proper API integration with fallback
4. **Leave Type Filtering**: Smart filtering based on user profile and balances
5. **Accessibility**: Uses semantic HTML and proper labels
6. **Loading States**: Proper loading indicators during submission
7. **Toast Notifications**: Good user feedback via toast system

### 10.2 Areas for Improvement

1. **State Management**: Could benefit from reducer pattern for complex form state
2. **Type Safety**: Event system needs better TypeScript typing
3. **Code Duplication**: Date initialization logic duplicated
4. **Testing**: No visible test coverage for this component
5. **Documentation**: Limited inline comments explaining complex logic
6. **Accessibility**: Could add ARIA labels and keyboard navigation improvements

---

## 11. Testing Recommendations

### 11.1 Unit Tests Needed

1. **Form Validation**:
   - Test required field validation
   - Test date range validation
   - Test working days calculation

2. **Event Handling**:
   - Test event listener registration/cleanup
   - Test event with date detail
   - Test event without date detail

3. **Leave Type Filtering**:
   - Test `getApplicableLeaveTypes()` filtering
   - Test disabled state logic
   - Test balance display

4. **Date Initialization**:
   - Test prop-based initialization
   - Test event-based initialization
   - Test priority when both present

### 11.2 Integration Tests Needed

1. **API Integration**:
   - Test working days API call
   - Test leave request submission
   - Test error handling

2. **Cross-Component**:
   - Test event dispatch from different triggers
   - Test sheet opening from calendar
   - Test sheet opening from dashboard

### 11.3 E2E Tests Needed

1. **User Flow**:
   - Complete leave request submission flow
   - Test with different leave types
   - Test with date pre-population from calendar
   - Test error scenarios

---

## 12. Performance Considerations

### 12.1 Current Performance

- **Component Mount**: Lightweight, minimal initial render
- **Data Fetching**: Done at page level, not component level (good)
- **Working Days Calculation**: Async API call, doesn't block UI
- **Re-renders**: Controlled by React state, should be efficient

### 12.2 Potential Optimizations

1. **Memoization**: Could memoize filtered leave types
2. **Debouncing**: Could debounce working days calculation if user rapidly changes dates
3. **Lazy Loading**: Sheet content could be lazy-loaded
4. **Event System**: Consider Context API instead of window events for better performance

---

## 13. Accessibility Considerations

### 13.1 Current State

- Uses semantic HTML (`form`, `label`)
- Proper label associations
- Button states (disabled, loading)
- Keyboard accessible (via shadcn/ui components)

### 13.2 Improvements Needed

1. **ARIA Labels**: Add aria-labels for complex interactions
2. **Focus Management**: Focus trap when sheet is open
3. **Screen Reader**: Announce sheet open/close
4. **Keyboard Navigation**: Ensure all interactions keyboard-accessible

---

## 14. Summary & Action Items

### 14.1 Quick Wins

1. ✅ Fix placeholder text ("Wybierz typ urlopu" → "Wybierz daty urlopu")
2. ✅ Standardize event dispatch pattern (use CustomEvent everywhere)
3. ✅ Reset form state on close
4. ✅ Remove unused imports

### 14.2 Medium-Term Improvements

1. 🔄 Consolidate date initialization logic
2. 🔄 Improve fallback calculation (include holidays or show warning)
3. 🔄 Add proper TypeScript types for event system
4. 🔄 Consider global sheet instance pattern

### 14.3 Long-Term Enhancements

1. 📋 Add unit and integration tests
2. 📋 Improve accessibility (ARIA, focus management)
3. 📋 Consider Context API for sheet management
4. 📋 Add performance optimizations (memoization, debouncing)

---

## Appendix: Related Components

### GlobalLeaveRequestSheet
**File**: `components/GlobalLeaveRequestSheet.tsx`

**Purpose**: Global instance for viewing leave request details (not creating)

**Pattern**: Uses Context API (`LeaveRequestProvider`)

**Note**: Could be pattern to follow for NewLeaveRequestSheet

### NewLeaveRequestForm
**File**: `app/leave/new/components/NewLeaveRequestForm.tsx`

**Purpose**: Alternative form implementation (not used in sheet)

**Difference**: Different UI pattern, more detailed form fields

### EditLeaveRequestSheet
**File**: `components/EditLeaveRequestSheet.tsx`

**Purpose**: Editing existing leave requests

**Similarity**: Uses same Sheet component pattern

