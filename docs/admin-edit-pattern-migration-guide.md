# Admin Edit Pattern Migration Guide

## Overview

This guide shows how to implement the admin/manager edit pattern with audit trail for other entities in your application. The pattern used in `EditLeaveRequestSheet` can be applied to any resource that requires role-based editing permissions.

## Pattern Summary

The admin edit pattern consists of:

1. **Database Audit Fields** - Track who edited and when
2. **API Permission Logic** - Role-based access control
3. **Frontend Visual Indicators** - Show when editing as admin/manager
4. **Data Separation** - Distinguish between logged-in user and resource owner
5. **Role-Specific Messaging** - Context-aware success messages

## Step-by-Step Migration

### Step 1: Add Database Audit Fields

Add `edited_by` and `edited_at` fields to your table:

```sql
-- Example: Adding audit trail to 'time_off_policies' table
ALTER TABLE time_off_policies
ADD COLUMN edited_by UUID REFERENCES auth.users(id),
ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN time_off_policies.edited_by IS 'User who last edited this policy (for admin/manager edits)';
COMMENT ON COLUMN time_off_policies.edited_at IS 'Timestamp when policy was last edited by admin/manager';
```

**Best Practices:**
- Always use `UUID` type for `edited_by` to reference `auth.users`
- Always use `TIMESTAMP WITH TIME ZONE` for `edited_at`
- Make both fields nullable (not every edit needs audit trail)
- Add descriptive comments for future developers

### Step 2: Verify RLS Policies

Ensure your RLS policies support admin/manager access:

```sql
-- Example policy structure
CREATE POLICY "Admins can manage all policies" ON time_off_policies
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid()
      AND organization_id = time_off_policies.organization_id
      AND role = 'admin'
      AND is_active = true
  )
);

CREATE POLICY "Managers can manage team policies" ON time_off_policies
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_organizations uo1
    JOIN user_organizations uo2 ON uo2.organization_id = uo1.organization_id
    WHERE uo1.user_id = auth.uid()
      AND uo2.user_id = time_off_policies.created_by
      AND uo1.role = 'manager'
      AND uo1.team_id = uo2.team_id
      AND uo1.is_active = true
  )
);
```

**Key Points:**
- Admins: Organization-wide access
- Managers: Team-only access (when applicable)
- Employees: Own resources only
- Always check `is_active` status

### Step 3: Update API Route

Modify your PUT/PATCH endpoint to add audit trail logic:

