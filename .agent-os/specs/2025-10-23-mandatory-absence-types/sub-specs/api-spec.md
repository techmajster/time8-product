# API Specification

This is the API specification for the spec detailed in [.agent-os/specs/2025-10-23-mandatory-absence-types/spec.md](../.agent-os/specs/2025-10-23-mandatory-absence-types/spec.md)

## API Endpoints

### DELETE /api/leave-types/[id]

**Purpose:** Delete a leave type (prevented for mandatory types)

**Method:** DELETE

**Route:** `/app/api/leave-types/[id]/route.ts`

**Authentication:** Required (Admin only)

**Parameters:**
- `id` (path parameter): UUID of the leave type to delete

**Request Headers:**
```
Authorization: Bearer <supabase_token>
Content-Type: application/json
```

**Response (Success - Non-Mandatory Type):**
```json
{
  "success": true,
  "message": "Leave type deleted successfully"
}
```
**Status Code:** 200 OK

**Response (Error - Mandatory Type):**
```json
{
  "error": "Cannot delete mandatory leave type. This type is required by Polish labor law.",
  "code": "MANDATORY_TYPE_DELETION_PREVENTED",
  "leaveType": {
    "id": "uuid",
    "name": "Urlop wypoczynkowy",
    "is_mandatory": true
  }
}
```
**Status Code:** 403 Forbidden

**Response (Error - Not Found):**
```json
{
  "error": "Leave type not found"
}
```
**Status Code:** 404 Not Found

**Response (Error - Unauthorized):**
```json
{
  "error": "Unauthorized. Admin access required."
}
```
**Status Code:** 401 Unauthorized

**Implementation Notes:**
- Check `is_mandatory` flag before attempting deletion
- Log deletion attempts of mandatory types for audit trail
- Return descriptive error with leave type details
- Database trigger provides additional safety layer

---

### PUT /api/leave-types/[id]

**Purpose:** Update a leave type (with restrictions for mandatory types)

**Method:** PUT

**Route:** `/app/api/leave-types/[id]/route.ts`

**Authentication:** Required (Admin only)

**Parameters:**
- `id` (path parameter): UUID of the leave type to update

**Request Body:**
```json
{
  "name": "Urlop wypoczynkowy",
  "days_per_year": 26,
  "color": "#3B82F6",
  "requires_approval": true,
  "requires_balance": true,
  "is_paid": true,
  "leave_category": "annual"
}
```

**Editable Fields for Mandatory Types:**
- `days_per_year` (workspace default)
- `color`
- `name` (with warning if changed)

**Protected Fields for Mandatory Types:**
- `is_mandatory` (cannot be changed)
- `leave_category` (cannot be changed)
- `requires_balance` (cannot be changed for structural integrity)
- `requires_approval` (should not be changed for compliance)

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Urlop wypoczynkowy",
    "days_per_year": 26,
    "color": "#3B82F6",
    "is_mandatory": true,
    "leave_category": "annual",
    "updated_at": "2025-10-23T10:30:00Z"
  }
}
```
**Status Code:** 200 OK

**Response (Error - Protected Field):**
```json
{
  "error": "Cannot modify protected field 'is_mandatory' for mandatory leave type",
  "code": "PROTECTED_FIELD_MODIFICATION",
  "protectedFields": ["is_mandatory", "leave_category", "requires_balance"]
}
```
**Status Code:** 400 Bad Request

**Response (Error - Validation):**
```json
{
  "error": "Validation failed",
  "details": {
    "days_per_year": "Must be between 0 and 365"
  }
}
```
**Status Code:** 400 Bad Request

---

### GET /api/leave-types

**Purpose:** Retrieve all leave types for the current organization

**Method:** GET

**Route:** `/app/api/leave-types/route.ts`

**Authentication:** Required

**Query Parameters:**
- `organization_id` (optional, inferred from user session)
- `include_mandatory_info` (boolean, default: true)

**Response (Success):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "name": "Urlop wypoczynkowy",
      "days_per_year": 20,
      "color": "#3B82F6",
      "is_mandatory": true,
      "leave_category": "annual",
      "requires_approval": true,
      "requires_balance": true,
      "is_paid": true,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-10-23T10:30:00Z"
    },
    {
      "id": "uuid-2",
      "name": "Urlop bezpłatny",
      "days_per_year": 0,
      "color": "#F59E0B",
      "is_mandatory": true,
      "leave_category": "unpaid",
      "requires_approval": true,
      "requires_balance": false,
      "is_paid": false,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```
