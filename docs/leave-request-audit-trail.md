# Leave Request Audit Trail

## Overview

The audit trail system tracks when administrators and managers edit leave requests on behalf of other users. This provides accountability and transparency for administrative actions.

## Database Schema

### Audit Fields

The `leave_requests` table includes the following audit trail fields:

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `edited_by` | UUID | Yes | Foreign key to `auth.users` - ID of the user who last edited this request |
| `edited_at` | TIMESTAMP | Yes | Timestamp when the request was last edited by an admin/manager |

### Migration

Added in migration: `20251106000000_add_audit_trail_to_leave_requests.sql`

```sql
ALTER TABLE leave_requests
ADD COLUMN edited_by UUID REFERENCES auth.users(id),
ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN leave_requests.edited_by IS 'User who last edited this request (for admin/manager edits)';
COMMENT ON COLUMN leave_requests.edited_at IS 'Timestamp when request was last edited by admin/manager';
```

## When Audit Trail is Created

### Admin/Manager Edits Another User's Request

When an admin or manager edits a leave request that belongs to another user:

- ✅ `edited_by` is set to the logged-in user's ID
- ✅ `edited_at` is set to current timestamp
- ✅ Visual indicator shown: "Edytujesz jako administrator/kierownik"
- ✅ Role-specific success message displayed

### User Edits Own Request

When a user edits their own leave request:

- ❌ `edited_by` remains NULL
- ❌ `edited_at` remains NULL
- ℹ️ Standard success message displayed

## Permission Model

### Employee

- **Can edit**: Own requests only
- **Cannot edit**: Requests after start date
- **Audit trail**: No (editing own requests)

### Manager

- **Can edit**: Team member requests
- **Cannot edit**: Requests from other teams
- **Can cancel**: Anytime (not restricted to before-start-date)
- **Audit trail**: Yes (`edited_by` + `edited_at` set)
- **Visual indicator**: "Edytujesz jako kierownik"

### Admin

- **Can edit**: ANY request in organization
- **Can cancel**: Anytime (not restricted to before-start-date)
- **Audit trail**: Yes (`edited_by` + `edited_at` set)
- **Visual indicator**: "Edytujesz jako administrator"

## Implementation Details

### API Route

**File**: `/app/api/leave-requests/[id]/route.ts`

#### PUT Endpoint Logic

```typescript
// Permission check
const isOwnRequest = existingRequest.user_id === user.id
const isManager = role === 'admin' || role === 'manager'

// Update data preparation
const updateData: Record<string, string | number | null> = {
  leave_type_id,
  start_date,
  end_date,
  days_requested,
  reason: reason || null,
  updated_at: new Date().toISOString()
}

// Add audit trail when admin/manager edits another user's request
if (!isOwnRequest && isManager) {
  updateData.edited_by = user.id
  updateData.edited_at = new Date().toISOString()
}
```

### Frontend Component

**File**: `/components/EditLeaveRequestSheet.tsx`

#### Visual Indicator

When `currentUserRole` (logged-in user) differs from request owner:

```tsx
{/* Admin edit mode indicator */}
{currentUserId && currentUserId !== leaveRequest.user_id && (
  <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
    <div className="flex items-center gap-2">
      <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <p className="text-sm text-amber-900 dark:text-amber-100">
        {currentUserRole === 'admin'
          ? 'Edytujesz jako administrator'
          : 'Edytujesz jako kierownik'}
      </p>
    </div>
  </div>
)}
```

#### Role-Specific Success Messages

```typescript
// Success message varies by role
const successMessage = currentUserRole === 'admin'
  ? 'Wniosek został zaktualizowany przez administratora'
  : currentUserRole === 'manager'
  ? 'Wniosek został zaktualizowany przez kierownika'
  : 'Wniosek został zaktualizowany'
```

## Data Fetching

**File**: `/app/api/leave-requests/[id]/details/route.ts`

### Critical Data Separation

The API returns both:

1. **Leave Request Owner's Data** - In `userProfile`
2. **Logged-In User's Data** - In `currentUserRole` and `currentUserId`

```typescript
// Get the leave request owner's role from user_organizations
const { data: ownerOrgData } = await supabaseAdmin
  .from('user_organizations')
  .select('role')
  .eq('user_id', leaveRequest.user_id)
  .eq('organization_id', organizationId)
  .single()

// Return both contexts
return NextResponse.json({
  leaveRequest,
  userRole: userOrganization.role,        // Logged-in user's role
  currentUserId: user.id,                 // Logged-in user's ID
  userProfile: {
    id: leaveRequest.user_id,             // Request owner's ID
    role: ownerOrgData?.role || 'employee' // Request owner's role
  }
})
```

## RLS Policy Support

### Current Policies

**File**: `/supabase/migrations/20250807000002_optimize_rls_policies.sql`

The RLS policies already support admin/manager edit functionality:

```sql
-- Admins can manage ALL leave requests in their organization
-- Managers can manage TEAM MEMBER leave requests only
CREATE POLICY "Managers can manage team leave requests" ON leave_requests
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_organizations uo1
    JOIN user_organizations uo2 ON uo2.organization_id = uo1.organization_id
    WHERE uo1.user_id = auth.uid()
      AND uo2.user_id = leave_requests.user_id
      AND uo1.is_active = true
      AND uo2.is_active = true
      AND (
        uo1.role = 'admin' OR  -- Admins: org-wide
        (uo1.role = 'manager' AND uo1.team_id = uo2.team_id)  -- Managers: team-only
      )
  )
);
```

