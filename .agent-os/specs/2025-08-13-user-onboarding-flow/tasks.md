# Spec Tasks

## Tasks

- [ ] 1. Backend API Enhancement - User Status Detection
  - [ ] 1.1 Write tests for user organization status API
  - [ ] 1.2 Create `/api/user/organization-status` route for onboarding detection
  - [ ] 1.3 Implement logic to check user's organization memberships using existing database
  - [ ] 1.4 Add support for identifying default organization and invitation status
  - [ ] 1.5 Optimize database queries for organization status checks
  - [ ] 1.6 Verify all tests pass for user status API

- [ ] 2. Legacy Onboarding Cleanup
  - [ ] 2.1 Write tests to ensure safe removal of legacy onboarding components
  - [ ] 2.2 Remove existing `/app/onboarding/page.tsx` component entirely
  - [ ] 2.3 Remove existing `/app/onboarding/create/page.tsx` component entirely
  - [ ] 2.4 Clean up any unused imports and references to old components
  - [ ] 2.5 Update routing to prevent access to old onboarding paths
  - [ ] 2.6 Verify removal doesn't break existing functionality

- [ ] 3. TypeScript Types and Validation Schemas
  - [ ] 3.1 Write tests for all onboarding-related TypeScript interfaces
  - [ ] 3.2 Create types for user organization status responses
  - [ ] 3.3 Create types that match existing organization API responses
  - [ ] 3.4 Create Zod schemas that work with existing organization creation API
  - [ ] 3.5 Create types for invitation acceptance using existing invitation APIs
  - [ ] 3.6 Export all types for use across new onboarding components
  - [ ] 3.7 Verify all type and validation tests pass

- [ ] 4. Scenario 1: Welcome Screen Component (No Invitations)
  - [ ] 4.1 Write tests for Welcome Screen component rendering and behavior
  - [ ] 4.2 Create `/app/onboarding/welcome/page.tsx` matching Figma design exactly
  - [ ] 4.3 Build clean UI from scratch using shadcn components
  - [ ] 4.4 Add "Create new workspace" button with proper routing
  - [ ] 4.5 Implement responsive design using Tailwind CSS
  - [ ] 4.6 Add internationalization support for welcome screen text
  - [ ] 4.7 Verify all Welcome Screen tests pass

- [ ] 5. Scenario 1: Create Workspace Form Component
  - [ ] 5.1 Write tests for Create Workspace form validation and submission
  - [ ] 5.2 Create new `/app/onboarding/create-workspace/page.tsx` matching Figma design
  - [ ] 5.3 Build form from scratch using shadcn Form components
  - [ ] 5.4 Implement React Hook Form with Zod validation
  - [ ] 5.5 Add form fields that match existing `/api/organizations/route.ts` requirements
  - [ ] 5.6 Integrate with existing organization creation API endpoint
  - [ ] 5.7 Add form error handling and success states using existing API responses
  - [ ] 5.8 Verify all Create Workspace form tests pass

- [ ] 6. Scenario 2: Choice Screen Component (Pending Invitations)
  - [ ] 6.1 Write tests for Choice Screen component with invitation display
  - [ ] 6.2 Create new `/app/onboarding/choose/page.tsx` matching Figma design
  - [ ] 6.3 Build clean invitation selection UI from scratch using shadcn components
  - [ ] 6.4 Integrate with existing `/api/invitations/pending` API
  - [ ] 6.5 Display multiple invitations with organization details
  - [ ] 6.6 Add accept invitation and create workspace options
  - [ ] 6.7 Implement invitation acceptance using existing invitation APIs
  - [ ] 6.8 Verify all Choice Screen tests pass

- [ ] 7. Scenario 3: Enhanced Token-based Registration
  - [ ] 7.1 Write tests for enhanced registration flow with tokens
  - [ ] 7.2 Create new `/app/onboarding/join-organization/page.tsx` matching Figma design
  - [ ] 7.3 Build clean registration form from scratch using shadcn components
  - [ ] 7.4 Create password creation form with validation
  - [ ] 7.5 Add token validation using existing invitation APIs
  - [ ] 7.6 Display organization details using existing API responses
  - [ ] 7.7 Implement automatic organization joining using existing APIs
  - [ ] 7.8 Verify all token-based registration tests pass