**Status Code:** 200 OK

**Implementation Notes:**
- Return mandatory types first in the list for UI prominence
- Include `is_mandatory` flag in response for frontend filtering
- RLS policies ensure users only see their organization's types

---

### GET /api/leave-balances

**Purpose:** Retrieve leave balances with override information

**Method:** GET

**Route:** `/app/api/leave-balances/route.ts`

**Authentication:** Required

**Query Parameters:**
- `user_id` (optional, defaults to current user)
- `year` (optional, defaults to current year)
- `include_workspace_defaults` (boolean, default: true for admins)

**Response (Success - Admin View):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "user-uuid",
      "leave_type_id": "type-uuid",
      "year": 2025,
      "entitled_days": 26,
      "used_days": 5,
      "remaining_days": 21,
      "carry_over_days": 0,
      "is_override": true,
      "workspace_default": 20,
      "leave_type": {
        "id": "type-uuid",
        "name": "Urlop wypoczynkowy",
        "color": "#3B82F6",
        "is_mandatory": true,
        "leave_category": "annual"
      }
    }
  ]
}
```
**Status Code:** 200 OK

**Response (Success - Employee View):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "leave_type_id": "type-uuid",
      "year": 2025,
      "entitled_days": 26,
      "used_days": 5,
      "remaining_days": 21,
      "leave_type": {
        "name": "Urlop wypoczynkowy",
        "color": "#3B82F6",
        "leave_category": "annual"
      }
    }
  ]
}
```
**Status Code:** 200 OK

**Implementation Notes:**
- Admins see both override and workspace default for comparison
- Employees see only their effective entitled days
- `is_override` indicates if value differs from workspace default
- Query joins `leave_types` for context

---

### PUT /api/employees/[id]

**Purpose:** Update employee profile including leave balance overrides

**Method:** PUT

**Route:** `/app/api/employees/[id]/route.ts`

**Authentication:** Required (Admin or Manager)

**Parameters:**
- `id` (path parameter): UUID of the employee to update

**Request Body:**
```json
{
  "full_name": "Jan Kowalski",
  "email": "jan@example.com",
  "role": "employee",
  "employment_start_date": "2020-01-15",
  "leave_balance_overrides": [
    {
      "leave_type_id": "type-uuid",
      "year": 2025,
      "entitled_days": 26
    }
  ]
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": "employee-uuid",
    "full_name": "Jan Kowalski",
    "email": "jan@example.com",
    "role": "employee",
    "employment_start_date": "2020-01-15",
    "leave_balances_updated": [
      {
        "leave_type_id": "type-uuid",
        "year": 2025,
        "entitled_days": 26,
        "previous_days": 20
      }
    ]
  }
}
```
**Status Code:** 200 OK

**Response (Error - Validation):**
```json
{
  "error": "Validation failed",
  "details": {
    "leave_balance_overrides[0].entitled_days": "Must be between 0 and 50"
  }
}
```
**Status Code:** 400 Bad Request

**Implementation Notes:**
- Upsert leave_balances records for overrides
- Calculate `remaining_days` = `entitled_days` - `used_days`
- Validate entitled_days range (0-50 is reasonable for annual leave)
- Return both new and previous values for audit trail

---

### POST /api/leave-requests

**Purpose:** Create a new leave request with balance validation

**Method:** POST

**Route:** `/app/api/leave-requests/route.ts`

**Authentication:** Required

