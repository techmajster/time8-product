# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-08-26-admin-workspace-improvements/spec.md

> Created: 2025-08-26
> Status: Ready for Implementation

## Tasks

- [x] 1. Implement workspace deletion functionality in admin settings
  - [x] 1.1 Write tests for workspace deletion API endpoint
  - [x] 1.2 Create DELETE /api/workspaces/[id] endpoint with proper cascading deletion
  - [x] 1.3 Add new "Workspace" tab to admin settings interface
  - [x] 1.4 Implement delete workspace button with confirmation dialog
  - [x] 1.5 Add proper error handling and success notifications
  - [x] 1.6 Verify all tests pass for workspace deletion

- [x] 2. Fix workspace creator balance initialization
  - [x] 2.1 Write tests for workspace creator balance setting
  - [x] 2.2 Modify workspace creation logic to set creator's default absence balance
  - [x] 2.3 Ensure balance matches invited user default (25 days)
  - [x] 2.4 Update workspace creation flow to include balance initialization
  - [x] 2.5 Verify all tests pass for balance initialization

- [x] 3. Add language support to onboarding screens
  - [x] 3.1 Write tests for onboarding language support
  - [x] 3.2 Extend existing i18n system to onboarding components
  - [x] 3.3 Add language detection and application for onboarding screens
  - [x] 3.4 Integrate with existing translation system from auth flows
  - [x] 3.5 Test language switching across onboarding steps
  - [x] 3.6 Verify all tests pass for onboarding language support

- [x] 4. Enhance onboarding button cursor interactions
  - [x] 4.1 Write tests for onboarding UI interactions
  - [x] 4.2 Add CSS cursor: pointer to all onboarding interactive elements
  - [x] 4.3 Apply hover states consistently across onboarding components
  - [x] 4.4 Update button styling for hand cursor on hover
  - [x] 4.5 Test cursor behavior across all onboarding screens
  - [x] 4.6 Verify all tests pass for UI enhancements