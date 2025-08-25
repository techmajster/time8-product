# Spec Requirements Document

> Spec: Existing User Invitation Handling
> Created: 2025-08-21
> Status: Planning

## Overview

Improve the user experience and system behavior when administrators attempt to invite users who already exist in the database but are not part of their organization. Currently, the system blocks such invitations without providing clear feedback or alternative actions.

## User Stories

### Admin Inviting Existing User

As an administrator, I want to invite an existing user from another organization to join my organization, so that I can add experienced users without forcing them to create duplicate accounts.

**Current Workflow:**
1. Admin enters email of existing user (from different organization)
2. System detects user exists but blocks invitation
3. Admin receives generic error with no next steps
4. Admin is left without clear path forward

**Improved Workflow:**
1. Admin enters email of existing user
2. System detects user exists in different organization
3. System offers organization-specific invitation option
4. Admin can send cross-organization invitation
5. Existing user receives invitation to join this specific organization
6. User can accept and gain access to new organization while maintaining existing accounts

### Existing User Receiving Cross-Organization Invitation

As an existing user, I want to receive invitations to join additional organizations, so that I can manage multiple workplace accounts within the same system.

**Workflow:**
1. User receives invitation email for new organization
2. Email clearly indicates this is for joining an additional organization
3. User clicks invitation link and sees organization-specific onboarding
4. User accepts invitation and gains access to new organization
5. User can switch between organizations in the interface

## Spec Scope

1. **Cross-Organization Invitation Detection** - Detect when invited email belongs to existing user from different organization
2. **Enhanced Admin UI Feedback** - Provide clear messaging when attempting to invite existing users with actionable options
3. **Organization-Specific Invitation Flow** - Create invitation flow specifically for existing users joining additional organizations
4. **Invitation Email Differentiation** - Customize invitation emails to clearly indicate joining additional vs new organizations
5. **User Organization Management** - Enable users to accept invitations and manage multiple organization memberships

## Out of Scope

- Merging user accounts from different organizations
- Automatic user discovery across organizations
- Organization-to-organization user sharing agreements
- Bulk organization transfers
- Complex permission inheritance between organizations

## Expected Deliverable

1. **Enhanced Admin Experience** - When inviting existing users, admins see clear feedback and can proceed with cross-organization invitation
2. **Improved Invitation Emails** - Existing users receive contextually appropriate invitation emails for joining additional organizations  
3. **Seamless User Onboarding** - Existing users can accept organization invitations without creating duplicate accounts