```typescript
// File: /app/api/your-resource/[id]/route.ts

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { field1, field2, field3 } = await request.json()
    const { id: resourceId } = await params

    // Authentication
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) return auth.error
    const { context } = auth
    const { user, organization, role } = context
    const organizationId = organization.id
    const isManager = role === 'admin' || role === 'manager'

    // Fetch existing resource
    const supabase = await createClient()
    const { data: existingResource, error: fetchError } = await supabase
      .from('your_table')
      .select('*')
      .eq('id', resourceId)
      .eq('organization_id', organizationId)
      .single()

    if (fetchError || !existingResource) {
      return NextResponse.json(
        { error: 'Resource not found or access denied' },
        { status: 404 }
      )
    }

    // Permission check
    const isOwnResource = existingResource.created_by === user.id
    if (!isOwnResource && !isManager) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this resource' },
        { status: 403 }
      )
    }

    // Build update data
    const updateData: Record<string, any> = {
      field1,
      field2,
      field3,
      updated_at: new Date().toISOString()
    }

    // 🔥 ADD AUDIT TRAIL - Key pattern
    if (!isOwnResource && isManager) {
      updateData.edited_by = user.id
      updateData.edited_at = new Date().toISOString()
    }

    // Perform update
    const { error: updateError } = await supabase
      .from('your_table')
      .update(updateData)
      .eq('id', resourceId)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: 'Resource updated successfully'
    })

  } catch (error) {
    console.error('API Error updating resource:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Key Logic:**
```typescript
// Only set audit trail when admin/manager edits someone else's resource
if (!isOwnResource && isManager) {
  updateData.edited_by = user.id
  updateData.edited_at = new Date().toISOString()
}
```

### Step 4: Update Data Fetching API

Ensure your details endpoint returns both owner and logged-in user data:

```typescript
// File: /app/api/your-resource/[id]/details/route.ts

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: resourceId } = await params

    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) return auth.error
    const { context } = auth
    const { user, organization, userOrganization } = context
    const organizationId = organization.id

    const supabaseAdmin = createAdminClient()

    // Fetch resource with owner details
    const { data: resource } = await supabaseAdmin
      .from('your_table')
      .select(`
        *,
        profiles!your_table_created_by_fkey (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('id', resourceId)
      .eq('organization_id', organizationId)
      .single()

    if (!resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      )
    }

    // Get resource owner's role
    const { data: ownerOrgData } = await supabaseAdmin
      .from('user_organizations')
      .select('role')
      .eq('user_id', resource.created_by)
      .eq('organization_id', organizationId)
      .single()

    // 🔥 RETURN BOTH CONTEXTS - Key pattern
    return NextResponse.json({
      resource,
      // Owner context
      ownerProfile: {
        id: resource.created_by,
        full_name: resource.profiles?.full_name || null,
        email: resource.profiles?.email || '',
        role: ownerOrgData?.role || 'employee'
      },
      // Logged-in user context
      currentUserRole: userOrganization.role,
      currentUserId: user.id
    })

  } catch (error) {
    console.error('API Error fetching resource details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Critical Data Separation:**
- `ownerProfile` - Resource owner's data
- `currentUserRole` - Logged-in user's role
- `currentUserId` - Logged-in user's ID

### Step 5: Update Frontend Component

Add visual indicators and role-specific messaging:

```tsx
// File: /components/EditResourceSheet.tsx

interface EditResourceSheetProps {
  resource: Resource
  ownerProfile: UserProfile  // Resource owner's profile
  currentUserRole: string    // Logged-in user's role
  currentUserId: string      // Logged-in user's ID
  isOpen: boolean
  onClose: () => void
}

export function EditResourceSheet({
  resource,
  ownerProfile,
  currentUserRole,
  currentUserId,
  isOpen,
  onClose
}: EditResourceSheetProps) {

  // Check if logged-in user is editing someone else's resource
  const isAdminEdit = currentUserId !== resource.created_by
  const isManager = currentUserRole === 'admin' || currentUserRole === 'manager'

  const handleSubmit = async () => {
    // ... validation logic ...

    const response = await fetch(`/api/your-resource/${resource.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    })

    if (response.ok) {
      // 🔥 ROLE-SPECIFIC SUCCESS MESSAGE - Key pattern
      const message = currentUserRole === 'admin'
        ? 'Resource updated as administrator'
        : currentUserRole === 'manager'
        ? 'Resource updated as manager'
        : 'Resource updated successfully'

      toast.success(message)
      onClose()
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent>
        <SheetTitle>Edit Resource</SheetTitle>

        {/* 🔥 ADMIN EDIT INDICATOR - Key pattern */}
        {isAdminEdit && isManager && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-900 dark:text-amber-100">
                {currentUserRole === 'admin'
                  ? 'Editing as administrator'
                  : 'Editing as manager'}
              </p>
            </div>
          </div>
        )}

        {/* Your form fields here */}

        <Button onClick={handleSubmit}>
          Save Changes
        </Button>
      </SheetContent>
    </Sheet>
  )
}
```

**Key UI Elements:**
1. Amber warning banner for admin/manager edits
2. Role-specific banner text
3. Role-specific success messages
4. Clear visual distinction from normal edits

### Step 6: Update Parent Component

Pass the correct user contexts to the edit component:

```tsx
// File: /app/your-resource/page.tsx

export default function ResourcePage() {
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [resourceDetails, setResourceDetails] = useState<any>(null)

  const handleEditClick = async (resource: Resource) => {
    // Fetch detailed data with user contexts
    const response = await fetch(`/api/your-resource/${resource.id}/details`)
    const data = await response.json()

    setResourceDetails(data)
    setSelectedResource(resource)
  }

  return (
    <>
      {/* Your resource list */}

      {resourceDetails && (
        <EditResourceSheet
          resource={selectedResource}
          ownerProfile={resourceDetails.ownerProfile}
          currentUserRole={resourceDetails.currentUserRole}
          currentUserId={resourceDetails.currentUserId}
          isOpen={!!selectedResource}
          onClose={() => {
            setSelectedResource(null)
            setResourceDetails(null)
          }}
        />
      )}
    </>
  )
}
```

## Testing Checklist

### Employee Tests
- [ ] Employee can edit own resources
- [ ] Employee cannot edit other users' resources
- [ ] No audit trail created when editing own resources
- [ ] No admin banner shown when editing own resources

### Manager Tests
- [ ] Manager can edit team member resources
- [ ] Manager cannot edit resources from other teams
- [ ] Audit trail created (`edited_by` + `edited_at`)
- [ ] Manager banner shown when editing team member resources
- [ ] Role-specific success message displayed

### Admin Tests
- [ ] Admin can edit ANY resource in organization
- [ ] Admin cannot edit resources from other organizations
- [ ] Audit trail created (`edited_by` + `edited_at`)
- [ ] Admin banner shown when editing other users' resources
- [ ] Role-specific success message displayed

### Audit Trail Tests
- [ ] `edited_by` set to logged-in user ID (admin/manager only)
- [ ] `edited_at` set to current timestamp (admin/manager only)
- [ ] Audit fields remain NULL when user edits own resource
- [ ] Audit trail persists through subsequent edits

## Common Pitfalls

### ❌ Wrong: Using Resource Owner's Role for Permissions

```typescript
// DON'T DO THIS
if (ownerProfile.role === 'admin') {
  // This checks if the OWNER is admin, not the logged-in user!
}
```

### ✅ Correct: Using Logged-In User's Role

```typescript
// DO THIS
if (currentUserRole === 'admin') {
  // This correctly checks the logged-in user's role
}
```

### ❌ Wrong: Always Setting Audit Trail

```typescript
// DON'T DO THIS
updateData.edited_by = user.id  // Always sets, even for own edits!
```

### ✅ Correct: Conditional Audit Trail

```typescript
// DO THIS
if (!isOwnResource && isManager) {
  updateData.edited_by = user.id
  updateData.edited_at = new Date().toISOString()
}
```

### ❌ Wrong: Not Distinguishing User Contexts

```typescript
// DON'T DO THIS - Confuses owner and logged-in user
interface Props {
  resource: Resource
  userRole: string  // Whose role? Owner's or logged-in user's?
}
```

### ✅ Correct: Clear User Context Separation

```typescript
// DO THIS - Clear separation
interface Props {
  resource: Resource
  ownerProfile: UserProfile     // Resource owner
  currentUserRole: string       // Logged-in user
  currentUserId: string         // Logged-in user
}
```

## Complete Example

See the leave request implementation for a complete working example:

- **Component**: [EditLeaveRequestSheet.tsx](/components/EditLeaveRequestSheet.tsx)
- **API Route**: [/app/api/leave-requests/[id]/route.ts](/app/api/leave-requests/[id]/route.ts)
- **Details API**: [/app/api/leave-requests/[id]/details/route.ts](/app/api/leave-requests/[id]/details/route.ts)
- **Tests**: [/__tests__/api/leave-requests/edit-permissions.test.ts](/__tests__/api/leave-requests/edit-permissions.test.ts)
- **Audit Trail Docs**: [leave-request-audit-trail.md](/docs/leave-request-audit-trail.md)

## Key Takeaways

1. **Database**: Add `edited_by` and `edited_at` fields
2. **API**: Set audit trail only when admin/manager edits someone else's resource
3. **Frontend**: Show visual indicator when editing as admin/manager
4. **Data**: Always separate owner context from logged-in user context
5. **Messages**: Provide role-specific success messages
6. **Testing**: Cover all role combinations and audit trail scenarios

## Questions?

For implementation questions or issues, refer to:
- [Leave Request Audit Trail Documentation](/docs/leave-request-audit-trail.md)
- [EditLeaveRequestSheet Component](/components/EditLeaveRequestSheet.tsx)
- Phase 2.12 Implementation Notes in Roadmap
