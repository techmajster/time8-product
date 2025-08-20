# Spec Requirements Document

> Spec: User Onboarding Flow
> Created: 2025-08-13
> Status: Planning

## Overview

Replace the existing complex onboarding system with a clean, comprehensive user onboarding flow that handles three distinct scenarios based on the user's invitation status after authentication. This feature provides streamlined paths based on Figma designs, simplifying the current onboarding logic for better user experience and maintainability.

## User Stories

### Scenario 1: New User - No Invitations

As a first-time user who has authenticated but has no organization and no pending invitations, I want to see a clear welcome screen with the option to create my own workspace, so that I can start using the system immediately.

**Workflow:** User authenticates → System detects no organization + no pending invitations → Show Welcome Screen → User clicks "Create new workspace" → Show Create Workspace Form → Fill organization details → Organization created → User becomes admin → Redirect to dashboard.

### Scenario 2: New User - Has Pending Invitations  

As a new user who has pending invitations, I want to see my invitation options and choose whether to accept an invitation or create my own workspace, so that I have control over how I join the system.

**Workflow:** User authenticates → System detects pending invitations → Show Choice Screen with invitation details → User chooses "Accept invitation" OR "Create own workspace" → If accept: Join organization → If create: Show Create Workspace Form → Redirect to dashboard.

### Scenario 3: Invited User - Direct Registration

As a user who clicked an invitation link and is registering through that flow, I want to complete my registration and automatically join the organization, so that I can start using the system immediately with my assigned role.

**Workflow:** User clicks invitation link → Show registration form with invitation details → User creates password → Account created → User automatically joined to organization → Show success screen → Redirect to dashboard.

## Spec Scope

### Core Components
1. **Welcome Screen Component** - Clean landing page for users with no organization and no invitations (Scenario 1)
2. **Choice Screen Component** - Shows pending invitations with accept/create options (Scenario 2)  
3. **Create Workspace Form** - Form for collecting organization details used in Scenarios 1 & 2
4. **Invitation Registration Form** - Password creation form for token-based flow (Scenario 3)
5. **Success Screen Component** - Confirmation screen after account creation (Scenario 3)

### Backend Logic
6. **Organization Creation API** - Endpoint to create new organization and assign user as admin
7. **Invitation Acceptance API** - Endpoint to accept pending invitations and join organizations
8. **Onboarding Detection Logic** - Determine which scenario applies based on user state
9. **Routing Integration** - Middleware to route users to appropriate onboarding screen
10. **Multiple Invitations Handling** - Support for users with invitations from multiple organizations

### Integration Points
11. **Token-based Flow Enhancement** - Improve existing `/onboarding/join?token=XXX` flow 
12. **Pending Invitations API** - Fetch and display pending invitations for authenticated users
13. **Multi-org Compatibility** - Ensure all flows work with existing `user_organizations` architecture

## Out of Scope

- Multi-step wizard beyond the core onboarding screens
- Advanced organization settings during initial setup
- Bulk user invitation during workspace creation
- Organization templates or presets
- Custom branding setup during onboarding
- Manual invitation code entry (keeping existing `/onboarding/join` functionality)
- Organization search and request access features
- Email domain-based auto-joining logic

## Expected Deliverable

### Scenario 1: No Invitations
1. **Users with no org and no invitations see clean welcome screen**
2. **Create workspace flow works seamlessly with existing multi-org architecture**
3. **New organization created with user as admin in `user_organizations` table**

### Scenario 2: Has Pending Invitations  
4. **Users with pending invitations see choice screen with invitation details**
5. **Multiple invitations are displayed clearly when applicable**
6. **Users can accept invitation or choose to create own workspace**
7. **Invitation acceptance updates `user_organizations` and marks invitation as accepted**

### Scenario 3: Token-based Registration
8. **Direct invitation link flow provides clean registration experience**
9. **Account creation and organization joining happens in single flow**
10. **Success screen provides clear confirmation and auto-redirect**

### Overall Integration
11. **All scenarios integrate with existing authentication and middleware**
12. **Direct link takes priority over pending invitations as specified**
13. **Users are redirected to dashboard after any successful onboarding path**