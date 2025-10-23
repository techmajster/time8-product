# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-10-23-multi-workspace-isolation-audit/spec.md

## Technical Requirements

### 1. API Route Audit Process

**Audit Methodology:**
- Systematically review all 76 API route files found in `app/api/`
- Identify routes that query organization-scoped data (users, teams, leave requests, settings, etc.)
- Document current state: which routes properly use `authenticateAndGetOrgContext()` vs hardcoded organization queries
- Categorize routes by priority:
  - **Critical:** Employee, team, leave request, calendar, billing, admin settings routes
  - **Medium:** Invitation, notification, schedule routes
  - **Low:** Debug, performance monitoring routes

**Audit Checklist per Route:**
- [ ] Does the route query organization-scoped data?
- [ ] Does it use `authenticateAndGetOrgContext()` to get organization context?
- [ ] Does it properly extract `organization.id` from the auth context?
- [ ] Are all database queries filtered by `organization_id`?
- [ ] Is there any hardcoded organization ID or missing organization filter?

### 2. Standard Cookie Usage Pattern

**Helper Function Creation:**
Create a standardized helper pattern that all routes should follow:

```typescript
// Pattern already exists in lib/auth-utils-v2.ts
// Function: authenticateAndGetOrgContext()
// Returns: AuthContext with validated user, organization, and role

// Standard usage in API routes:
const auth = await authenticateAndGetOrgContext()
if (!auth.success) {
  return auth.error
}

const { context } = auth
const { user, organization, role } = context
const organizationId = organization.id

// All subsequent queries MUST include:
.eq('organization_id', organizationId)
```

**Enforcement Requirements:**
- Every organization-scoped API route must use this pattern
- No direct cookie reading except via `authenticateAndGetOrgContext()`
- No hardcoded organization IDs in queries
- All queries must explicitly filter by the validated `organizationId`

### 3. Critical Routes to Fix

**Priority 1: Data Access Routes**

1. `/api/employees/route.ts` - Currently uses `authenticateAndGetOrgContext()` ✅
2. `/api/employees/[id]/route.ts` - Verify organization isolation
3. `/api/employees/[id]/leave-balances/route.ts` - Verify organization isolation
4. `/api/teams/route.ts` - Currently uses `authenticateAndGetOrgContext()` ✅
5. `/api/teams/[id]/route.ts` - Verify organization isolation
6. `/api/teams/[id]/members/route.ts` - Verify organization isolation
7. `/api/leave-requests/route.ts` - Currently uses `authenticateAndGetOrgContext()` ✅
8. `/api/leave-requests/[id]/route.ts` - Verify organization isolation
9. `/api/leave-requests/[id]/approve/route.ts` - Verify organization isolation
10. `/api/leave-requests/[id]/cancel/route.ts` - Verify organization isolation

**Priority 2: Calendar & Dashboard Routes**

11. `/api/calendar/leave-requests/route.ts` - Uses cookie ✅ but verify implementation
12. `/api/calendar/holidays/route.ts` - Uses cookie ✅ but verify implementation
13. `/api/dashboard-data/route.ts` - Audit organization filtering

**Priority 3: Admin & Settings Routes**

14. `/api/admin/settings/calendar-restriction/route.ts` - Verify organization isolation
15. `/api/admin/settings/google-workspace/route.ts` - Verify organization isolation
16. `/api/admin/settings/organization/route.ts` - Verify organization isolation
17. `/api/admin/leave-balances/route.ts` - Verify organization isolation

**Priority 4: Billing Routes**

18. `/api/billing/subscription/route.ts` - Verify organization isolation
19. `/api/billing/customer-portal/route.ts` - Verify organization isolation
20. `/api/billing/create-checkout/route.ts` - Verify organization isolation

**Priority 5: Invitation & User Management**

21. `/api/send-invitation/route.ts` - Verify organization isolation
22. `/api/invitations/accept/route.ts` - Verify organization isolation
23. `/api/organization/members/route.ts` - Verify organization isolation
24. `/api/team/members/route.ts` - Verify organization isolation

### 4. Integration Test Suite Requirements

**Test Structure:**
Create comprehensive integration tests at `__tests__/integration/api/multi-workspace-isolation.test.ts`

**Test Scenarios:**

1. **Setup Multi-Workspace Test Environment**
   - Create two test organizations: "Workspace A" and "Workspace B"
   - Create test admin user with access to both organizations
   - Create unique test data in each workspace (employees, teams, leave requests)

