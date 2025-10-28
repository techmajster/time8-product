# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-10-28-in-app-notifications/spec.md

## Overview

Create RESTful API endpoints for managing user notifications, including fetching notifications with pagination, marking individual notifications as read, and marking all notifications as read for a user.

## Endpoints

### GET /api/notifications

Fetch notifications for the authenticated user within their active organization.

**Authentication:** Required (Supabase Auth)

**Query Parameters:**
- `limit` (optional): Number of notifications to return (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `unread_only` (optional): Boolean, if true only return unread notifications (default: false)

**Success Response (200 OK):**
```typescript
{
  notifications: Array<{
    id: string
    type: 'leave_request_approved' | 'leave_request_rejected' | 'leave_request_pending'
    title: string
    message: string
    metadata: {
      leave_type?: string
      start_date?: string
      end_date?: string
      days_requested?: number
      employee_name?: string
      employee_id?: string
      status?: string
    }
    is_read: boolean
    read_at: string | null
    related_leave_request_id: string | null
    created_at: string
  }>
  unread_count: number
  total_count: number
  has_more: boolean
}
```

**Error Responses:**
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User not authorized (no active organization membership)
- `500 Internal Server Error`: Database or server error

**Implementation Notes:**
- Use `createClient()` from Supabase (RLS policies will enforce user access)
- Query notifications ordered by `created_at DESC` (newest first)
- Include separate count query for `unread_count`
- Calculate `has_more` based on total count and pagination

**Example Request:**
```bash
GET /api/notifications?limit=20&offset=0&unread_only=false
```

**Example Response:**
```json
{
  "notifications": [
    {
      "id": "a1b2c3d4-...",
      "type": "leave_request_approved",
      "title": "Urlop zaakceptowany",
      "message": "Twój wniosek urlopowy (Urlop wypoczynkowy) od 15.11.2025 do 20.11.2025 został zaakceptowany.",
      "metadata": {
        "leave_type": "Urlop wypoczynkowy",
        "start_date": "2025-11-15",
        "end_date": "2025-11-20",
        "days_requested": 4,
        "status": "approved"
      },
      "is_read": false,
      "read_at": null,
      "related_leave_request_id": "leave-req-uuid",
      "created_at": "2025-10-28T10:30:00Z"
    }
  ],
  "unread_count": 8,
  "total_count": 25,
  "has_more": true
}
```

---

### PATCH /api/notifications/[id]

Mark a specific notification as read for the authenticated user.

**Authentication:** Required (Supabase Auth)

**URL Parameters:**
- `id`: Notification UUID

**Request Body:**
```typescript
{
  is_read: boolean  // Typically true
}
```

**Success Response (200 OK):**
```typescript
{
  success: true
  notification: {
    id: string
    is_read: boolean
    read_at: string | null
    updated_at: string
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid notification ID or missing is_read field
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: Notification doesn't belong to user
- `404 Not Found`: Notification not found
- `500 Internal Server Error`: Database or server error

**Implementation Notes:**
- Use `createClient()` from Supabase (RLS policies will enforce ownership)
- When setting `is_read = true`, also set `read_at = now()`
- When setting `is_read = false`, set `read_at = null`
- Update `updated_at` timestamp

**Example Request:**
```bash
PATCH /api/notifications/a1b2c3d4-...
Content-Type: application/json

{
  "is_read": true
}
```

**Example Response:**
```json
{
  "success": true,
  "notification": {
    "id": "a1b2c3d4-...",
    "is_read": true,
    "read_at": "2025-10-28T11:00:00Z",
    "updated_at": "2025-10-28T11:00:00Z"
  }
}
```

---

### POST /api/notifications/mark-all-read

Mark all notifications as read for the authenticated user within their active organization.

**Authentication:** Required (Supabase Auth)

**Request Body:** None

**Success Response (200 OK):**
```typescript
{
  success: true
  updated_count: number
}
```

**Error Responses:**
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User not authorized
- `500 Internal Server Error`: Database or server error

**Implementation Notes:**
- Use `createClient()` from Supabase
- Update all unread notifications for current user in active organization
- Set `is_read = true` and `read_at = now()`
- Return count of updated notifications

**Example Request:**
```bash
POST /api/notifications/mark-all-read
```

**Example Response:**
```json
{
  "success": true,
  "updated_count": 8
}
```

---

## Authentication Flow

All endpoints follow this authentication pattern:

```typescript
import { createClient } from '@/lib/supabase/server'
import { authenticateAndGetProfile } from '@/lib/auth-utils'

export async function GET(request: Request) {
  // Authenticate user
  const authResult = await authenticateAndGetProfile()

  if (!authResult.success || !authResult.user || !authResult.profile) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { user, profile } = authResult
  const organizationId = profile.organization_id

  // Create Supabase client (RLS enforced)
  const supabase = await createClient()

  // Query notifications - RLS ensures user can only see their own
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  // ... rest of endpoint logic
}
```

## TypeScript Types

Create `/types/notification.ts`:

```typescript
export type NotificationType =
  | 'leave_request_approved'
  | 'leave_request_rejected'
  | 'leave_request_pending'

export interface NotificationMetadata {
  leave_type?: string
  start_date?: string
  end_date?: string
  days_requested?: number
  employee_name?: string
  employee_id?: string
  status?: string
}

export interface Notification {
  id: string
  user_id: string
  organization_id: string
  type: NotificationType
  title: string
  message: string | null
  metadata: NotificationMetadata
  is_read: boolean
  read_at: string | null
  related_leave_request_id: string | null
  created_at: string
  updated_at: string
}

export interface NotificationsResponse {
  notifications: Notification[]
  unread_count: number
  total_count: number
  has_more: boolean
}

export interface MarkReadResponse {
  success: boolean
  notification: {
    id: string
    is_read: boolean
    read_at: string | null
    updated_at: string
  }
}

export interface MarkAllReadResponse {
  success: boolean
  updated_count: number
}
```

## Error Handling

All endpoints follow consistent error response format:

```typescript
{
  error: string           // Human-readable error message
  code?: string          // Optional error code for client handling
  details?: any          // Optional additional error details
}
```

### Common Error Codes:
- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User lacks permission
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request parameters
- `DATABASE_ERROR`: Database operation failed
- `INTERNAL_ERROR`: Unexpected server error

## Rate Limiting

**Current Implementation:** None

**Future Consideration:** Implement rate limiting to prevent abuse:
- GET /api/notifications: 100 requests per minute per user
- PATCH /api/notifications/[id]: 200 requests per minute per user
- POST /api/notifications/mark-all-read: 20 requests per minute per user

## Caching Strategy

**Current Implementation:** None (always fetch fresh data)

**Future Consideration:**
- Cache unread count on client side with 30-second TTL
- Use Supabase Realtime subscriptions for instant updates
- Implement optimistic UI updates (mark as read immediately, sync in background)

## Testing Considerations

### Unit Tests
- Test authentication failure scenarios
- Test RLS policy enforcement
- Test pagination logic
- Test unread count calculation
- Test mark as read functionality

### Integration Tests
- Test full user flow: create leave request → notification generated → fetch → mark as read
- Test multi-user scenario: manager approves request → employee receives notification
- Test multi-tenant isolation: users only see notifications from their organization

## File Locations

```
app/
└── api/
    └── notifications/
        ├── route.ts                    # GET /api/notifications
        ├── [id]/
        │   └── route.ts                # PATCH /api/notifications/[id]
        └── mark-all-read/
            └── route.ts                # POST /api/notifications/mark-all-read

types/
└── notification.ts                     # TypeScript type definitions
```

## Security Considerations

1. **Authentication**: All endpoints require valid Supabase session
2. **Authorization**: RLS policies ensure users only access their own notifications
3. **Multi-tenant Isolation**: Organization ID validation prevents cross-tenant data access
4. **Input Validation**: Validate all query parameters and request body fields
5. **SQL Injection**: Using Supabase client (parameterized queries) prevents SQL injection
6. **No Direct Deletion**: Users cannot delete notifications (no DELETE endpoint)
