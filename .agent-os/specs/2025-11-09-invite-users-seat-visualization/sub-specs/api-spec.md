# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-11-09-invite-users-seat-visualization/spec.md

## Endpoints

### GET /api/organizations/[organizationId]/seat-info

**Purpose:** Retrieve comprehensive seat usage information for an organization

**Authentication:** Required (JWT)

**Authorization:** User must be a member of the organization (any role)

**Parameters:**
- `organizationId` (path, required): UUID of the organization

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalSeats": 10,
    "paidSeats": 7,
    "freeSeats": 3,
    "activeMembers": 8,
    "pendingInvitations": 1,
    "pendingRemovals": 2,
    "availableSeats": 1,
    "utilizationPercentage": 90,
    "canAddMore": true,
    "renewalDate": "2025-12-05T00:00:00Z",
    "usersMarkedForRemoval": [
      {
        "email": "john@example.com",
        "effectiveDate": "2025-12-05T00:00:00Z"
      },
      {
        "email": "jane@example.com",
        "effectiveDate": "2025-12-05T00:00:00Z"
      }
    ],
    "subscription": {
      "status": "active",
      "currentSeats": 7,
      "pendingSeats": 5,
      "renewsAt": "2025-12-05T00:00:00Z"
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User not member of organization
- `404 Not Found`: Organization not found
- `500 Internal Server Error`: Database or server error

**Implementation Notes:**
- Use `getSeatUsage()` from `lib/seat-management.ts`
- Use `calculateComprehensiveSeatInfo()` from `lib/billing/seat-calculation.ts`
- Count pending invitations from invitations table
- Include billing override information if applicable
- Cache response for 60 seconds using React Query

---

### POST /api/organizations/[organizationId]/invitations

**Purpose:** Send bulk invitations to new users and validate seat availability

**Authentication:** Required (JWT)

**Authorization:** User must be admin of the organization

**Parameters:**
- `organizationId` (path, required): UUID of the organization

**Request Body:**
```json
{
  "invitations": [
    {
      "email": "newuser@example.com",
      "role": "employee",
      "team_id": "uuid-of-team",
      "personal_message": "Welcome to our team!"
    },
    {
      "email": "manager@example.com",
      "role": "manager",
      "team_id": null,
      "personal_message": null
    }
  ]
}
```

**Validation Rules:**
- Maximum 50 invitations per request
- Each email must be valid format
- Each email must be unique within the request
- Each email must not already exist in organization
- Role must be one of: 'admin', 'manager', 'employee'
- team_id must be valid UUID or null
- Total invitations must not exceed available seats

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "invited": 2,
    "failed": 0,
    "results": [
      {
        "email": "newuser@example.com",
        "success": true,
        "invitationId": "uuid-of-invitation"
      },
      {
        "email": "manager@example.com",
        "success": true,
        "invitationId": "uuid-of-invitation"
      }
    ],
    "updatedSeatInfo": {
      "totalSeats": 10,
      "activeMembers": 8,
      "pendingInvitations": 3,
      "availableSeats": -1
    }
  }
}
```

**Response (400 Bad Request - Seat Limit Exceeded):**
```json
{
  "success": false,
  "error": "SEAT_LIMIT_EXCEEDED",
  "message": "You need 2 additional seats to invite these users.",
  "data": {
    "requiredSeats": 12,
    "currentSeats": 10,
    "additionalSeatsNeeded": 2,
    "upgradeUrl": "https://checkout.lemonsqueezy.com/..."
  }
}
```

**Response (400 Bad Request - Duplicate Emails):**
```json
{
  "success": false,
  "error": "DUPLICATE_EMAILS",
  "message": "Some users are already members of this organization.",
  "data": {
    "duplicates": ["existing@example.com"]
  }
}
```

**Error Responses:**
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User not admin of organization
- `400 Bad Request`: Validation errors (seat limit, duplicates, invalid format)
- `500 Internal Server Error`: Failed to send invitations

**Implementation Notes:**
- Validate seat availability using `validateEmployeeInvitation()`
- Use atomic transaction for invitation creation
- Send emails via existing Resend integration
- Create invitation records in database with 7-day expiration
- Return partial success if some invitations fail
- Log all invitation attempts for audit trail

---

### DELETE /api/invitations/[invitationId]

**Purpose:** Cancel a pending invitation and free up the seat

**Authentication:** Required (JWT)

**Authorization:** User must be admin of the invitation's organization

**Parameters:**
- `invitationId` (path, required): UUID of the invitation

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "invitationId": "uuid-of-invitation",
    "email": "cancelled@example.com",
    "updatedSeatInfo": {
      "totalSeats": 10,
      "activeMembers": 8,
      "pendingInvitations": 0,
      "availableSeats": 2
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User not admin of organization
- `404 Not Found`: Invitation not found or already accepted
- `500 Internal Server Error`: Failed to cancel invitation

**Implementation Notes:**
- Soft-delete invitation by updating status to 'cancelled'
- Verify invitation is still pending (not accepted/expired)
- Return updated seat info after cancellation
- Log cancellation action for audit trail

---

### GET /api/organizations/[organizationId]/pending-invitations

**Purpose:** Retrieve all pending invitations for an organization

**Authentication:** Required (JWT)

**Authorization:** User must be admin of the organization

**Parameters:**
- `organizationId` (path, required): UUID of the organization
- `page` (query, optional): Page number for pagination (default: 1)
- `limit` (query, optional): Results per page (default: 20, max: 100)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "invitations": [
      {
        "id": "uuid-of-invitation",
        "email": "pending@example.com",
        "role": "employee",
        "team_id": "uuid-of-team",
        "team_name": "Engineering",
        "created_at": "2025-11-09T10:00:00Z",
        "expires_at": "2025-11-16T10:00:00Z",
        "status": "pending"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 20,
      "pages": 1
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User not admin of organization
- `404 Not Found`: Organization not found
- `500 Internal Server Error`: Database error

**Implementation Notes:**
- Only return invitations with status 'pending'
- Include team name via join if team_id is not null
- Order by created_at DESC (newest first)
- Support pagination for large organizations
- Exclude expired invitations from results

---

### POST /api/billing/create-checkout-session

**Purpose:** Create a LemonSqueezy checkout session for seat upgrade

**Authentication:** Required (JWT)

**Authorization:** User must be admin of the organization

**Request Body:**
```json
{
  "organization_id": "uuid-of-organization",
  "required_seats": 15,
  "metadata": {
    "reason": "invitation_upgrade",
    "pending_invitations": ["user1@example.com", "user2@example.com"]
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.lemonsqueezy.com/...",
    "sessionId": "uuid-of-session",
    "variantId": "uuid-of-variant",
    "requiredSeats": 15,
    "pricePerSeat": 10.00,
    "totalPrice": 150.00,
    "currency": "USD"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User not admin of organization
- `400 Bad Request`: Invalid seat quantity or no variant available
- `500 Internal Server Error`: LemonSqueezy API error

**Implementation Notes:**
- Find appropriate LemonSqueezy variant for required seats
- Include organization_id and metadata in checkout session
- Set custom return URL with success/cancel paths
- Store session details for webhook reconciliation
- Handle case where no variant matches required seats

---

## Webhook Handlers

### POST /api/webhooks/lemonsqueezy

**Purpose:** Handle LemonSqueezy webhook events for subscription updates

**Authentication:** LemonSqueezy webhook signature verification

**Event Types:**
- `subscription_created`
- `subscription_updated`
- `subscription_payment_success`

**Implementation Notes:**
- Verify webhook signature using LemonSqueezy secret
- Extract organization_id from metadata
- Update subscriptions table with new current_seats
- If metadata includes pending_invitations, trigger invitation sending
- Return 200 OK to acknowledge receipt
- Queue retry for failed webhook processing

**Security:**
- Validate webhook signature on every request
- Use idempotency key to prevent duplicate processing
- Log all webhook events for debugging
- Rate limit webhook endpoint

---

## Rate Limiting

All API endpoints are protected with rate limiting:

- **GET endpoints:** 100 requests per minute per user
- **POST /invitations:** 10 requests per minute per user
- **DELETE /invitations:** 20 requests per minute per user
- **POST /create-checkout-session:** 5 requests per minute per user

Rate limits are enforced using middleware with Redis-backed counters.

## Error Response Format

All error responses follow this standard format:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "data": {
    "additional": "context-specific error details"
  }
}
```

## Common Error Codes

- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User lacks required permissions
- `NOT_FOUND`: Resource not found
- `SEAT_LIMIT_EXCEEDED`: Invitation would exceed seat limit
- `DUPLICATE_EMAILS`: Users already exist in organization
- `INVALID_INPUT`: Request validation failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server or database error
