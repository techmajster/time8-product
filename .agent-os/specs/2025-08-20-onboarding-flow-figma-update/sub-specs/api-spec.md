# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-20-onboarding-flow-figma-update/spec.md

> Created: 2025-08-20
> Version: 1.0.0

## Endpoints

### GET /api/user/organization-status

**Purpose:** Returns comprehensive organization status for onboarding scenario determination
**Parameters:** None (uses session/authentication)
**Response:** Enhanced JSON structure for all 4 scenarios

```json
{
  "scenario": "welcome" | "choice" | "multi-option" | "invitation",
  "userWorkspaces": [
    {
      "id": "string",
      "name": "string", 
      "initials": "string",
      "memberCount": number,
      "role": "string"
    }
  ],
  "pendingInvitations": [
    {
      "id": "string",
      "organizationName": "string",
      "organizationInitials": "string", 
      "inviterName": "string",
      "inviterEmail": "string",
      "token": "string"
    }
  ],
  "canCreateWorkspace": boolean
}
```

**Errors:** 
- 401: Unauthorized
- 500: Internal server error

### POST /api/auth/signup-with-invitation

**Purpose:** Existing endpoint for invitation-based registration (no changes required)
**Parameters:** 
- token: invitation token
- userData: user registration data
**Response:** Authentication response with workspace access
**Note:** This endpoint already handles Scenario 4 perfectly and bypasses email verification

## Controllers

### OrganizationStatusController Enhancement

**Action:** Enhance existing GET logic
**Business Logic:**
- Determine scenario based on user's workspace memberships and pending invitations
- Return scenario = "welcome" when no workspaces and no invitations  
- Return scenario = "choice" when no workspaces and exactly 1 invitation
- Return scenario = "multi-option" when has workspaces or multiple invitations
- Calculate workspace initials from organization names
- Include member counts from user_organizations table
- Format invitation data with inviter details

**Error Handling:**
- Handle database connection issues gracefully
- Return appropriate error responses for authentication failures
- Log errors for debugging without exposing sensitive data

### Invitation Handling (Existing)

**Action:** No changes required to existing invitation signup controller
**Business Logic:** Maintains current logic for /api/auth/signup-with-invitation
**Integration:** Works seamlessly with enhanced organization status endpoint