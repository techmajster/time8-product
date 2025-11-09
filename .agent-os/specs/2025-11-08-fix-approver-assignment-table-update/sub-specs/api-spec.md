# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-11-08-fix-approver-assignment-table-update/spec.md

## API Endpoint Changes

### PUT `/api/employees/[id]`

**Purpose:** Update employee profile information including approver assignment

**Current Issues:**
- Does not save `approver_id` field to database
- No validation for required approver
- No validation preventing manager self-approval

**Required Changes:**

#### 1. Request Body Schema

**Current:**
```typescript
{
  email: string
  full_name: string
  birth_date: string | null
  role: 'employee' | 'manager' | 'admin'
  team_id: string | null
  leave_balances: Array<{
    leave_type_id: string
    entitled_days: number
  }>
}
```

**Updated (Add approver_id):**
```typescript
{
  email: string
  full_name: string
  birth_date: string | null
  role: 'employee' | 'manager' | 'admin'
  team_id: string | null
  approver_id: string | null  // ⬅️ NEW FIELD
  leave_balances: Array<{
    leave_type_id: string
    entitled_days: number
  }>
}
```

#### 2. Validation Rules

**Add before database operations:**

```typescript
// Extract approver_id from request body (line ~148)
const {
  email,
  full_name,
  birth_date,
  role: employeeRole,
  team_id,
  approver_id,  // ⬅️ ADD THIS
  leave_balance_overrides
} = body

// Validation 1: Approver is required (after line ~143)
if (approver_id === null || approver_id === '') {
  return NextResponse.json({
    error: 'Osoba akceptująca urlop jest wymagana'
  }, { status: 400 })
}

// Validation 2: Manager cannot self-approve
if (approver_id === id && employeeRole === 'manager') {
  return NextResponse.json({
    error: 'Manager nie może być swoim własnym akceptującym'
  }, { status: 400 })
}

// Note: Admin CAN be their own approver - no validation needed
```

#### 3. Database Update Logic

**Current (lines ~169-185):**
```typescript
if (employeeRole !== undefined || team_id !== undefined) {
  const orgUpdates: any = {}
  if (employeeRole !== undefined) orgUpdates.role = employeeRole
  if (team_id !== undefined) orgUpdates.team_id = team_id

  const { error: orgError } = await supabaseAdmin
    .from('user_organizations')
    .update(orgUpdates)
    .eq('user_id', id)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
```

**Updated (Add approver_id):**
```typescript
if (employeeRole !== undefined || team_id !== undefined || approver_id !== undefined) {
  const orgUpdates: any = {}
  if (employeeRole !== undefined) orgUpdates.role = employeeRole
  if (team_id !== undefined) orgUpdates.team_id = team_id
  if (approver_id !== undefined) orgUpdates.approver_id = approver_id  // ⬅️ ADD THIS

  const { error: orgError } = await supabaseAdmin
    .from('user_organizations')
    .update(orgUpdates)
    .eq('user_id', id)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
```

#### 4. Response Schema

**Success Response (200 OK):**
```typescript
{
  message: string  // "Employee updated successfully"
}
```

**Error Responses:**

**400 Bad Request - Missing Approver:**
```json
{
  "error": "Osoba akceptująca urlop jest wymagana"
}
```

**400 Bad Request - Manager Self-Approval:**
```json
{
  "error": "Manager nie może być swoim własnym akceptującym"
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "error": "Forbidden"
}
```

**404 Not Found:**
```json
{
  "error": "Employee not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to update employee"
}
```

## Request/Response Examples

### Example 1: Valid Request (Manager with Different Approver)

**Request:**
```http
PUT /api/employees/usr_abc123 HTTP/1.1
Content-Type: application/json

{
  "email": "jan.kowalski@example.com",
  "full_name": "Jan Kowalski",
  "birth_date": "1990-05-15",
  "role": "manager",
  "team_id": "team_xyz789",
  "approver_id": "usr_admin456",
  "leave_balances": [
    {
      "leave_type_id": "lt_vacation",
      "entitled_days": 26
    }
  ]
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Employee updated successfully"
}
```