**Key Points:**
- ✅ Admins have organization-wide access
- ✅ Managers have team-only access
- ✅ Employees can only access own requests
- ✅ NO policy updates needed for audit trail functionality

## UI/UX Flow

### Employee Editing Own Request

1. User clicks "Edit" on their own request
2. Sheet opens with normal interface
3. No admin indicator banner shown
4. User makes changes
5. User clicks "Save changes"
6. Success: "Wniosek został zaktualizowany"
7. ❌ No `edited_by`/`edited_at` set

### Admin Editing Another User's Request

1. Admin clicks "Edit" on any organization request
2. Sheet opens with amber admin banner:
   > ⚠️ **Edytujesz jako administrator**
3. Admin makes changes
4. Admin clicks "Save changes"
5. Success: "Wniosek został zaktualizowany przez administratora"
6. ✅ `edited_by` set to admin's ID
7. ✅ `edited_at` set to current timestamp

### Manager Editing Team Member's Request

1. Manager clicks "Edit" on team member request
2. Sheet opens with amber manager banner:
   > ⚠️ **Edytujesz jako kierownik**
3. Manager makes changes
4. Manager clicks "Save changes"
5. Success: "Wniosek został zaktualizowany przez kierownika"
6. ✅ `edited_by` set to manager's ID
7. ✅ `edited_at` set to current timestamp

## Querying Audit Trail

### Find All Admin/Manager Edits

```sql
SELECT
  lr.id,
  lr.user_id as request_owner_id,
  p1.full_name as request_owner_name,
  lr.edited_by,
  p2.full_name as edited_by_name,
  lr.edited_at,
  lr.status
FROM leave_requests lr
LEFT JOIN profiles p1 ON p1.id = lr.user_id
LEFT JOIN profiles p2 ON p2.id = lr.edited_by
WHERE lr.edited_by IS NOT NULL
ORDER BY lr.edited_at DESC;
```

### Find Edits by Specific Admin/Manager

```sql
SELECT
  lr.*,
  p.full_name as request_owner
FROM leave_requests lr
JOIN profiles p ON p.id = lr.user_id
WHERE lr.edited_by = 'admin-user-uuid-here'
ORDER BY lr.edited_at DESC;
```

### Find Requests Edited After Creation

```sql
SELECT
  lr.*,
  lr.edited_at - lr.created_at as time_between_create_and_edit
FROM leave_requests lr
WHERE lr.edited_by IS NOT NULL
  AND lr.edited_at > lr.created_at
ORDER BY lr.edited_at DESC;
```

## Testing

### Manual Test Scenarios

**Employee Tests:**
- ✅ Employee can edit own pending request
- ✅ No audit trail created
- ✅ No admin banner shown
- ❌ Cannot edit after start date

**Manager Tests:**
- ✅ Manager can edit team member request
- ✅ Audit trail created (`edited_by` + `edited_at`)
- ✅ Manager banner shown
- ✅ Can cancel anytime (not blocked by start date)
- ❌ Cannot edit requests from other teams

**Admin Tests:**
- ✅ Admin can edit ANY organization request
- ✅ Audit trail created (`edited_by` + `edited_at`)
- ✅ Admin banner shown
- ✅ Can cancel anytime (not blocked by start date)
- ❌ Cannot edit requests from other organizations

### Automated Tests

**File**: `/__tests__/api/leave-requests/edit-permissions.test.ts`

Comprehensive test suite covering:
- ✅ Employee edit permissions
- ✅ Manager edit permissions (team-only)
- ✅ Admin edit permissions (org-wide)
- ✅ Audit trail field population
- ✅ Permission denial scenarios
- ✅ RLS policy enforcement

## Best Practices

### When to Check Audit Trail

1. **Compliance Audits** - Review who made changes to leave requests
2. **Dispute Resolution** - Verify who edited a contested request
3. **Analytics** - Track admin/manager intervention frequency
4. **Accountability** - Ensure proper approval workflows

### Data Retention

- Audit trail fields are permanent
- Cannot be manually cleared
- Preserved even if request is cancelled
- Part of leave request lifecycle

### Privacy Considerations

- Audit trail shows WHO edited (user ID)
- Audit trail shows WHEN edited (timestamp)
- Audit trail does NOT show WHAT changed
- For full change history, implement event logging

## Migration Guide for Similar Patterns

To implement audit trail for other entities:

1. **Add Database Fields**
   ```sql
   ALTER TABLE entity_name
   ADD COLUMN edited_by UUID REFERENCES auth.users(id),
   ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE;
   ```

2. **Update API Logic**
   ```typescript
   if (!isOwnRecord && isAdminOrManager) {
     updateData.edited_by = user.id
     updateData.edited_at = new Date().toISOString()
   }
   ```

3. **Add Visual Indicator**
   ```tsx
   {currentUserId !== recordOwnerId && (
     <Banner variant="warning">
       Editing as {role}
     </Banner>
   )}
   ```

4. **Update Success Messages**
   ```typescript
   const message = isAdminOrManager
     ? `Updated by ${role}`
     : 'Updated successfully'
   ```

5. **Test RLS Policies**
   - Ensure admin/manager can access records
   - Verify proper organization/team isolation

## Related Documentation

- [Edit Leave Request Sheet Component](/components/EditLeaveRequestSheet.tsx)
- [Leave Requests API Route](/app/api/leave-requests/[id]/route.ts)
- [Leave Request Details API](/app/api/leave-requests/[id]/details/route.ts)
- [RLS Policies Migration](/supabase/migrations/20250807000002_optimize_rls_policies.sql)
- [Audit Trail Migration](/supabase/migrations/20251106000000_add_audit_trail_to_leave_requests.sql)
