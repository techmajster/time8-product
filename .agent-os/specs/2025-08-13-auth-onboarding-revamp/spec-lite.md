# Spec Summary (Lite)

Revamp authentication and onboarding flows to leverage the multi-organization database structure and match Figma designs across four distinct scenarios. The implementation properly handles user_organizations relationships, invitation processing, and scenario-based routing to provide seamless onboarding experiences for all user types.

Key scenarios: first-time users creating organizations (admin role assignment), users with pending invitations choosing between acceptance and workspace creation, direct invitation token-based signup (bypassing email verification), and existing users managing new pending invitations through dashboard notifications. All flows properly integrate with the user_organizations table for multi-organization support.