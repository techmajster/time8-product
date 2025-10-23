# API Development Standards for Multi-Workspace Applications

> Created: 2025-10-23
> Last Updated: 2025-10-23
> Status: Active

## Overview

This document defines the standard patterns for developing API routes in multi-workspace applications. These standards emerged from the **Multi-Workspace Isolation Audit & Fix** initiative (Sprint 1 & 2), which identified and fixed critical security vulnerabilities in workspace data isolation.

## Core Principles

1. **Workspace Isolation**: All organization-scoped routes must respect the active workspace context
2. **Consistent Authentication**: Use standard authentication utilities across all routes
3. **Role-Based Access Control**: Validate user permissions within the current workspace
4. **Defense in Depth**: Never trust client-provided organization IDs

## Standard Authentication Pattern

### ✅ CORRECT: Using `authenticateAndGetOrgContext()`

All organization-scoped API routes should use the `authenticateAndGetOrgContext()` helper from `@/lib/auth-utils-v2`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetOrgContext, requireRole } from '@/lib/auth-utils-v2'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Step 1: Authenticate and get workspace context
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      return auth.error // Returns 401/403 with appropriate message
    }

    const { context } = auth
    const { user, organization, role, permissions } = context
    const organizationId = organization.id

    // Step 2 (Optional): Check role requirements
    const roleCheck = requireRole(context, ['admin', 'manager'])
    if (roleCheck) {
      return roleCheck // Returns 403 if role not met
    }

    // Step 3: Use organizationId for all data queries
    const adminClient = await createAdminClient()
    const { data, error } = await adminClient
      .from('your_table')
      .select('*')
      .eq('organization_id', organizationId) // ✅ Always filter by workspace

    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### ❌ INCORRECT: Manual Cookie Reading

**Never** read the `active-organization-id` cookie manually:

```typescript
// ❌ BAD - Don't do this!
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const activeOrgId = cookieStore.get('active-organization-id')?.value

  // This bypasses validation and creates security vulnerabilities
  const { data } = await supabase
    .from('data')
    .eq('organization_id', activeOrgId) // ❌ No validation!
}
```

### ❌ INCORRECT: Accepting Organization ID from Client

**Never** accept organization IDs from query parameters or request body without validation:

```typescript
// ❌ BAD - Don't do this!
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('organization_id') // ❌ Trusting client input!

  // Any user could access any organization's data!
  const { data } = await supabase
    .from('data')
    .eq('organization_id', orgId)
}
```

## What `authenticateAndGetOrgContext()` Does

The `authenticateAndGetOrgContext()` function provides comprehensive authentication and authorization in a single call:

1. **Authenticates the user** - Verifies valid session
2. **Loads user profile** - Retrieves full user information
3. **Determines active organization** - Respects priority:
   - `x-organization-id` header (API/automation)
   - `active-organization-id` cookie (workspace switching)
   - Default organization (fallback)
4. **Validates membership** - Confirms user belongs to organization
5. **Retrieves role** - Gets user's role in that organization
6. **Loads permissions** - Fetches role-based permissions

### Return Value

```typescript
type AuthResult = {
  success: true
  context: {
    user: User              // Full user object
    profile: Profile        // User profile
    organization: Organization // Full organization object
    role: 'admin' | 'manager' | 'employee'
    permissions: string[]   // Role permissions
  }
} | {
  success: false
  error: NextResponse     // Pre-formatted 401/403 error response
}
```

## Role-Based Access Control

### Using `requireRole()`

For routes that require specific roles:

```typescript
import { requireRole } from '@/lib/auth-utils-v2'

export async function DELETE(request: NextRequest) {
  const auth = await authenticateAndGetOrgContext()
  if (!auth.success) {
    return auth.error
  }

  const { context } = auth

  // Only admins can delete
  const roleCheck = requireRole(context, ['admin'])
  if (roleCheck) {
    return roleCheck // Returns 403 with role requirement message
  }

  // Proceed with admin-only logic
}
```

### Multiple Acceptable Roles

```typescript
// Allow both admins and managers
const roleCheck = requireRole(context, ['admin', 'manager'])
```

### Admin-Only Routes

For system-wide administrative routes (billing stats, cleanup tasks, etc.):

```typescript
export async function GET(request: NextRequest) {
  // SECURITY: Admin-only endpoint for system-wide statistics
  const auth = await authenticateAndGetOrgContext()
  if (!auth.success) {
    return auth.error
  }

  const { context } = auth
  const roleCheck = requireRole(context, ['admin'])
  if (roleCheck) {
    return roleCheck
  }

  // This endpoint returns data across ALL organizations
  // Only admins should access it
  const { data } = await supabaseAdmin
    .from('billing_events')
    .select('*')
  // Note: No organization_id filter for system-wide views
}
```