**Request Body:**
```json
{
  "leave_type_id": "type-uuid",
  "start_date": "2025-11-01",
  "end_date": "2025-11-05",
  "days_requested": 5,
  "reason": "Family vacation"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": "request-uuid",
    "user_id": "user-uuid",
    "leave_type_id": "type-uuid",
    "start_date": "2025-11-01",
    "end_date": "2025-11-05",
    "days_requested": 5,
    "status": "pending",
    "balance_info": {
      "entitled_days": 26,
      "used_days": 5,
      "remaining_days": 16,
      "after_request": 11
    }
  }
}
```
**Status Code:** 201 Created

**Response (Error - Insufficient Balance):**
```json
{
  "error": "Insufficient leave balance",
  "code": "INSUFFICIENT_BALANCE",
  "details": {
    "requested_days": 10,
    "remaining_days": 5,
    "leave_type": "Urlop wypoczynkowy"
  }
}
```
**Status Code:** 400 Bad Request

**Response (Success - Unlimited Leave Type):**
```json
{
  "success": true,
  "data": {
    "id": "request-uuid",
    "leave_type_id": "unpaid-type-uuid",
    "days_requested": 30,
    "status": "pending",
    "balance_info": {
      "is_unlimited": true,
      "requires_approval": true
    }
  }
}
```
**Status Code:** 201 Created

**Implementation Notes:**
- Skip balance validation for types where `requires_balance = false` (e.g., Urlop bezpłatny)
- Use override entitled_days if available, otherwise workspace default
- Return projected balance after request for user awareness
- For unlimited types, return `is_unlimited: true` instead of balance numbers

---

## Validation Rules

### Leave Type Deletion

```typescript
async function validateLeaveTypeDeletion(leaveTypeId: string): Promise<void> {
  const leaveType = await getLeaveTypeById(leaveTypeId)

  if (!leaveType) {
    throw new NotFoundError('Leave type not found')
  }

  if (leaveType.is_mandatory) {
    throw new ForbiddenError(
      'Cannot delete mandatory leave type. This type is required by Polish labor law.',
      { code: 'MANDATORY_TYPE_DELETION_PREVENTED', leaveType }
    )
  }
}
```

### Leave Type Editing

```typescript
const PROTECTED_FIELDS_FOR_MANDATORY = [
  'is_mandatory',
  'leave_category',
  'requires_balance'
]

async function validateLeaveTypeUpdate(
  leaveTypeId: string,
  updates: Partial<LeaveType>
): Promise<void> {
  const leaveType = await getLeaveTypeById(leaveTypeId)

  if (leaveType.is_mandatory) {
    const protectedFieldsInUpdate = Object.keys(updates).filter(field =>
      PROTECTED_FIELDS_FOR_MANDATORY.includes(field)
    )

    if (protectedFieldsInUpdate.length > 0) {
      throw new BadRequestError(
        `Cannot modify protected fields for mandatory leave type: ${protectedFieldsInUpdate.join(', ')}`,
        { code: 'PROTECTED_FIELD_MODIFICATION', protectedFields: protectedFieldsInUpdate }
      )
    }
  }
}
```

### Balance Override Validation

```typescript
function validateBalanceOverride(entitledDays: number): void {
  if (entitledDays < 0) {
    throw new BadRequestError('Entitled days cannot be negative')
  }

  if (entitledDays > 50) {
    throw new BadRequestError('Entitled days cannot exceed 50 (reasonable maximum for annual leave)')
  }
}
```

## Error Response Format

All API errors follow this consistent format:

```typescript
interface ApiError {
  error: string              // Human-readable error message
  code?: string             // Machine-readable error code
  details?: any             // Additional error context
  timestamp?: string        // ISO 8601 timestamp
  path?: string            // Request path that caused error
}
```

## Status Codes

- `200 OK` - Successful GET, PUT, DELETE
- `201 Created` - Successful POST
- `400 Bad Request` - Validation error or malformed request
- `401 Unauthorized` - Authentication required or failed
- `403 Forbidden` - User lacks permission (e.g., trying to delete mandatory type)
- `404 Not Found` - Resource doesn't exist
- `500 Internal Server Error` - Unexpected server error
