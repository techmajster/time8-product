# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-13-auth-onboarding-revamp/spec.md

This specification covers all API endpoints required for the four onboarding scenarios with proper multi-organization database integration.

## Core Onboarding Endpoints

### GET /api/user/organization-status

**Purpose:** Get user's complete organization status for onboarding routing decisions
**Parameters:** None (uses authenticated user from JWT)
**Database Queries:**
- Query `user_organizations` table for user's current memberships
- Query `invitations` table for pending invitations by email
**Response Format:**
```json
{
  "scenario": "has_organizations" | "has_invitations" | "no_invitations",
  "hasOrganizations": boolean,
  "organizations": [
    {
      "organization_id": "uuid",
      "role": "admin" | "manager" | "employee",
      "is_default": boolean,
      "is_active": boolean,
      "joined_via": "created" | "invitation" | "google_domain" | "request",
      "organizations": {
        "name": "string",
        "slug": "string"
      }
    }
  ],
  "defaultOrganization": {
    "id": "uuid",
    "name": "string",
    "role": "string"
  } | null,
  "pendingInvitations": [
    {
      "id": "uuid",
      "organization_id": "uuid",
      "role": "admin" | "manager" | "employee",
      "team_id": "uuid | null",
      "expires_at": "timestamp",
      "organizations": { "name": "string" },
      "teams": { "name": "string" } | null
    }
  ]
}
```
**Error Responses:**
- 401: User not authenticated
- 500: Database query failed
**Business Logic:**
- Return `has_organizations` if user has entries in user_organizations table
- Return `has_invitations` if user has no organizations but has pending invitations
- Return `no_invitations` if user has neither organizations nor invitations

### POST /api/auth/signup-with-invitation

**Purpose:** Create user account from direct invitation link with token
**Parameters:**
```json
{
  "token": "string",
  "password": "string",
  "confirmPassword": "string"
}
```
**Database Operations:**
1. Validate invitation token and check expiration
2. Create Supabase auth user with email_confirmed_at set
3. Insert entry into user_organizations table
4. Update invitation status to 'accepted' with accepted_at timestamp
**Response Format:**
```json
{
  "success": true,
  "message": "Account created and invitation accepted",
  "organization": {
    "id": "uuid",
    "name": "string",
    "slug": "string"
  },
  "user": {
    "id": "uuid",
    "email": "string",
    "full_name": "string",
    "role": "admin" | "manager" | "employee",
    "team_name": "string | null"
  },
  "redirect_url": "/dashboard"
}
```
**Error Responses:**
- 400: Invalid or expired token, password validation failed
- 409: User already exists with this email
- 500: Database transaction failed
**Security:**
- Validate token signature and expiration server-side
- Use bcrypt for password hashing
- Create user with email already confirmed

### POST /api/organizations

**Purpose:** Create new organization and make user the admin owner
**Parameters:**
```json
{
  "name": "string (required, 2-100 chars)",
  "slug": "string (required, 3-50 chars, alphanumeric + hyphens)",
  "google_domain": "string | null (optional)",
  "require_google_domain": "boolean (default: false)",
  "country_code": "string (default: 'PL')"
}
```
**Database Operations:**
1. Validate slug uniqueness across organizations table
2. Create organization record
3. Create organization_settings record with defaults
4. Create user_organizations entry with role='admin', is_default=true, joined_via='created'
5. If google_domain provided, create organization_domains entry
**Response Format:**
```json
{
  "success": true,
  "organization": {
    "id": "uuid",
    "name": "string",
    "slug": "string",
    "google_domain": "string | null",
    "country_code": "string",
    "created_at": "timestamp"
  },
  "user_role": "admin",
  "redirect_url": "/dashboard"
}
```
**Validation Rules:**
- name: 2-100 characters, required
- slug: 3-50 characters, alphanumeric + hyphens, unique, required
- google_domain: valid domain format if provided
- country_code: valid ISO country code
**Error Responses:**
- 400: Validation failed, invalid parameters
- 409: Organization slug already exists
- 500: Database transaction failed
**Security:**
- User must be authenticated
- Slug uniqueness enforced at database level
- XSS protection for all string inputs

## Invitation Management Endpoints

### POST /api/invitations/accept

