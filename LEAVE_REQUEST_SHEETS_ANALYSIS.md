# Leave Request Sheets - Complete Analysis

## Overview
This document tracks all sheet components responsible for leave request management, with focus on admin/manager-only functionality.

---

## 1. **LeaveRequestDetailsSheet** (View Details - Manager/Admin)

### Location
- [components/LeaveRequestDetailsSheet.tsx](components/LeaveRequestDetailsSheet.tsx) - Legacy component
- [app/leave-requests/components/LeaveRequestDetailsSheet.tsx](app/leave-requests/components/LeaveRequestDetailsSheet.tsx) - Current implementation

### Purpose
**Manager/Admin view for reviewing leave requests**

### Key Features
- ✅ View leave request details (dates, type, reason, requester info)
- ✅ Approve leave requests (admin/manager only)
- ✅ Reject leave requests with comment (admin/manager only)
- ✅ View conflicting/overlapping leaves
- ✅ Display leave balances
- ⚠️ Basic skeleton loading state

### User Roles
- **Employee**: Can view their own requests (read-only)
- **Manager**: Can approve/reject team member requests
- **Admin**: Can approve/reject any request

### Permissions Logic
```typescript
// Lines 184-185 in components/LeaveRequestDetailsSheet.tsx
const isOwner = leaveRequest?.user_id === currentUserId
const canEdit = isOwner && leaveRequest?.status !== 'cancelled'
const canApprove = (userRole === 'admin' || userRole === 'manager') &&
                   !isOwner &&
                   leaveRequest?.status === 'pending'
```

### API Endpoints Used
- `GET /api/leave-requests/{requestId}/details` - Fetch request details
- `POST /api/leave-requests/{requestId}/approve` - Approve/reject request

### Current Issues
- Two separate implementations (components/ and app/leave-requests/components/)
- No delete functionality
- Basic UI design (not matching latest Figma)

---

## 2. **EditLeaveRequestSheet** (Edit Request)

### Location
- [components/EditLeaveRequestSheet.tsx](components/EditLeaveRequestSheet.tsx)

### Purpose
**Edit existing leave requests (for employees and admins)**

### Key Features
- ✅ Edit leave type
- ✅ Edit date range
- ✅ Edit reason/description
- ✅ View balance summary (Available, Requested, Remaining)
- ✅ Check overlapping leaves
- ✅ Cancel request with reason (admin can cancel anytime, employee only before start date)
- ✅ Uses React Query mutations (useUpdateLeaveRequest, useCancelLeaveRequest)

### User Roles
- **Employee**: Can edit their own pending requests, cancel before start date
- **Manager/Admin**: Can edit pending/approved requests, cancel anytime

### Permissions Logic
```typescript
// Lines 374-379 in EditLeaveRequestSheet.tsx
const isManager = userProfile?.role === 'admin' || userProfile?.role === 'manager'

// Managers/admins can cancel at any time, employees only before start date
const canCancel = leaveRequest &&
  leaveRequest.status !== 'cancelled' &&
  (isManager || new Date() < new Date(leaveRequest.start_date))
```

### API Endpoints Used
- `PATCH /api/leave-requests/{id}` - Update request (via React Query)
- `POST /api/leave-requests/{id}/cancel` - Cancel request (via React Query)
- `POST /api/working-days` - Calculate working days
- `POST /api/leave-requests/overlapping` - Check conflicts

### Current Issues
- No validation for negative balance
- Cancel dialog could be more prominent

---

## 3. **NewLeaveRequestSheet** (Create New Request - Employee)

### Location
- [app/leave/components/NewLeaveRequestSheet.tsx](app/leave/components/NewLeaveRequestSheet.tsx)

### Purpose
**Employee self-service to create new leave requests**

### Key Features
- ✅ Select leave type with balance display
- ✅ Date range picker with disabled dates
- ✅ Working days calculation
- ✅ Balance summary cards (Available, Requested, Remaining)
- ✅ Real-time overlap checking
- ✅ Holiday integration
- ✅ Uses React Query mutation (useCreateLeaveRequest)

### User Roles
- **Employee**: Primary user - creates own requests
- **Manager/Admin**: Can also use for their own requests

### Permissions Logic
- No special permissions required
- Triggered via custom event: `window.dispatchEvent('openLeaveRequest')`

### API Endpoints Used
- `POST /api/leave-requests` - Create request (via React Query)
- `POST /api/working-days` - Calculate working days
- `POST /api/leave-requests/overlapping` - Check conflicts

### Current Issues
- No pre-flight validation for balance
- Complex state management

---

## 4. **AddAbsenceSheet** (Admin Creates for Employee)

### Location
- [components/AddAbsenceSheet.tsx](components/AddAbsenceSheet.tsx)

### Purpose
**⭐ ADMIN/MANAGER ONLY - Create pre-approved absence for any employee**

### Key Features
- ✅ Select employee (filtered by role/team)
- ✅ Select leave type
- ✅ Date range selection
- ✅ Auto-approve on creation (status: 'approved')
- ✅ Balance checking
- ✅ Overlap warnings
- ✅ Holiday integration
- ⚠️ Uses preloaded employee list

### User Roles
- **Manager**: Can add absence for team members
- **Admin**: Can add absence for anyone

### Employee Filtering Logic
```typescript
// Lines 293-315 in AddAbsenceSheet.tsx
if (userRole === 'manager') {
  // Get manager's team_id
  const { data: managerOrg } = await supabase
    .from('user_organizations')
    .select('team_id')
    .eq('user_id', user.id)
    .eq('organization_id', orgId)
    .single()

  if (managerOrg?.team_id) {
    // Filter by team
    query = query.eq('team_id', managerOrg.team_id)
  } else {
    // Manager has no team - show only themselves
    query = query.eq('user_id', user.id)
  }
}
```