- [ ] 8. Onboarding Router and Detection Logic
  - [ ] 8.1 Write tests for onboarding routing logic with all scenarios
  - [ ] 8.2 Create `/app/onboarding/page.tsx` as main router component
  - [ ] 8.3 Implement user scenario detection using new organization status API
  - [ ] 8.4 Add routing logic for scenario 1 (no invitations) → /onboarding/welcome
  - [ ] 8.5 Add routing logic for scenario 2 (pending invitations) → /onboarding/choose
  - [ ] 8.6 Add routing logic for scenario 3 (token-based) → /onboarding/join-organization
  - [ ] 8.7 Add priority handling for direct token links over pending invitations
  - [ ] 8.8 Verify all routing and detection tests pass

- [ ] 9. UI Component Library Integration
  - [ ] 9.1 Write tests for all new shadcn component integrations
  - [ ] 9.2 Ensure consistent use of existing shadcn Button, Card, Form components
  - [ ] 9.3 Add proper loading states using shadcn Skeleton components
  - [ ] 9.4 Implement error states with shadcn Alert components
  - [ ] 9.5 Add form validation feedback using shadcn form components
  - [ ] 9.6 Ensure mobile responsiveness matches Figma designs
  - [ ] 9.7 Verify all UI component tests pass

- [ ] 10. Internationalization (i18n) Implementation
  - [ ] 10.1 Write tests for Polish and English translations
  - [ ] 10.2 Extract all new onboarding text to existing translation files
  - [ ] 10.3 Add Polish translations for all new onboarding flows
  - [ ] 10.4 Add English translations for all new onboarding flows
  - [ ] 10.5 Update new components to use existing next-intl setup
  - [ ] 10.6 Test language switching across new onboarding flows
  - [ ] 10.7 Verify all internationalization tests pass

- [ ] 11. Error Handling and Edge Cases
  - [ ] 11.1 Write tests for network failure scenarios
  - [ ] 11.2 Add error boundaries for new onboarding components
  - [ ] 11.3 Implement retry logic for failed API calls to existing endpoints
  - [ ] 11.4 Handle edge cases using existing API error responses
  - [ ] 11.5 Handle scenarios where user already has organizations
  - [ ] 11.6 Add fallback UI for unexpected states
  - [ ] 11.7 Verify all error handling tests pass

- [ ] 12. Integration Testing with Existing Backend
  - [ ] 12.1 Write integration tests for scenario 1 flow with existing organization API
  - [ ] 12.2 Write integration tests for scenario 2 flow with existing invitation APIs
  - [ ] 12.3 Write integration tests for scenario 3 flow with existing registration APIs
  - [ ] 12.4 Test cross-scenario navigation and state management
  - [ ] 12.5 Test integration with existing database and RLS policies
  - [ ] 12.6 Test authentication and authorization with existing middleware
  - [ ] 12.7 Verify all integration tests pass

- [ ] 13. Performance Optimization and Caching
  - [ ] 13.1 Write tests for React Query caching behavior
  - [ ] 13.2 Implement optimistic updates for existing organization API
  - [ ] 13.3 Add React Query caching for existing pending invitations API
  - [ ] 13.4 Ensure new components work with existing caching strategies
  - [ ] 13.5 Add loading states to prevent layout shifts
  - [ ] 13.6 Implement proper cache invalidation with existing APIs
  - [ ] 13.7 Verify all performance optimization tests pass

- [ ] 14. Middleware and Routing Integration
  - [ ] 14.1 Write tests for middleware integration with new onboarding
  - [ ] 14.2 Update existing authentication middleware to redirect to new onboarding router
  - [ ] 14.3 Ensure new onboarding works with existing user session management
  - [ ] 14.4 Test redirect logic from dashboard/login to appropriate onboarding scenario
  - [ ] 14.5 Update navigation components to link to new onboarding flows
  - [ ] 14.6 Verify middleware doesn't conflict with existing protected routes
  - [ ] 14.7 Verify all middleware integration tests pass

- [ ] 15. Documentation and Component Comments
  - [ ] 15.1 Write documentation for new onboarding components
  - [ ] 15.2 Document integration with existing APIs
  - [ ] 15.3 Add inline code comments for scenario detection logic
  - [ ] 15.4 Document routing and middleware integration
  - [ ] 15.5 Create troubleshooting guide for onboarding issues
  - [ ] 15.6 Update existing documentation with new onboarding flows
  - [ ] 15.7 Verify documentation completeness and accuracy

- [ ] 16. Final System Validation and Deployment
  - [ ] 16.1 Run complete test suite for all new onboarding functionality
  - [ ] 16.2 Perform manual testing of all three scenarios with existing backend
  - [ ] 16.3 Test integration with existing database and RLS policies
  - [ ] 16.4 Validate existing security measures work with new frontend
  - [ ] 16.5 Test internationalization with both languages
  - [ ] 16.6 Test new components with existing API load patterns
  - [ ] 16.7 Verify all system validation tests pass and prepare for deployment