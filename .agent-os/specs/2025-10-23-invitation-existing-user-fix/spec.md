# Spec Requirements Document

> Spec: Invitation Flow for Existing Users
> Created: 2025-10-23
> Status: Implementation

## Overview

Fix the invitation flow to properly detect when an invited user already has an account and redirect them to login instead of registration. This prevents errors when users with existing accounts try to accept workspace invitations.

## User Stories

### Existing User Accepts Invitation

As an existing user who has been invited to a new workspace, I want to be automatically detected and redirected to login, so that I can quickly join the workspace without encountering registration errors.

**Workflow:**
1. User receives invitation email for admin@bb8.pl
2. User clicks invitation link with token
3. System detects that admin@bb8.pl already has an account
4. System redirects to login page with invitation context preserved
5. User logs in with existing credentials
6. System automatically accepts the invitation
7. User is redirected to the new workspace dashboard

## Spec Scope

1. **Existing User Detection** - Check if invited email has an account in the database
2. **Login Redirect** - Redirect existing users to login page with invitation token preserved
3. **Post-Login Invitation Acceptance** - Automatically accept invitation after successful login
4. **Workspace Redirect** - Navigate user to appropriate workspace page after acceptance
5. **Error Handling** - Handle edge cases (expired invitations, invalid tokens, etc.)

## Out of Scope

- Invitation creation or email sending (already implemented)
- New user registration flow (already working)
- Invitation revocation or expiration changes

## Expected Deliverable

1. When admin@bb8.pl (existing account) clicks an invitation link, they are redirected to login
2. After login, the invitation is automatically accepted
3. User lands on the workspace dashboard for the newly joined organization
4. New users without accounts continue to use the existing registration flow
