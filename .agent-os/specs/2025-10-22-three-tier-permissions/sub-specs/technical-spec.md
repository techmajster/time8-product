# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-10-22-three-tier-permissions/spec.md

## Technical Requirements

### 1. Role Terminology Standardization

The database already uses `employee` as the role name, but the spec references `normal_user`. We will:
- Keep database enum as `employee` (already exists in `user_organizations.role`)
- Use `employee` consistently throughout the codebase
- Map UI labels appropriately:
  - Database: `employee` → UI Display: "Pracownik" (PL) / "Employee" (EN)
  - Database: `manager` → UI Display: "Kierownik" (PL) / "Manager" (EN)
  - Database: `admin` → UI Display: "Administrator" (PL) / "Admin" (EN)

### 2. Role Permission Matrix

| Feature | Employee | Manager | Admin |
|---------|----------|---------|-------|
| Dashboard | ✓ View | ✓ View | ✓ View |
| Calendar | ✓ View | ✓ View | ✓ View |
| My Profile | ✓ Edit Own | ✓ Edit Own | ✓ Edit Own |
| My Leave | ✓ CRUD Own | ✓ CRUD Own | ✓ CRUD Own |
| Team Page | ✗ Hidden | ✓ READ-ONLY | ✓ CRUD |
| Groups Page | ✗ Hidden | ✓ READ-ONLY | ✓ CRUD |
| Leave Management | ✗ Own Only | ✓ Approve/Reject | ✓ Full CRUD |
| Settings | ✗ Hidden | ✗ Hidden | ✓ CRUD |
| User Management | ✗ Hidden | ✗ Hidden | ✓ CRUD |
| Absence Types | ✗ Hidden | ✗ Hidden | ✓ CRUD |

### 3. Database Schema

**No database changes required** - the `user_organizations` table already has:
```sql
role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'employee'))
```

### 4. Role Utilities and Hooks

Create utility functions and hooks for role checking:

**File: `lib/permissions.ts`**
```typescript
export type UserRole = 'admin' | 'manager' | 'employee';

export const ROLE_PERMISSIONS = {
  employee: {
    canViewDashboard: true,
    canViewCalendar: true,
    canEditOwnProfile: true,
    canManageOwnLeave: true,
    canViewTeam: false,
    canViewGroups: false,
    canManageLeaveRequests: false,
    canAccessSettings: false,
    canManageUsers: false,
    canManageAbsenceTypes: false,
  },
  manager: {
    canViewDashboard: true,
    canViewCalendar: true,
    canEditOwnProfile: true,
    canManageOwnLeave: true,
    canViewTeam: true,
    canEditTeam: false,
    canViewGroups: true,
    canEditGroups: false,
    canManageLeaveRequests: true,
    canCreateLeaveForTeam: true,
    canAccessSettings: false,
    canManageUsers: false,
    canManageAbsenceTypes: false,
  },
  admin: {
    canViewDashboard: true,
    canViewCalendar: true,
    canEditOwnProfile: true,
    canManageOwnLeave: true,
    canViewTeam: true,
    canEditTeam: true,
    canViewGroups: true,
    canEditGroups: true,
    canManageLeaveRequests: true,
    canCreateLeaveForTeam: true,
    canAccessSettings: true,
    canManageUsers: true,
    canManageAbsenceTypes: true,
  },
};

export function hasPermission(
  role: UserRole,
  permission: keyof typeof ROLE_PERMISSIONS.admin
): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

export function canEditResource(role: UserRole): boolean {
  return role === 'admin';
}

export function canViewResource(role: UserRole, resource: 'team' | 'groups'): boolean {
  if (resource === 'team') {
    return hasPermission(role, 'canViewTeam');
  }
  if (resource === 'groups') {
    return hasPermission(role, 'canViewGroups');
  }
  return false;
}
```

**File: `hooks/use-user-role.ts`**
```typescript
import { useCurrentOrganization } from './use-current-organization';
import { UserRole } from '@/lib/permissions';

export function useUserRole(): UserRole | null {
  const { currentMembership } = useCurrentOrganization();
  return currentMembership?.role ?? null;
}
```

### 5. Navigation Menu Filtering

**File: `components/app-sidebar.tsx`** (modify existing)

Add role-based filtering to navigation items:
```typescript
// Add to each nav item:
{
  title: t('team'),
  url: '/team',
  icon: Users,
  requiresRole: ['admin', 'manager'] as UserRole[], // NEW
}

// Filter navigation items based on role
const filteredNavItems = navItems.filter(item => {
  if (!item.requiresRole) return true;
  const userRole = useUserRole();
  return userRole && item.requiresRole.includes(userRole);
});
```

### 6. Route Protection Middleware

**File: `middleware.ts`** (modify existing)

Add role-based route protection:
```typescript
const protectedRoutes = {
  '/team': ['admin', 'manager'],
  '/groups': ['admin', 'manager'],
  '/settings': ['admin'],
  '/users': ['admin'],
  '/absence-types': ['admin'],
};

// Check if user has required role for the route
const requiredRoles = protectedRoutes[pathname];
if (requiredRoles && !requiredRoles.includes(userRole)) {
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
```

