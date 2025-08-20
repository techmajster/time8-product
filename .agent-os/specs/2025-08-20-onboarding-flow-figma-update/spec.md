# Spec Requirements Document

> Spec: Onboarding Flow Figma Update
> Created: 2025-08-20
> Status: Planning

## Overview

Update the complete onboarding flow to match the 4 scenarios defined in Figma designs, implementing proper workspace selection, invitation handling, and user registration flows based on organization status.

## User Stories

### Scenario 1: New User Without Invitations

As a new user with no pending invitations, I want to see a welcome screen with "Create new workspace" option, so that I can quickly start using the platform.

The user sees a clean welcome interface that guides them directly to workspace creation, bypassing complex choice screens when no alternatives exist.

### Scenario 2: User with Single Invitation

As a user with one pending invitation, I want to see a choice screen with both "Accept invitation" and "Create new workspace" options, so that I can decide between joining the existing workspace or creating my own.

The choice screen displays the invitation details alongside the create option, allowing informed decision-making.

### Scenario 3: User with Multiple Workspaces and Invitations

As a user with existing workspaces and pending invitations, I want to see all available options including my workspaces, pending invitations, and create new workspace, so that I can choose the most appropriate workspace to access.

The interface displays workspace avatars with circular icons showing initials and member counts, pending invitations, and creation option in a unified selection screen.

### Scenario 4: Direct Invitation Link Access

As a user clicking an email invitation link, I want to bypass email verification and proceed directly to registration for that specific workspace, so that I have a seamless invitation acceptance experience.

The registration process is streamlined for invited users, using the existing /api/auth/signup-with-invitation endpoint.

## Spec Scope

1. **Welcome Screen (Scenario 1)** - Single option interface for users with no invitations or existing workspaces
2. **Choice Screen (Scenario 2)** - Two-option interface for users with single invitation
3. **Multi-Option Screen (Scenario 3)** - Comprehensive selection interface with workspaces, invitations, and creation option
4. **Invitation Registration (Scenario 4)** - Direct signup flow for invitation link clicks
5. **Workspace Avatar Display** - Circular icons with workspace initials and member counts
6. **Route Logic Enhancement** - Improved /api/user/organization-status endpoint integration
7. **UI Component Updates** - Match Figma designs for all onboarding screens

## Out of Scope

- Domain-based auto-join functionality
- Email verification for invitation-based signups
- Changes to existing /api/auth/signup-with-invitation endpoint logic
- Workspace management features beyond onboarding

## Expected Deliverable

1. Updated onboarding flow routing that correctly identifies and displays appropriate scenario based on user status
2. Four distinct onboarding screens matching Figma designs (24697-216103, 24689-24777, 24689-24716, 24748-1751)
3. Enhanced workspace avatar components with initials and member count display
4. Seamless integration with existing invitation acceptance flow via /api/auth/signup-with-invitation
5. All onboarding scenarios testable in browser with proper navigation between states

## Spec Documentation

- Tasks: @.agent-os/specs/2025-08-20-onboarding-flow-figma-update/tasks.md
- Technical Specification: @.agent-os/specs/2025-08-20-onboarding-flow-figma-update/sub-specs/technical-spec.md
- API Specification: @.agent-os/specs/2025-08-20-onboarding-flow-figma-update/sub-specs/api-spec.md
- Tests Coverage: @.agent-os/specs/2025-08-20-onboarding-flow-figma-update/sub-specs/tests.md