### Example 2: Invalid Request (Missing Approver)

**Request:**
```http
PUT /api/employees/usr_abc123 HTTP/1.1
Content-Type: application/json

{
  "email": "jan.kowalski@example.com",
  "full_name": "Jan Kowalski",
  "birth_date": "1990-05-15",
  "role": "manager",
  "team_id": "team_xyz789",
  "approver_id": null,
  "leave_balances": []
}
```

**Response:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Osoba akceptująca urlop jest wymagana"
}
```

### Example 3: Invalid Request (Manager Self-Approval)

**Request:**
```http
PUT /api/employees/usr_abc123 HTTP/1.1
Content-Type: application/json

{
  "email": "jan.kowalski@example.com",
  "full_name": "Jan Kowalski",
  "birth_date": "1990-05-15",
  "role": "manager",
  "team_id": "team_xyz789",
  "approver_id": "usr_abc123",  // ⬅️ Same as employee ID
  "leave_balances": []
}
```

**Response:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Manager nie może być swoim własnym akceptującym"
}
```

### Example 4: Valid Request (Admin Self-Approval Allowed)

**Request:**
```http
PUT /api/employees/usr_admin456 HTTP/1.1
Content-Type: application/json

{
  "email": "admin@example.com",
  "full_name": "Admin User",
  "birth_date": "1985-03-20",
  "role": "admin",
  "team_id": null,
  "approver_id": "usr_admin456",  // ⬅️ Admin can self-approve
  "leave_balances": []
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Employee updated successfully"
}
```

## Database Operations

### Update Query

**Table:** `user_organizations`

**Columns Updated:**
- `role` (if changed)
- `team_id` (if changed)
- `approver_id` (NEW - always updated when provided)

**Filter Conditions:**
- `user_id = [employee_id]`
- `organization_id = [current_org_id]`
- `is_active = true`

**SQL Example:**
```sql
UPDATE user_organizations
SET
  role = 'manager',
  team_id = 'team_xyz789',
  approver_id = 'usr_admin456'
WHERE
  user_id = 'usr_abc123'
  AND organization_id = 'org_123'
  AND is_active = true;
```

## Security Considerations

### 1. Authorization
- Only admins can update employee records
- Already enforced by existing middleware
- No changes needed

### 2. Data Validation
- `approver_id` must reference valid profile ID
- Foreign key constraint in database enforces referential integrity
- Database will reject invalid IDs

### 3. Role-Based Rules
- Manager role: Cannot set `approver_id` to self
- Admin role: Can set `approver_id` to self (auto-approval use case)
- Employee role: Cannot set `approver_id` to self

### 4. Organization Isolation
- `approver_id` must reference user in same organization
- Consider adding validation to check approver's organization
- Database foreign key prevents orphaned references

## Testing Requirements

### Unit Tests
- Request body parsing includes `approver_id`
- Validation rejects NULL approver
- Validation rejects empty string approver
- Validation rejects manager self-approval
- Validation allows admin self-approval

### Integration Tests
- Successful update saves `approver_id` to database
- Failed validation returns 400 error with correct message
- Database foreign key constraint enforced
- Deleted approver sets field to NULL (via ON DELETE SET NULL)

### Error Cases
- Invalid `approver_id` (non-existent user) → Database error
- `approver_id` from different organization → Should reject
- Missing `approver_id` in request → Validation error
- Empty string `approver_id` → Validation error

## Migration Notes

**No migration required** - Database schema already updated via:
- Migration: `20251108000000_add_approver_id_to_user_organizations.sql`
- Column exists: `user_organizations.approver_id UUID`
- Foreign key exists: References `profiles(id)` with `ON DELETE SET NULL`
- Index exists: `idx_user_organizations_approver_id`

## Rollback Plan

If issues arise after deployment:

1. **Quick Fix:** Revert API endpoint changes
2. **Database:** No rollback needed (column can remain, nullable)
3. **Frontend:** Users see validation errors until API is fixed
4. **Data:** Existing approver assignments remain in database

No data loss risk - changes are additive to existing functionality.
