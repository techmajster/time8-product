# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-08-20-onboarding-flow-figma-update/spec.md

> Created: 2025-08-20
> Version: 1.0.0

## Test Coverage

### API Endpoint Tests

**GET /api/user/organization-status**
- Test scenario detection for new users (welcome scenario)
- Test scenario detection for users with single invitation (choice scenario)  
- Test scenario detection for users with multiple workspaces/invitations (multi-option scenario)
- Test workspace data formatting (initials, member counts)
- Test invitation data formatting (organization details, inviter info)
- Test authentication requirements
- Test error handling for database failures

**POST /api/auth/signup-with-invitation**
- Verify existing tests continue to pass
- Test integration with enhanced organization status flow
- Verify email verification bypass for invitation signups

### Component Tests

**OnboardingPage Component**
- Test proper scenario routing based on API response
- Test loading states during organization status checks
- Test error handling for API failures
- Test navigation between different onboarding screens

**WorkspaceAvatar Component**
- Test initials extraction from organization names
- Test member count badge display
- Test circular avatar styling
- Test responsive behavior
- Test fallback handling for missing data

**Scenario-Specific Components**
- WelcomeScreen: Test display and create workspace navigation
- ChoiceScreen: Test invitation details and option selection
- MultiOptionScreen: Test workspace list, invitation list, and create option
- InvitationRegistration: Test integration with existing signup flow

### Integration Tests

**End-to-End Onboarding Flows**
- Test complete Scenario 1: New user to workspace creation
- Test complete Scenario 2: User with invitation makes choice
- Test complete Scenario 3: User with multiple options selects workspace
- Test complete Scenario 4: Direct invitation link to registration
- Test navigation between onboarding screens
- Test proper state persistence during onboarding process

### Browser Testing Requirements

**Visual Regression Tests**
- Compare rendered components against Figma designs
- Test responsive behavior across device sizes
- Verify workspace avatar styling matches specifications
- Test proper spacing and layout for all scenarios

**User Interaction Tests**  
- Test workspace selection functionality
- Test invitation acceptance flow
- Test create workspace navigation
- Test proper handling of loading and error states

## Mocking Requirements

### API Mocking
- Mock /api/user/organization-status responses for all 4 scenarios
- Mock user data with various workspace and invitation combinations
- Mock error responses for testing error handling
- Mock existing /api/auth/signup-with-invitation endpoint

### Data Mocking
- Create test users with different organization statuses
- Generate sample workspace data with proper initials and member counts  
- Create sample invitation data with complete organization details
- Mock authentication states for different test scenarios

### Component Mocking
- Mock external navigation components if needed
- Mock loading and error states for consistent testing
- Mock workspace and invitation data for component testing