## Common Patterns by Route Type

### 1. Employee Management Routes

**Pattern**: Verify employee exists in current workspace

```typescript
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: employeeId } = await params

  const auth = await authenticateAndGetOrgContext()
  if (!auth.success) {
    return auth.error
  }

  const { context } = auth
  const { organization } = context
  const organizationId = organization.id

  const roleCheck = requireRole(context, ['admin'])
  if (roleCheck) {
    return roleCheck
  }

  const adminClient = await createAdminClient()

  // ✅ Verify employee exists in current workspace
  const { data: employee } = await adminClient
    .from('user_organizations')
    .select('user_id')
    .eq('user_id', employeeId)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single()

  if (!employee) {
    return NextResponse.json(
      { error: 'Employee not found in this organization' },
      { status: 404 }
    )
  }

  // Proceed with update
}
```

### 2. Calendar/Dashboard Data Routes

**Pattern**: Filter all queries by organizationId

```typescript
export async function GET(request: NextRequest) {
  const auth = await authenticateAndGetOrgContext()
  if (!auth.success) {
    return auth.error
  }

  const { context } = auth
  const { organization } = context
  const organizationId = organization.id

  const adminClient = await createAdminClient()

  // ✅ Always filter by organizationId
  const { data: leaveRequests } = await adminClient
    .from('leave_requests')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'approved')

  return NextResponse.json(leaveRequests || [])
}
```

### 3. Billing Routes

**Pattern**: Validate organization ownership before billing operations

```typescript
export async function GET(request: NextRequest) {
  // Validate user belongs to organization before accessing billing
  const auth = await authenticateAndGetOrgContext()
  if (!auth.success) {
    return auth.error
  }

  const { context } = auth
  const { organization } = context
  const organizationId = organization.id

  const supabase = await createClient()

  // ✅ Use organizationId from auth context (never from query params!)
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  return NextResponse.json(subscription)
}
```

### 4. Organization Creation/Upgrade Routes

**Pattern**: Conditional validation for existing organizations

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { organization_data } = body

  // ✅ If upgrading an existing organization, validate ownership
  if (organization_data?.id) {
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      return auth.error
    }

    const { context } = auth
    const { organization } = context

    // Verify the organization ID matches authenticated user's organization
    if (organization.id !== organization_data.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Cannot create checkout for different organization' },
        { status: 403 }
      )
    }
  }
  // ✅ New organization creation is allowed (onboarding flow)

  // Proceed with checkout creation
}
```

## Error Handling

### Standard Error Responses

The `authenticateAndGetOrgContext()` function returns pre-formatted error responses:

- **401 Unauthorized**: No valid session
- **403 Forbidden**: User not member of organization or insufficient permissions
- **404 Not Found**: Organization doesn't exist

### Custom Error Messages

```typescript
const auth = await authenticateAndGetOrgContext()
if (!auth.success) {
  return auth.error // Already formatted with appropriate status and message
}

// For custom validation errors:
if (!someCondition) {
  return NextResponse.json(
    { error: 'Descriptive error message' },
    { status: 400 } // 400 for validation errors
  )
}
```

## Database Queries

### Using Admin Client vs Regular Client

**Admin Client** - Use for bypassing RLS when you've already validated permissions:

```typescript
import { createAdminClient } from '@/lib/supabase/server'

const adminClient = await createAdminClient()

// ✅ Admin client bypasses RLS, but we've already validated via auth
const { data } = await adminClient
  .from('leave_balances')
  .select('*')
  .eq('organization_id', organizationId) // ✅ Still filter by org!
```

**Regular Client** - Use when RLS policies should apply:

```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()

// ✅ Regular client enforces RLS policies
const { data } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('organization_id', organizationId)
```

### Always Filter by Organization

**Critical Rule**: Even when using admin client, always filter by `organization_id`:

```typescript
// ✅ CORRECT
const { data } = await adminClient
  .from('employees')
  .select('*')
  .eq('organization_id', organizationId) // ✅ Workspace filter

// ❌ INCORRECT
const { data } = await adminClient
  .from('employees')
  .select('*') // ❌ Returns data from ALL organizations!