2. **Test Employee API Isolation**
   - Set cookie to Workspace A, verify only Workspace A employees returned
   - Switch cookie to Workspace B, verify only Workspace B employees returned
   - Attempt to access Workspace A employee ID while cookie is Workspace B (should fail)

3. **Test Team API Isolation**
   - Verify team listings are filtered by active workspace
   - Verify team creation only creates in active workspace
   - Verify team updates only work within active workspace

4. **Test Leave Request API Isolation**
   - Verify leave request listings are filtered by active workspace
   - Verify leave request creation only creates in active workspace
   - Verify approval/rejection only works for active workspace requests

5. **Test Calendar API Isolation**
   - Verify calendar data filtered by active workspace
   - Verify holidays scoped to active workspace

6. **Test Admin Settings API Isolation**
   - Verify settings changes only affect active workspace
   - Verify settings retrieval only shows active workspace settings

7. **Test Negative Cases**
   - Missing cookie (should fall back to default organization)
   - Invalid organization ID in cookie (should return 403)
   - User lacks access to organization in cookie (should return 403)
   - Attempt to access resource from different workspace (should return 403 or 404)

**Test Implementation Pattern:**
```typescript
describe('Multi-Workspace API Isolation', () => {
  let testUser: User
  let workspaceA: Organization
  let workspaceB: Organization
  let workspaceAEmployees: Employee[]
  let workspaceBEmployees: Employee[]

  beforeAll(async () => {
    // Setup test data
  })

  afterAll(async () => {
    // Cleanup test data
  })

  describe('GET /api/employees', () => {
    it('returns only Workspace A employees when cookie set to A', async () => {
      const response = await fetch('/api/employees', {
        headers: {
          'Cookie': `active-organization-id=${workspaceA.id}`
        }
      })
      const data = await response.json()
      expect(data.employees).toHaveLength(workspaceAEmployees.length)
      expect(data.employees.every(e => e.organization_id === workspaceA.id)).toBe(true)
    })

    it('returns only Workspace B employees when cookie set to B', async () => {
      // Similar test for Workspace B
    })

    it('returns 403 when cookie set to unauthorized organization', async () => {
      const response = await fetch('/api/employees', {
        headers: {
          'Cookie': `active-organization-id=00000000-0000-0000-0000-000000000000`
        }
      })
      expect(response.status).toBe(403)
    })
  })

  // Repeat for all critical endpoints
})
```

### 5. Developer Documentation

**Location:** Create `docs/api-development-standards.md`

**Contents:**

1. **Multi-Workspace Architecture Overview**
   - Explanation of multi-tenant data model
   - Organization isolation requirements
   - Cookie-based workspace switching

2. **Standard API Route Pattern**
   - Step-by-step template for creating new organization-scoped routes
   - Code examples with proper authentication
   - Common pitfalls to avoid

3. **Testing Requirements**
   - Requirement for multi-workspace isolation tests for all new routes
   - Test template and examples

4. **Security Checklist**
   - Checklist developers must follow before merging organization-scoped routes
   - Code review guidelines for reviewers

## Performance Considerations

- `authenticateAndGetOrgContext()` already includes caching via `getOrSetCache()` utility
- Cookie reading is fast and doesn't impact performance
- Database queries are already optimized with proper indexes on `organization_id`

## Security Considerations

- All routes must validate user has access to the organization from the cookie
- Never trust cookie value without validation via `user_organizations` table
- Always use parameterized queries (Supabase client handles this)
- Return 403 for unauthorized access, 404 for resources in different workspace

## Breaking Changes

None - this is a bug fix that enforces existing security requirements. Properly working multi-workspace admins should see no change in behavior.

## Migration Strategy

1. **Phase 1: Audit & Documentation** (Day 1)
   - Audit all routes, document current state
   - Identify all routes needing fixes
   - Create priority list

2. **Phase 2: Fix Critical Routes** (Day 1-2)
   - Fix Priority 1 routes (employees, teams, leave requests)
   - Add integration tests for fixed routes
   - Verify fixes don't break existing functionality

3. **Phase 3: Fix Remaining Routes** (Day 2-3)
   - Fix Priority 2-4 routes
   - Add comprehensive integration test coverage
   - Update developer documentation

4. **Phase 4: Validation & Deployment** (Day 3)
   - Run full integration test suite
   - Manual testing with multi-workspace admin account
   - Deploy to production with monitoring
