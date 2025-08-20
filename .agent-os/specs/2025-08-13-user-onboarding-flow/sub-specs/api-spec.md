# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-13-user-onboarding-flow/spec.md

## Endpoints

### POST /api/organizations/create

**Purpose:** Creates a new organization and assigns the authenticated user as admin
**Method:** POST
**Path:** `/api/organizations/create`
**Authentication:** Required (Supabase JWT)

**Request Body:**
```typescript
{
  name: string;           // Organization name (required, 2-100 chars)
  description?: string;   // Organization description (optional, max 500 chars)
  timezone?: string;      // Organization timezone (optional, defaults to user's timezone)
}
```

**Validation Rules:**
- `name`: Required, 2-100 characters, trimmed
- `description`: Optional, max 500 characters, trimmed
- `timezone`: Optional, valid IANA timezone identifier

**Response Success (201):**
```typescript
{
  success: true;
  data: {
    organization: {
      id: string;
      name: string;
      description: string | null;
      timezone: string;
      created_at: string;
    };
    membership: {
      role: 'admin';
      is_default: true;
      joined_via: 'created';
    };
  };
}
```

**Response Errors:**
- **400 Bad Request:** Invalid input data or validation errors
- **401 Unauthorized:** User not authenticated
- **409 Conflict:** User already has an active organization or name already taken
- **500 Internal Server Error:** Database or server error

**Business Logic:**
1. Validate user is authenticated
2. Check user doesn't already have an organization (prevent multiple for onboarding)
3. Validate and sanitize input data
4. Create organization record in `organizations` table
5. Create user-organization relationship in `user_organizations` table with:
   - role: 'admin'
   - is_default: true
   - joined_via: 'created'
   - is_active: true
6. Create default organization settings
7. Return complete organization and membership data

**Database Operations:**
- Insert into `organizations` table
- Insert into `user_organizations` table
- Insert into `organization_settings` table (with defaults)
- All operations in a transaction for data consistency

### GET /api/user/organization-status

**Purpose:** Check if user has any organization memberships (for routing decisions)
**Method:** GET
**Path:** `/api/user/organization-status`
**Authentication:** Required (Supabase JWT)

**Response Success (200):**
```typescript
{
  success: true;
  data: {
    has_organization: boolean;
    organizations_count: number;
    default_organization?: {
      id: string;
      name: string;
      role: string;
    };
  };
}
```

**Response Errors:**
- **401 Unauthorized:** User not authenticated
- **500 Internal Server Error:** Database error

**Business Logic:**
1. Query user's active organization memberships
2. Return organization status for routing logic
3. Used by middleware to determine if user needs onboarding