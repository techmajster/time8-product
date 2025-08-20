# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-13-auth-onboarding-revamp/spec.md

This specification covers the implementation requirements for the four onboarding scenarios using the multi-organization database structure.

## Technical Requirements

### Multi-Organization Database Integration

- **User Organization Relationships**: Properly create and manage entries in `user_organizations` table with correct `role`, `is_default`, `is_active`, and `joined_via` values
- **Invitation Processing**: Update invitation status in `invitations` table and create corresponding `user_organizations` entries
- **Default Organization Management**: Ensure only one organization per user has `is_default=true` using existing database constraint
- **Organization Settings**: Leverage `organization_settings` table for onboarding behavior configuration

### Authentication Flow Modifications

- **Email Verification Router**: Update `/api/auth/verify-email` to redirect to onboarding router instead of directly to dashboard
- **Organization Status API**: Enhance `/api/user/organization-status` to properly query `user_organizations` table and return accurate scenario
- **Invitation Token Handling**: Secure token validation and automatic account creation for direct invitation links
- **Mixed Status Detection**: Identify users with both organization memberships and pending invitations for appropriate routing

### Page Modifications

- **Onboarding Router Enhancement**: Modify `/app/onboarding/page.tsx` to use `/api/user/organization-status` for scenario-based routing
- **Welcome Screen Update**: Enhance `/app/onboarding/welcome/page.tsx` to match Figma design 24697-216103 for first-time users
- **Workspace Creation Flow**: Update `/app/onboarding/create-workspace/page.tsx` to implement Figma design 24689-24777 with organization creation
- **Invitation Choice Interface**: Enhance `/app/onboarding/choose/page.tsx` to match Figma design 24689-24716 with multiple invitation handling
- **Direct Invitation Signup**: Modify `/app/onboarding/join/page.tsx` to implement Figma design 24697-216007 for token-based account creation
- **Dashboard Integration**: Update dashboard to show notification badges for users with mixed status (existing orgs + pending invitations)

### API Endpoint Changes

- **User Organization Status**: Enhance `/api/user/organization-status` to query `user_organizations` table and return accurate scenario data
- **Invitation Signup**: Modify `/api/auth/signup-with-invitation` to create auth user, user_organizations entry, and mark invitation as accepted
- **Organization Creation**: Update `/api/organizations` to create organization and corresponding `user_organizations` entry with admin role
- **Invitation Management**: Create endpoints for accepting/declining invitations with proper database updates
- **Mixed Status Handling**: Add endpoint for dashboard to check pending invitations for existing users

### Database Considerations

- **User Organizations Table**: Properly populate `user_id`, `organization_id`, `role`, `team_id`, `is_active`, `is_default`, `joined_via`, and `employment_type` fields
- **Invitation Processing**: Update `invitations.status` to 'accepted' and set `accepted_at` timestamp when processing invitations
- **Default Organization Logic**: Leverage existing unique constraint on `is_default=true` per user to prevent conflicts
- **Organization Settings**: Use `organization_settings` table for configuring auto-join and domain-based discovery
- **Email Verification**: Continue using Supabase auth `email_confirmed_at` for verification state tracking
- **Invitation Expiration**: Respect existing invitation expiration logic and handle expired tokens gracefully

### Middleware Updates

- **Onboarding Route Protection**: Allow authenticated users to access onboarding pages based on organization status
- **Token-based Access**: Ensure invitation token URLs bypass standard authentication for direct signup flow
- **Multi-Organization Context**: Update middleware to handle users with multiple organization memberships
- **Default Organization Setting**: Ensure middleware correctly identifies user's default organization for dashboard access

### Error Handling & Edge Cases

- **Expired Invitations**: Handle expired invitation tokens with fallback to regular signup flow
- **Duplicate Memberships**: Prevent duplicate entries in `user_organizations` table for same user-org combination
- **Orphaned Users**: Handle authenticated users without organization memberships gracefully
- **Default Organization Conflicts**: Handle edge cases where user loses default organization
- **Invitation Race Conditions**: Handle concurrent invitation acceptance attempts safely
- **Organization Creation Failures**: Provide rollback mechanisms for failed organization setups
- **Network Resilience**: Implement proper error boundaries and retry logic for API calls

### Security Considerations

- **Database RLS Policies**: Leverage existing Row Level Security policies for user_organizations and invitations tables
- **Invitation Token Security**: Validate invitation tokens server-side with proper expiration and signature checks
- **Role Assignment Validation**: Ensure proper role validation when creating user_organizations entries
- **Organization Access Control**: Validate user permissions for organization creation and invitation acceptance
- **CSRF Protection**: Maintain CSRF protection throughout multi-step onboarding flows
- **Rate Limiting**: Implement rate limiting on organization creation and invitation processing endpoints