```

## Testing Workspace Isolation

Every organization-scoped route should have tests verifying:

1. **Cross-organization access prevention**
```typescript
test('should not access data from different organization', async () => {
  const request = createMockRequest({
    userId: user1,
    organizationId: org1Id,
    cookies: { 'active-organization-id': org1Id }
  })

  // Try to access org2's data
  const params = Promise.resolve({ id: org2EmployeeId })
  const response = await routeHandler(request, { params })

  expect(response.status).toBe(404) // Should not find org2 employee
})
```

2. **Multi-workspace admin switching**
```typescript
test('should respect active-organization-id when switching workspaces', async () => {
  // Admin in both org1 and org2
  const org1Request = createMockRequest({
    userId: multiOrgAdmin,
    organizationId: org1Id,
    cookies: { 'active-organization-id': org1Id }
  })

  const org1Response = await routeHandler(org1Request)
  const org1Data = await org1Response.json()

  // Switch to org2
  const org2Request = createMockRequest({
    userId: multiOrgAdmin,
    organizationId: org2Id,
    cookies: { 'active-organization-id': org2Id }
  })

  const org2Response = await routeHandler(org2Request)
  const org2Data = await org2Response.json()

  // Data should be completely different
  expect(org1Data).not.toEqual(org2Data)
})
```

3. **Role-based access control**
```typescript
test('should enforce role requirements', async () => {
  // Admin should succeed
  const adminRequest = createMockRequest({
    userId: adminUser,
    organizationId: org1Id,
    role: 'admin'
  })
  const adminResponse = await routeHandler(adminRequest)
  expect(adminResponse.status).toBe(200)

  // Employee should be forbidden
  const employeeRequest = createMockRequest({
    userId: employeeUser,
    organizationId: org1Id,
    role: 'employee'
  })
  const employeeResponse = await routeHandler(employeeRequest)
  expect(employeeResponse.status).toBe(403)
})
```

## Security Checklist

Before deploying any new organization-scoped API route, verify:

- [ ] Uses `authenticateAndGetOrgContext()` for authentication
- [ ] Uses `requireRole()` if route requires specific roles
- [ ] Never accepts organization ID from query params or request body (except validated scenarios)
- [ ] Always filters database queries by `organizationId` from auth context
- [ ] Validates employee/resource exists in current workspace
- [ ] Has integration tests for cross-organization access prevention
- [ ] Has integration tests for multi-workspace admin scenarios
- [ ] Has integration tests for role-based access control

## Migration Guide

### Migrating Existing Routes

If you have routes using the old manual cookie reading pattern:

**Before:**
```typescript
const { cookies } = await import('next/headers')
const cookieStore = await cookies()
const activeOrgId = cookieStore.get('active-organization-id')?.value

const { data } = await supabase
  .from('data')
  .eq('organization_id', activeOrgId)
```

**After:**
```typescript
const auth = await authenticateAndGetOrgContext()
if (!auth.success) {
  return auth.error
}

const { context } = auth
const { organization } = context
const organizationId = organization.id

const { data } = await supabase
  .from('data')
  .eq('organization_id', organizationId)
```

### Benefits of Migration

1. **Security**: Validates user belongs to organization
2. **Consistency**: Same pattern across all routes
3. **Maintainability**: Single source of truth for auth logic
4. **Features**: Automatic handling of header overrides for automation
5. **Error Handling**: Pre-formatted error responses

## Examples from Audit

See the Multi-Workspace Isolation Audit for real-world examples:

- **Sprint 1 Fixes**: Critical security vulnerabilities
  - [/api/billing/subscription/route.ts](../../app/api/billing/subscription/route.ts)
  - [/api/invitations/accept/route.ts](../../app/api/invitations/accept/route.ts)
  - [/api/organizations/route.ts](../../app/api/organizations/route.ts)
  - [/api/admin/fix-workspace-owners-balances/route.ts](../../app/api/admin/fix-workspace-owners-balances/route.ts)

- **Sprint 2 Consolidation**: Pattern standardization
  - [/api/employees/[id]/route.ts](../../app/api/employees/[id]/route.ts)
  - [/api/calendar/leave-requests/route.ts](../../app/api/calendar/leave-requests/route.ts)
  - [/api/billing/customer-portal/route.ts](../../app/api/billing/customer-portal/route.ts)

## References

- **Auth Utils**: [lib/auth-utils-v2.ts](../../lib/auth-utils-v2.ts)
- **Test Helpers**: [__tests__/utils/test-helpers.ts](../../__tests__/utils/test-helpers.ts)
- **Integration Tests**: [__tests__/multi-organization/workspace-isolation-audit.test.ts](../../__tests__/multi-organization/workspace-isolation-audit.test.ts)
- **Audit Results**: [audit-results.md](./audit-results.md)

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2025-10-23 | 1.0 | Initial release after Sprint 1 & 2 completion |

---

*These standards are based on lessons learned from the Multi-Workspace Isolation Audit & Fix initiative, which identified and resolved critical security vulnerabilities across 16 API routes.*
