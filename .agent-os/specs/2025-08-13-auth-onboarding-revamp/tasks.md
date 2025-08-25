# Spec Tasks

## Tasks

- [ ] 1. Database Integration Testing and Validation
  - [ ] 1.1 Write comprehensive tests for user_organizations table operations
  - [ ] 1.2 Validate existing multi-organization database structure and constraints
  - [ ] 1.3 Test invitation token validation and expiration logic
  - [ ] 1.4 Verify RLS policies work correctly for onboarding scenarios
  - [ ] 1.5 Test database index performance for onboarding queries
  - [ ] 1.6 Verify all database tests pass

- [ ] 2. API Endpoint Enhancements
  - [ ] 2.1 Write tests for enhanced /api/user/organization-status endpoint
  - [ ] 2.2 Update /api/user/organization-status to properly query user_organizations table
  - [ ] 2.3 Implement /api/invitations/validate-token endpoint for token validation
  - [ ] 2.4 Enhance /api/invitations/accept endpoint with proper user_organizations creation
  - [ ] 2.5 Implement /api/invitations/decline endpoint
  - [ ] 2.6 Create /api/dashboard/pending-invitations for mixed status scenario
  - [ ] 2.7 Verify all API tests pass

- [ ] 3. Organization Creation Enhancement
  - [ ] 3.1 Write tests for enhanced organization creation with multi-org support
  - [ ] 3.2 Update /api/organizations route to create user_organizations entry atomically
  - [ ] 3.3 Ensure organization_settings record creation with defaults
  - [ ] 3.4 Implement proper is_default flag management for first organization
  - [ ] 3.5 Add validation for organization slug uniqueness
  - [ ] 3.6 Verify all organization creation tests pass

- [ ] 4. Direct Invitation Signup Flow
  - [ ] 4.1 Write tests for token-based account creation
  - [ ] 4.2 Enhance /api/auth/signup-with-invitation for complete account setup
  - [ ] 4.3 Implement automatic email verification bypass for invited users
  - [ ] 4.4 Create atomic invitation acceptance with user_organizations entry
  - [ ] 4.5 Handle default organization logic for first-time users
  - [ ] 4.6 Verify all invitation signup tests pass

- [ ] 5. Email Verification Flow Integration
  - [ ] 5.1 Write tests for enhanced email verification routing
  - [ ] 5.2 Update /api/auth/verify-email to redirect to onboarding router
  - [ ] 5.3 Remove auto-invitation acceptance from verification flow
  - [ ] 5.4 Implement proper error handling for verification edge cases
  - [ ] 5.5 Verify verification flow works with all onboarding scenarios
  - [ ] 5.6 Verify all email verification tests pass

- [ ] 6. Onboarding Router Enhancement
  - [ ] 6.1 Write tests for four-scenario routing logic
  - [ ] 6.2 Update /app/onboarding/page.tsx to handle scenario-based routing
  - [ ] 6.3 Integrate with enhanced organization status API
  - [ ] 6.4 Implement proper loading states and error handling
  - [ ] 6.5 Add fallback routing for edge cases
  - [ ] 6.6 Verify all onboarding router tests pass

- [ ] 7. Figma Design Implementation - Welcome Screen (Scenario 1)
  - [ ] 7.1 Write tests for welcome screen components
  - [ ] 7.2 Update /app/onboarding/welcome/page.tsx with Figma design 24697-216103
  - [ ] 7.3 Implement responsive design for mobile and desktop
  - [ ] 7.4 Add proper i18n integration for multi-language support
  - [ ] 7.5 Test welcome screen navigation to workspace creation
  - [ ] 7.6 Verify all welcome screen tests pass

- [ ] 8. Figma Design Implementation - Workspace Creation (Scenario 1)
  - [ ] 8.1 Write tests for workspace creation form validation
  - [ ] 8.2 Update /app/onboarding/create-workspace/page.tsx with Figma design 24689-24777
  - [ ] 8.3 Implement organization name and slug validation with real-time feedback
  - [ ] 8.4 Add Google domain detection for existing Google users
  - [ ] 8.5 Implement form error handling and success states
  - [ ] 8.6 Verify all workspace creation tests pass

- [ ] 9. Figma Design Implementation - Invitation Choice (Scenario 2)
  - [ ] 9.1 Write tests for invitation display and interaction
  - [ ] 9.2 Update /app/onboarding/choose/page.tsx with Figma design 24689-24716
  - [ ] 9.3 Implement multiple invitation display with organization details
  - [ ] 9.4 Add invitation acceptance/decline actions with proper feedback
  - [ ] 9.5 Implement alternative workspace creation option
  - [ ] 9.6 Verify all invitation choice tests pass

- [ ] 10. Figma Design Implementation - Direct Invitation (Scenario 3)
  - [ ] 10.1 Write tests for direct invitation password setup
  - [ ] 10.2 Update /app/onboarding/join/page.tsx with Figma design 24697-216007
  - [ ] 10.3 Implement token validation and pre-filled form display
  - [ ] 10.4 Add dynamic role and organization messaging
  - [ ] 10.5 Implement password-only account creation flow
  - [ ] 10.6 Verify all direct invitation tests pass

- [ ] 11. Mixed Status Scenario Implementation (Scenario 4)
  - [ ] 11.1 Write tests for mixed status detection and handling
  - [ ] 11.2 Implement dashboard notification system for pending invitations
  - [ ] 11.3 Create invitation management interface for existing users
  - [ ] 11.4 Add proper routing logic for users with existing organizations and pending invitations
  - [ ] 11.5 Implement invitation badge/notification UI components
  - [ ] 11.6 Verify all mixed status tests pass

- [ ] 12. Error Handling and Edge Cases
  - [ ] 12.1 Write tests for expired invitation tokens
  - [ ] 12.2 Implement graceful handling of duplicate memberships
  - [ ] 12.3 Add error boundaries for network failures during onboarding
  - [ ] 12.4 Handle race conditions in invitation acceptance
  - [ ] 12.5 Implement fallback flows for various error scenarios
  - [ ] 12.6 Verify all error handling tests pass

- [ ] 13. Security and Validation Enhancement
  - [ ] 13.1 Write security tests for token validation and user permissions
  - [ ] 13.2 Implement proper email matching validation for invitation acceptance
  - [ ] 13.3 Add rate limiting to onboarding-related endpoints
  - [ ] 13.4 Ensure RLS policies are correctly applied to all database operations
  - [ ] 13.5 Implement CSRF protection for all form submissions
  - [ ] 13.6 Verify all security tests pass

- [ ] 14. Mobile and Accessibility Implementation
  - [ ] 14.1 Write tests for mobile responsive behavior
  - [ ] 14.2 Implement responsive design for all onboarding pages
  - [ ] 14.3 Add proper ARIA labels and keyboard navigation
  - [ ] 14.4 Test screen reader compatibility for all onboarding flows
  - [ ] 14.5 Implement touch-friendly interactions for mobile devices
  - [ ] 14.6 Verify all accessibility and mobile tests pass

- [ ] 15. Integration Testing and E2E Validation
  - [ ] 15.1 Write end-to-end tests for all four onboarding scenarios
  - [ ] 15.2 Test complete user journey from signup to dashboard
  - [ ] 15.3 Validate proper organization membership creation and default setting
  - [ ] 15.4 Test invitation flows with real email verification
  - [ ] 15.5 Verify multi-organization scenario handling
  - [ ] 15.6 Run complete test suite and ensure all tests pass