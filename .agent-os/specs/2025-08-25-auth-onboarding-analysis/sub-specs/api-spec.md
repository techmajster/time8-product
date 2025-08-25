# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-25-auth-onboarding-analysis/spec.md

## Endpoints to Analyze

### Authentication Endpoints

#### POST /api/auth/signup-with-invitation
**Purpose:** Handle user registration with invitation token
**Parameters:** 
- invitation_token: string (required)
- user_data: object with name, email, password
**Response:** Success/error status with user and organization data
**Errors:** Invalid token, expired invitation, duplicate user

#### GET /api/auth/callback
**Purpose:** Handle OAuth callback and session establishment
**Parameters:** OAuth provider data via query params
**Response:** Redirect to appropriate onboarding step
**Errors:** OAuth failure, invalid state parameter

### User Management Endpoints

#### GET /api/user/current-organization
**Purpose:** Retrieve user's current organization context
**Parameters:** None (uses session)
**Response:** Organization data and user role
**Errors:** Unauthorized, no organization found

#### POST /api/user/organization-status
**Purpose:** Update or check user's organization status
**Parameters:** organization_id (optional)
**Response:** User status and available organizations
**Errors:** Unauthorized, invalid organization access

### Organization Management Endpoints

#### POST /api/organizations
**Purpose:** Create new organization during onboarding
**Parameters:** organization_name, description, settings
**Response:** Created organization data with user as admin
**Errors:** Duplicate name, validation errors

#### GET /api/organizations
**Purpose:** Retrieve user's accessible organizations
**Parameters:** None (uses session)
**Response:** Array of organization data with user roles
**Errors:** Unauthorized

### Invitation System Endpoints

#### GET /api/invitations/lookup
**Purpose:** Validate and retrieve invitation details
**Parameters:** token (query parameter)
**Response:** Invitation data including organization info
**Errors:** Invalid token, expired invitation

#### POST /api/invitations/accept
**Purpose:** Accept invitation and join organization
**Parameters:** token, user_data
**Response:** Success status with organization membership
**Errors:** Invalid token, user already member

#### POST /api/invitations (implied from admin functionality)
**Purpose:** Create new invitation (admin only)
**Parameters:** email, role, organization_id
**Response:** Created invitation with token
**Errors:** Unauthorized, invalid role, duplicate invitation

### Employee Management Endpoints

#### GET /api/employees
**Purpose:** Retrieve organization employees (admin/manager only)
**Parameters:** organization_id (from session context)
**Response:** Array of employee data with roles
**Errors:** Unauthorized, insufficient permissions

#### POST /api/employees/validate
**Purpose:** Validate employee data during onboarding
**Parameters:** employee_data object
**Response:** Validation results
**Errors:** Validation failures

### Workspace Management Endpoints

#### POST /api/workspace (implied from onboarding flow)
**Purpose:** Initialize workspace during onboarding
**Parameters:** workspace_settings, initial_data
**Response:** Workspace creation status
**Errors:** Setup failures, permission issues

## Analysis Requirements

For each endpoint, the analysis should verify:
- Proper authentication and authorization handling
- RLS policy enforcement
- Input validation and sanitization
- Error response consistency and helpful messaging
- Response time and performance characteristics
- Data isolation between organizations
- Proper HTTP status codes usage
- Request/response logging and monitoring capabilities