### API Endpoints Used
- `POST /api/leave-requests` - Create absence with `auto_approve: true`
- `GET /api/employees/{id}/organization` - Get employee org (bypasses RLS)
- `GET /api/employees/{id}/leave-balances` - Get employee balances (bypasses RLS)
- `POST /api/working-days` - Calculate working days
- `POST /api/leave-requests/overlapping` - Check conflicts

### Trigger
```typescript
window.dispatchEvent(new Event('openAddAbsence'))
```

### Current Issues
- Complex RLS fallback logic (multiple API calls)
- Preloaded employees prop dependency
- No draft/review before creation

---

## 5. **GlobalLeaveRequestSheet** (Wrapper)

### Location
- [components/GlobalLeaveRequestSheet.tsx](components/GlobalLeaveRequestSheet.tsx)

### Purpose
**Simple wrapper around LeaveRequestDetailsSheet with context integration**

### Features
- Uses `LeaveRequestProvider` context
- Passes `selectedRequestId`, `isSheetOpen`, `closeLeaveRequestDetails` to details sheet

---

## Sheet Comparison Matrix

| Sheet | User Role | Action | Auto-Status | API Used |
|-------|-----------|--------|-------------|----------|
| **LeaveRequestDetailsSheet** | Employee/Manager/Admin | View, Approve, Reject | N/A | `/api/leave-requests/{id}/details` |
| **EditLeaveRequestSheet** | Employee/Admin | Edit, Cancel | Updates existing | `PATCH /api/leave-requests/{id}` |
| **NewLeaveRequestSheet** | Employee | Create | `pending` | `POST /api/leave-requests` |
| **AddAbsenceSheet** | **Admin/Manager** | Create for others | `approved` | `POST /api/leave-requests` |

---

## Admin/Manager-Specific Functionality Summary

### What Admins/Managers Can Do:

1. **View & Review Requests** (LeaveRequestDetailsSheet)
   - Approve pending requests
   - Reject with reason
   - View team member requests

2. **Edit Any Request** (EditLeaveRequestSheet)
   - Edit pending/approved requests
   - Cancel requests anytime (employees only before start date)

3. **Add Absence for Others** (AddAbsenceSheet) ⭐
   - Select employee from team
   - Create pre-approved absence
   - Bypass pending status

---

## Missing Functionality (Admin/Manager)

### 🚨 High Priority
- [ ] **Delete leave request** - No hard delete functionality exists
- [ ] **Batch operations** - Approve/reject multiple at once
- [ ] **Modify approved requests** - Currently requires cancel + recreate
- [ ] **Audit trail** - Who approved, who edited, when?

### ⚠️ Medium Priority
- [ ] **Better employee search** - Filter by team, department, status
- [ ] **Calendar conflict resolution** - Suggest alternative dates
- [ ] **Export leave data** - CSV/PDF for reporting
- [ ] **Leave request templates** - Common leave patterns

### 💡 Nice to Have
- [ ] **Bulk import** - Import multiple absences from CSV
- [ ] **Recurring leave** - Set up repeating absences
- [ ] **Custom approval workflows** - Multi-level approvals
- [ ] **Mobile-optimized sheets** - Better mobile UX

---

## Recommendations for Redesign

### 1. **Consolidate Sheet Components**
- Merge duplicate LeaveRequestDetailsSheet implementations
- Create single source of truth for each action

### 2. **Improve Admin Experience**
- Add quick actions menu (Edit, Delete, Approve, Reject)
- Implement bulk operations
- Add better filtering/search

### 3. **Better Permission Handling**
- Centralize permission checks
- Add permission constants/enums
- Implement feature flags

### 4. **Enhanced UI**
- Match latest Figma designs
- Add better loading states
- Improve error handling
- Add confirmation dialogs for destructive actions

### 5. **Testing**
- Add unit tests for permission logic
- Add integration tests for admin workflows
- Add E2E tests for critical paths

---

## Files to Focus On (Admin/Manager Redesign)

### Core Components
1. [components/AddAbsenceSheet.tsx](components/AddAbsenceSheet.tsx) - Most admin-specific
2. [app/leave-requests/components/LeaveRequestDetailsSheet.tsx](app/leave-requests/components/LeaveRequestDetailsSheet.tsx) - Approve/reject
3. [components/EditLeaveRequestSheet.tsx](components/EditLeaveRequestSheet.tsx) - Admin editing

### Supporting Files
- [hooks/use-leave-mutations.ts](hooks/use-leave-mutations.ts) - React Query mutations
- [lib/leave-validation.ts](lib/leave-validation.ts) - Permission checks
- [components/providers/LeaveRequestProvider.tsx](components/providers/LeaveRequestProvider.tsx) - Global state

### API Routes
- `/api/leave-requests/{id}/details` - Fetch details
- `/api/leave-requests/{id}/approve` - Approve/reject
- `/api/leave-requests/{id}` - Update/delete
- `/api/leave-requests/overlapping` - Check conflicts

---

## Next Steps

Based on your requirements, I recommend:

1. **Start with AddAbsenceSheet** - This is most admin-specific and could benefit from:
   - Better employee selector (search, filters)
   - Preview before creation
   - Bulk creation support

2. **Enhance LeaveRequestDetailsSheet** - Add:
   - Delete functionality
   - Quick edit actions
   - Better approval workflow

3. **Create unified admin panel** - Consider:
   - Dedicated admin sheets with all actions
   - Better navigation between sheets
   - Consistent design language

Would you like me to create a detailed spec for redesigning any of these specific sheets?