### 7. Component-Level Permission Enforcement

**Example: Team Page READ-ONLY Mode**

**File: `app/[locale]/dashboard/team/page.tsx`** (modify existing)
```typescript
import { useUserRole } from '@/hooks/use-user-role';
import { canEditResource } from '@/lib/permissions';

export default function TeamPage() {
  const userRole = useUserRole();
  const canEdit = canEditResource(userRole);

  return (
    <div>
      {/* Only show Add/Edit/Delete buttons for admins */}
      {canEdit && (
        <Button onClick={handleAddMember}>Add Member</Button>
      )}

      {/* Table with conditional edit/delete actions */}
      <DataTable
        data={teamMembers}
        columns={getColumns(canEdit)} // Pass canEdit flag
      />
    </div>
  );
}
```

**Example: Groups Page READ-ONLY Mode**

**File: `app/[locale]/dashboard/groups/page.tsx`** (modify existing)
```typescript
import { useUserRole } from '@/hooks/use-user-role';
import { canEditResource } from '@/lib/permissions';

export default function GroupsPage() {
  const userRole = useUserRole();
  const canEdit = canEditResource(userRole);

  return (
    <div>
      {/* Only show Add/Edit/Delete buttons for admins */}
      {canEdit && (
        <Button onClick={handleAddGroup}>Add Group</Button>
      )}

      {/* Table with conditional edit/delete actions */}
      <DataTable
        data={groups}
        columns={getColumns(canEdit)} // Pass canEdit flag
      />
    </div>
  );
}
```

### 8. Role Assignment UI

**File: `app/[locale]/dashboard/users/[id]/edit/page.tsx`** (modify existing)

Add role dropdown to user edit form:
```typescript
<Select
  value={role}
  onValueChange={(value: UserRole) => setRole(value)}
>
  <SelectTrigger>
    <SelectValue placeholder={t('selectRole')} />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="employee">{t('employee')}</SelectItem>
    <SelectItem value="manager">{t('manager')}</SelectItem>
    <SelectItem value="admin">{t('admin')}</SelectItem>
  </SelectContent>
</Select>
```

### 9. Leave Request Management for Managers

Managers should be able to:
- View all leave requests in their organization
- Approve/reject leave requests
- Create leave requests on behalf of team members

**File: `app/[locale]/dashboard/leave-requests/page.tsx`** (verify existing functionality)
- Ensure managers can access this page
- Verify approval/rejection functionality works for managers
- Add ability for managers to create leave on behalf of others

### 10. Internationalization Updates

**File: `messages/en.json`** (add new keys)
```json
{
  "roles": {
    "employee": "Employee",
    "manager": "Manager",
    "admin": "Administrator",
    "selectRole": "Select Role"
  },
  "permissions": {
    "noAccess": "You don't have permission to access this page",
    "readOnly": "You have read-only access to this page",
    "contactAdmin": "Contact your administrator for access"
  }
}
```

**File: `messages/pl.json`** (add new keys)
```json
{
  "roles": {
    "employee": "Pracownik",
    "manager": "Kierownik",
    "admin": "Administrator",
    "selectRole": "Wybierz rolę"
  },
  "permissions": {
    "noAccess": "Nie masz uprawnień do tej strony",
    "readOnly": "Masz dostęp tylko do odczytu",
    "contactAdmin": "Skontaktuj się z administratorem"
  }
}
```

## Testing Requirements

1. **Role Assignment Testing**
   - Verify admins can assign roles to users
   - Verify role changes take effect immediately
   - Verify role persistence in database

2. **Navigation Testing**
   - Verify employees see only: Dashboard, Calendar, My Profile, My Leave
   - Verify managers see employee pages + Team, Groups (READ-ONLY)
   - Verify admins see all pages

3. **Route Protection Testing**
   - Verify employees are redirected when accessing /team or /groups
   - Verify managers can access /team and /groups but not /settings
   - Verify admins can access all routes

4. **Component Permission Testing**
   - Verify Add/Edit/Delete buttons hidden for managers on Team/Groups pages
   - Verify managers cannot submit forms or perform CRUD on Team/Groups
   - Verify admins see and can use all CRUD buttons

5. **Leave Management Testing**
   - Verify managers can approve/reject leave requests
   - Verify managers can create leave on behalf of team members
   - Verify employees can only manage their own leave

## Performance Considerations

- Role checks should be client-side cached using React Context or Zustand store
- Avoid repeated database queries for role information
- Use middleware for route protection to prevent unnecessary page loads
- Component-level permission checks should use memoized values

## Security Considerations

- Always validate permissions server-side in API routes
- Never trust client-side permission checks alone
- Use Supabase RLS policies to enforce database-level permissions
- Ensure role changes are logged for audit purposes (future Phase 7 feature)
