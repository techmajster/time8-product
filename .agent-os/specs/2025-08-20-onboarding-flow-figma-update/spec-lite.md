# Onboarding Flow Figma Update - Lite Summary

Update the complete onboarding flow to match 4 Figma scenarios: welcome screen for new users, choice screen for single invitations, multi-option screen for existing workspaces/multiple invitations, and direct invitation registration.

## Key Points
- Implement 4 distinct onboarding scenarios based on user organization status
- Add workspace avatars with circular icons showing initials and member counts
- Enhance routing logic using existing /api/user/organization-status endpoint
- Maintain seamless invitation acceptance via existing /api/auth/signup-with-invitation
- Match exact Figma designs for all onboarding screens