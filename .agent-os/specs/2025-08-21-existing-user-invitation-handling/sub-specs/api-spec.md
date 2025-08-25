# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-21-existing-user-invitation-handling/spec.md

## Endpoints

### POST /api/employees/validate

**Purpose:** Enhanced validation that provides detailed feedback for existing users
**Current State:** Returns basic validation blocking existing users
**Enhancement:** Return specific status for cross-organization invitation opportunities

**Enhanced Response Format:**
```json
{
  "email": "user@example.com",
  "organizationId": "org-123",
  "organizationName": "Acme Corp",
  "checks": {
    "emailFormat": true,
    "domainValidation": { "passed": true, "required": false, "message": "" },
    "existingUser": { 
      "exists": true, 
      "in_current_org": false,
      "user_id": "user-456",
      "message": "User exists in different organization" 
    },
    "existingInvitation": { "exists": false, "message": "" }
  },
  "canInvite": true,
  "invitation_type": "cross_organization",
  "blockers": []
}
```

**New Fields:**
- `invitation_type`: Indicates type of invitation needed
- `existingUser.in_current_org`: Distinguishes between same-org and cross-org users
- `existingUser.user_id`: Reference to existing user profile

### POST /api/employees

**Purpose:** Enhanced employee invitation handling with cross-organization support
**Current State:** Blocks existing users from different organizations
**Enhancement:** Support cross-organization invitations with proper linking

**Enhanced Request Body:**
```json
{
  "employees": [{
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "employee",
    "team_id": "team-123",
    "send_invitation": true,
    "personal_message": "Welcome to our team!"
  }],
  "mode": "cross_organization_invitation"
}
```

**Enhanced Response:**
```json
{
  "success": true,
  "results": [{
    "email": "user@example.com",
    "status": "cross_org_invited",
    "invitation_type": "cross_organization",
    "existing_user_linked": true,
    "invitation_sent": true
  }],
  "errors": [],
  "summary": {
    "total": 1,
    "successful": 1,
    "failed": 0,
    "cross_organization_invites": 1
  }
}
```

### POST /api/invitations/accept-cross-organization

**Purpose:** New endpoint for existing users to accept cross-organization invitations
**Authentication:** Requires valid user session
**Functionality:** Links existing user profile to new organization

**Request Body:**
```json
{
  "invitation_token": "abc123token",
  "organization_id": "org-123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully joined organization",
  "organization": {
    "id": "org-123",
    "name": "Acme Corp"
  },
  "redirect_url": "/dashboard?org=org-123"
}
```

**Errors:**
- `400`: Invalid or expired invitation token
- `409`: User already member of organization
- `401`: User not authenticated

## Controller Updates

### EmployeesController Enhancements

**Cross-Organization Validation:**
- Detect existing users from different organizations
- Set appropriate invitation type in database
- Link invitation to existing user profile via `existing_user_id`

**Email Logic Updates:**
- Choose email template based on invitation type
- Pass organization context for existing user emails
- Include organization switching instructions

### New InvitationAcceptanceController

**Responsibilities:**
- Validate cross-organization invitation tokens
- Create user_organizations relationship
- Handle role assignment in new organization
- Manage organization context switching

**Security Considerations:**
- Verify invitation hasn't expired
- Confirm user identity matches invitation
- Prevent duplicate organization memberships
- Audit cross-organization access grants