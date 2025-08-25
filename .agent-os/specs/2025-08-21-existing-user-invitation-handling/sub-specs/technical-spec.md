# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-21-existing-user-invitation-handling/spec.md

## Technical Requirements

### API Layer Changes

- **Enhanced Validation Response** - Modify `/api/employees/validate` to return `existing_user_different_org` status when user exists but not in current organization
- **Cross-Organization Invitation Logic** - Update `/api/employees` POST endpoint to handle existing users with `mode: 'cross_organization_invitation'`
- **Invitation Email Context** - Pass organization context to email templates to differentiate new user vs existing user invitations

### Frontend Enhancements

- **Validation Feedback UI** - Update `AddEmployeePage` component to display specific messaging for existing users with "Invite to Organization" option
- **Confirmation Dialog** - Add confirmation dialog when inviting existing users explaining they'll gain access to additional organization
- **Error State Improvements** - Replace generic error messages with actionable feedback for existing user scenarios

### Database Schema Updates

- **Invitation Type Field** - Add `invitation_type` enum field to invitations table ('new_user', 'cross_organization', 'internal_transfer')
- **Invitation Metadata** - Add `existing_user_id` field to link cross-organization invitations to existing user profiles

### Email Template Changes

- **Cross-Organization Email Template** - Create new email template specifically for existing users joining additional organizations
- **Template Selection Logic** - Update email sending logic to choose appropriate template based on invitation type
- **Organization Context** - Include both inviting organization and user's existing organizations in email context

### User Experience Flow

- **Organization Selection** - Allow existing users to choose organization context during login if member of multiple organizations
- **Invitation Acceptance** - Create organization-specific acceptance flow that links existing user profile to new organization
- **Onboarding Skip Logic** - Skip basic profile setup for existing users, focus on organization-specific settings

## Integration Points

- **Authentication System** - Integrate with existing auth flow to support multiple organization memberships
- **Email Service** - Extend current Resend integration with new template variables and logic
- **Database Policies** - Update RLS policies to support cross-organization invitation workflows
- **Frontend Components** - Enhance existing invitation and team management components