**Purpose:** Accept a pending invitation for authenticated users
**Parameters:**
```json
{
  "invitation_id": "uuid"
}
```
**Database Operations:**
1. Validate invitation exists and is pending
2. Verify invitation email matches authenticated user email
3. Create user_organizations entry with invitation role and team
4. Update invitation status to 'accepted'
5. Handle is_default logic (set to true if user's first organization)
**Response Format:**
```json
{
  "success": true,
  "message": "Invitation accepted successfully",
  "organization": {
    "id": "uuid",
    "name": "string"
  },
  "user_role": "admin" | "manager" | "employee",
  "team_name": "string | null",
  "is_default_org": boolean
}
```
**Error Responses:**
- 400: Invalid invitation ID
- 403: Invitation email doesn't match user email
- 404: Invitation not found or already processed
- 409: User already member of organization
- 500: Database transaction failed

### POST /api/invitations/decline

**Purpose:** Decline a pending invitation
**Parameters:**
```json
{
  "invitation_id": "uuid",
  "reason": "string (optional)"
}
```
**Database Operations:**
1. Update invitation status to 'declined'
2. Set declined_at timestamp
3. Optionally store decline reason
**Response Format:**
```json
{
  "success": true,
  "message": "Invitation declined"
}
```
**Error Responses:**
- 400: Invalid invitation ID
- 403: Not authorized to decline this invitation
- 404: Invitation not found
- 500: Database update failed

### GET /api/invitations/validate-token

**Purpose:** Validate invitation token without creating account (for direct invitation page)
**Parameters:** `?token=<invitation_token>`
**Response Format:**
```json
{
  "valid": true,
  "invitation": {
    "id": "uuid",
    "email": "string",
    "role": "admin" | "manager" | "employee",
    "expires_at": "timestamp",
    "organization": {
      "id": "uuid",
      "name": "string",
      "slug": "string"
    },
    "team": {
      "id": "uuid",
      "name": "string"
    } | null,
    "invited_by": {
      "full_name": "string",
      "email": "string"
    }
  }
}
```
**Error Responses:**
- 400: Invalid token format
- 404: Token not found or expired
- 410: Invitation already processed

## Authentication Integration Endpoints

### GET /api/auth/verify-email (Enhanced)

**Purpose:** Enhanced email verification with onboarding routing
**Parameters:** `?token=<verification_token>&redirect=<optional_redirect>`
**Enhanced Behavior:**
1. Verify email token with Supabase
2. Set email_confirmed_at timestamp
3. Instead of redirecting to dashboard, redirect to onboarding router
**Response:** HTTP 302 redirect to `/onboarding` or specified redirect
**Error Responses:**
- 400: Invalid verification token
- 410: Token expired

### POST /api/dashboard/pending-invitations

**Purpose:** Get pending invitations for users with existing organizations (Scenario 4)
**Authentication:** Required (authenticated user)
**Database Query:** Select from invitations table where email matches user and status='pending'
**Response Format:**
```json
{
  "pending_invitations": [
    {
      "id": "uuid",
      "organization_name": "string",
      "role": "string",
      "team_name": "string | null",
      "invited_by": "string",
      "expires_at": "timestamp"
    }
  ],
  "count": "number"
}
```
**Use Case:** Dashboard notification badge and invitation management interface
**Error Responses:**
- 401: User not authenticated
- 500: Database query failed

## Controller Implementation Requirements

### Authentication Controller Enhancements

**Modified Actions:**
- `verify-email`: Redirect to `/onboarding` instead of `/dashboard`
- `signup`: Remove invitation detection logic (handle post-verification)
- `signup-with-invitation`: Complete token-based account creation flow

**Business Logic:**
- Email verification triggers onboarding router instead of direct dashboard access
- Invitation token validation with secure signature checking
- Proper session creation with multi-organization context

**Error Handling:**
- Graceful handling of expired invitation tokens
- Clear error messages for invalid token signatures
- Fallback paths for network failures during account creation

### Organization Controller Enhancements

**Core Actions:**
- `create`: Enhanced to create organization + user_organizations entry + organization_settings
- `user-status`: Query user_organizations table for accurate scenario determination

**Business Logic:**
- Atomic organization creation with proper admin role assignment
- Default organization setting using database constraints
- Integration with existing organization_settings and organization_domains tables

**Database Transactions:**
- Ensure organization creation, settings, and user membership are created atomically
- Proper rollback on any step failure
- Handle unique constraint violations gracefully

**Error Handling:**
- Organization slug uniqueness validation
- User permission verification
- Proper transaction rollback on failures

### Invitation Controller Implementation

**Core Actions:**
- `accept`: Create user_organizations entry and update invitation status
- `decline`: Update invitation status with optional reason
- `validate-token`: Server-side token validation for direct invitation page
- `list-pending`: Get pending invitations for dashboard notifications

**Business Logic:**
- Multi-organization membership creation with proper role assignment
- Default organization logic (set is_default=true for user's first org)
- Invitation expiration checking and cleanup
- Email matching validation between invitation and authenticated user

**Database Operations:**
- Atomic invitation acceptance with user_organizations creation
- Proper handling of is_default constraint (only one per user)
- Update invitation timestamps (accepted_at, declined_at)

**Error Handling:**
- Duplicate membership prevention
- Expired invitation graceful handling
- Email mismatch validation
- Concurrent acceptance prevention

## Error Response Standards

### Standard Error Format
```json
{
  "error": "string (error type)",
  "message": "string (human readable)",
  "code": "string (error code for frontend)",
  "details": "object (additional context, optional)"
}
```

### Common Error Codes
- `VALIDATION_FAILED`: Input validation errors
- `INVITATION_EXPIRED`: Invitation token no longer valid
- `INVITATION_USED`: Invitation already processed
- `ORGANIZATION_EXISTS`: Slug conflict during organization creation
- `USER_EXISTS`: Attempt to create duplicate user
- `NOT_AUTHORIZED`: Insufficient permissions
- `MEMBERSHIP_EXISTS`: User already member of organization
- `DEFAULT_ORG_CONFLICT`: Issues with default organization setting

### HTTP Status Code Guidelines
- 200: Successful operation
- 201: Resource created successfully
- 400: Bad request (validation errors, malformed data)
- 401: Authentication required
- 403: Forbidden (insufficient permissions)
- 404: Resource not found
- 409: Conflict (duplicate resource, business rule violation)
- 410: Gone (expired resource)
- 429: Too many requests (rate limiting)
- 500: Internal server error

## Rate Limiting Requirements

### Endpoint Rate Limits
- Organization creation: 5 per hour per user
- Invitation acceptance: 10 per hour per user
- User organization status checks: 100 per hour per user
- Token validation: 20 per hour per IP

### Implementation
- Use Redis for rate limiting state
- Return appropriate 429 responses with retry-after headers
- Different limits for authenticated vs anonymous users

## Business Rules and Data Consistency

### Multi-Organization Rules
- Users can belong to multiple organizations simultaneously
- Each user must have exactly one default organization (enforced by database constraint)
- User's first organization (created or joined) becomes default automatically
- Organizations must have unique slugs across the entire system

### Invitation Processing Rules
- Invitations expire after configured time period (check invitations table)
- Accepted invitations create corresponding user_organizations entry
- Direct invitation signup bypasses email verification requirement
- Users can have pending invitations while being members of other organizations

### Role Assignment Rules
- Organization creators automatically become admins
- Invitation acceptance respects the role specified in the invitation
- Role changes after joining require separate organization management flows
- Team assignment is optional and can be specified in invitations

### Data Consistency Requirements
- user_organizations entries must reference valid users and organizations
- is_default flag must be unique per user (database constraint enforced)
- Invitation acceptance must be atomic (either fully succeeds or fully fails)
- Organization creation must include settings and admin user assignment

### Security and Access Control
- Leverage existing RLS policies on user_organizations and invitations tables
- Validate user permissions before organization operations
- Ensure invitation email matches authenticated user email
- Protect against concurrent invitation acceptance attempts

## Integration Points

### Database Integration
- **user_organizations table**: Core multi-organization relationship management
- **invitations table**: Invitation tracking and status management
- **organization_settings table**: Per-organization configuration
- **organization_domains table**: Domain-based features (future enhancement)
- **Supabase auth.users**: Email verification and authentication state

### Existing API Integration
- Leverage existing organization creation patterns from `/api/organizations`
- Integrate with current invitation system in `/api/invitations` routes
- Maintain compatibility with current user profile and role management
- Use existing email notification infrastructure

### Frontend State Management
- Update onboarding router to handle four distinct scenarios
- Enhance existing onboarding pages with Figma design implementations
- Integrate with existing authentication state management
- Maintain i18n support for multi-language onboarding flows

### Security Integration
- Utilize existing RLS policies on multi-organization tables
- Maintain current CSRF protection patterns
- Integrate with existing rate limiting infrastructure
- Use current JWT token validation patterns for authentication

## Testing Requirements

### Unit Testing
- Individual endpoint testing with mocked database responses
- Validation logic testing for all input parameters
- Error handling testing for each failure scenario
- Token generation and validation testing

### Integration Testing
- End-to-end onboarding flow testing for all four scenarios
- Database transaction testing (creation, rollback, consistency)
- Multi-user invitation acceptance testing
- Concurrent operation testing (race conditions)

### API Testing
- Response format validation against specifications
- Error response consistency testing
- Rate limiting behavior verification
- Authentication and authorization testing

### Database Testing
- user_organizations constraint testing (is_default uniqueness)
- Foreign key relationship integrity
- RLS policy effectiveness testing
- Data cleanup and cascade deletion testing