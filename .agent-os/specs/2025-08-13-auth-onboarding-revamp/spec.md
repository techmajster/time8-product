# Spec Requirements Document

> Spec: Authentication & Onboarding Flow Redesign
> Created: 2025-08-13
> Updated: 2025-08-20
> Status: Updated for Multi-Organization Implementation

## Overview

Revamp the complete authentication and onboarding flows to match Figma designs and leverage the multi-organization database structure, providing seamless user experiences across all signup, invitation, and login scenarios while properly handling the user_organizations many-to-many relationships.

## User Stories

### Scenario 1: First-Time User Registration (No Invitations)

As a new user with no pending invitations, I want to create an account and set up my own organization so I can start managing leave requests for my team.

**Detailed Workflow:**
1. User visits signup page and fills registration form (name, email, password)
2. System creates Supabase auth user and sends email verification link
3. User clicks verification link, which confirms email and redirects to onboarding router
4. Onboarding router calls `/api/user/organization-status` and receives `no_invitations` scenario
5. User is directed to welcome screen (Figma: 24697-216103) with workspace creation option
6. User clicks "Create New Workspace" and fills organization details form
7. System creates organization, adds user to `user_organizations` table with role='admin', is_default=true, joined_via='created'
8. User is redirected to dashboard with their new organization as the default

### Scenario 2: User Registration with Pending Invitations

As a user who has pending organization invitations but chooses to register independently, I want to see my invitation options and choose whether to accept them or create my own workspace.

**Detailed Workflow:**
1. User registers with email that has pending invitations in the `invitations` table
2. System creates auth user and sends email verification (no auto-acceptance of invitations)
3. After email verification, onboarding router calls `/api/user/organization-status`
4. API returns `has_invitations` scenario with array of pending invitations
5. User sees invitation choice screen (Figma: 24689-24716) showing all pending invitations
6. User can either:
   a. Accept an invitation: Creates entry in `user_organizations` table, marks invitation as accepted
   b. Create new workspace: Proceeds to workspace creation flow
7. System redirects to dashboard with appropriate organization as default

### Scenario 3: Direct Invitation Link Signup

As a user who clicks an invitation link, I want a streamlined signup process where I only need to set my password, since my email and role are already determined by the invitation.

**Detailed Workflow:**
1. User clicks invitation link containing signed token parameter
2. System validates token and extracts invitation data from database
3. Invitation signup page (Figma: 24697-216007) shows pre-filled name and email
4. Page displays "You've been invited as [role] to [organization]" messaging
5. User only needs to set password and confirm account creation
6. System creates auth user (with email_confirmed_at set), creates `user_organizations` entry, and marks invitation as accepted
7. User is automatically logged in and redirected to dashboard

### Scenario 4: Existing User with Mixed Status

As an existing user who logs in and has both current organization memberships AND new pending invitations, I want to be notified about the new invitations without disrupting my current workflow.

**Detailed Workflow:**
1. User logs in successfully with existing credentials
2. Post-login check detects user has entries in `user_organizations` AND pending invitations
3. Dashboard shows notification badge or banner about pending invitations
4. User can access invitation review interface from dashboard settings or notification
5. User can accept/decline new invitations while maintaining current organization memberships
6. System updates `user_organizations` table with new entries while preserving existing ones

## Spec Scope

1. **Multi-Organization Onboarding Router** - Enhanced routing logic that properly handles user_organizations table and invitation states
2. **Email Verification Integration** - Seamless flow from email verification to appropriate onboarding scenario
3. **Organization Creation Workflow** - Complete workspace setup with proper admin role assignment and default organization marking
4. **Invitation Management System** - Accept/decline invitations with proper user_organizations table updates
5. **Direct Invitation Signup** - Token-based signup flow that bypasses email verification for invited users
6. **Mixed Status Handling** - Graceful handling of users with both existing memberships and new pending invitations
7. **Database Integration** - Proper use of user_organizations, invitations, and organization_domains tables
8. **API Enhancements** - Updated endpoints to support multi-organization scenarios and proper error handling

## Out of Scope

- Organization switching interface (covered in separate spec)
- Leave request functionality and leave balances
- Advanced organization settings and branding
- Email template redesign (using existing templates)
- Google Workspace domain verification
- Organization directory and discovery features
- Admin panel modifications for user management
- Profile management and user settings

## Expected Deliverable

1. **Four complete onboarding scenarios** working seamlessly with the multi-organization database structure
2. **Updated onboarding pages** matching Figma designs (24697-216103, 24689-24716, 24697-216007, 24689-24777)
3. **Enhanced API endpoints** with proper multi-organization support and error handling
4. **Database integration** correctly using user_organizations, invitations, and related tables
5. **Responsive design** working across desktop and mobile devices
6. **Comprehensive testing** ensuring all scenarios work without authentication or routing failures