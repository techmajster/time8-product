# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-22-auth-login-redirect-fix/spec.md

## Technical Requirements

- **Login Form Updates**: Change `router.push('/dashboard')` to `router.push('/onboarding')` in LoginForm.tsx and SignupForm.tsx
- **Multi-Option API Integration**: Fix onboarding page to properly fetch organization data when scenario is 'multi-option' for authenticated users with tokens
- **Middleware Coordination**: Ensure middleware properly handles the new `/onboarding` redirect flow without creating redirect loops
- **Scenario Logic Enhancement**: Update onboarding page scenario determination to handle authenticated users with invitation tokens correctly
- **Dashboard Navigation**: Ensure all onboarding scenarios have clear paths to dashboard after user makes their choice
- **State Management**: Proper handling of user authentication state, workspace data, and invitation tokens in the onboarding flow
- **Error Handling**: Robust error handling for API failures when fetching organization status
- **Loading States**: Appropriate loading indicators during organization data fetching and scenario determination

## API Integration Points

- `/api/user/organization-status` - Must be called for multi-option scenarios to fetch user's existing workspaces
- `/api/invitations/lookup` - Continue using for invitation token validation
- Supabase Auth - Maintain current authentication state management
- Organization data fetching - Ensure proper workspace data retrieval and display

## Component Updates Required

- `app/login/components/LoginForm.tsx` - Update redirect destination
- `app/login/components/SignupForm.tsx` - Update redirect destination (if applicable)
- `app/onboarding/page.tsx` - Fix multi-option scenario API integration
- `components/onboarding/MultiOptionScreen.tsx` - Ensure proper workspace data display
- `middleware.ts` - Coordinate with new login redirect behavior