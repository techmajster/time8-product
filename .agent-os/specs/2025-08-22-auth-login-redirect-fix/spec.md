# Spec Requirements Document

> Spec: Authentication Login Redirect Fix
> Created: 2025-08-22
> Status: Planning

## Overview

Fix UX flaw where authenticated users clicking invitation links and users logging in don't see the proper onboarding flow with their workspace options. Currently, logins redirect to `/dashboard` and the multi-option scenario doesn't properly fetch user's existing workspaces from the `/api/user/organization-status` API.

## User Stories

### Authenticated User Clicking Invitation Link

As an authenticated user who clicks an invitation link, I want to see my existing workspaces along with the new invitation option, so that I can choose between entering my current workspace, accepting the invitation, or creating a new workspace.

**Current Workflow:**
1. Authenticated user clicks invitation link from email
2. System shows multi-option scenario but doesn't fetch existing workspaces
3. User only sees invitation and create options, missing their existing workspace access
4. User experience is confusing and incomplete

**Improved Workflow:**
1. Authenticated user clicks invitation link
2. System properly fetches user's existing workspaces via API
3. Multi-option screen displays all options: existing workspaces, invitation, and create new
4. User can make informed choice between all available options

### User Logging Into System

As a user logging into the system, I want to be directed to the appropriate onboarding screen that shows my workspace options, so that I can choose the right workspace to access rather than being forced to the dashboard.

**Current Workflow:**
1. User completes login form
2. System redirects directly to `/dashboard`
3. Middleware checks organization status and may redirect back to onboarding
4. Creates unnecessary redirects and poor user experience

**Improved Workflow:**
1. User completes login form  
2. System redirects to `/onboarding` instead of `/dashboard`
3. Onboarding flow properly determines user's scenario and displays appropriate options
4. User makes choice and then proceeds to dashboard

## Spec Scope

1. **Update Login Redirect Logic** - Change login form to redirect to `/onboarding` instead of `/dashboard`
2. **Fix Multi-Option API Integration** - Ensure multi-option scenario properly calls `/api/user/organization-status` to fetch user workspaces
3. **Enhanced Scenario Determination** - Update onboarding logic to handle 4 scenarios correctly:
   - Scenario 1 (welcome): No workspaces + No invitations → Create workspace
   - Scenario 2 (choice): No workspaces + Has invitations → Accept invitation OR Create workspace
   - Scenario 3 (multi-option): Has workspaces + (optionally has invitations) → Enter workspace OR Accept invitation OR Create new  
   - Scenario 4 (invitation): Direct token registration → Register + Auto-join
4. **Dashboard Redirect After Choice** - Ensure all scenarios redirect to dashboard after user makes their final choice
5. **Middleware Coordination** - Update middleware to work smoothly with new login redirect behavior

## Out of Scope

- Changing invitation email templates or generation
- Modifying organization creation workflow 
- Updating existing workspace management features
- Changing authentication provider or signup flows

## Expected Deliverable

1. **Improved Login Experience** - Users logging in see their workspace options immediately instead of dashboard redirects
2. **Complete Multi-Option Display** - Authenticated users with invitation links see all available options including existing workspaces  
3. **Streamlined Onboarding Flow** - All 4 scenarios work correctly with proper workspace fetching and choice handling