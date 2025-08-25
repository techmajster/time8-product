# Spec Tasks

## Tasks

- [ ] 1. Enhance Database Schema for Cross-Organization Invitations
  - [ ] 1.1 Write tests for enhanced invitations table structure
  - [ ] 1.2 Create migration script to add invitation_type and existing_user_id columns
  - [ ] 1.3 Update database indexes for performance optimization
  - [ ] 1.4 Verify all database tests pass

- [ ] 2. Update Employee Validation API
  - [ ] 2.1 Write tests for enhanced validation response format
  - [ ] 2.2 Modify `/api/employees/validate` to detect cross-organization users
  - [ ] 2.3 Return detailed validation response with invitation_type
  - [ ] 2.4 Verify all validation API tests pass

- [ ] 3. Enhance Employee Invitation API
  - [ ] 3.1 Write tests for cross-organization invitation handling
  - [ ] 3.2 Update `/api/employees` POST to support cross_organization_invitation mode
  - [ ] 3.3 Implement existing user linking logic in invitation creation
  - [ ] 3.4 Update email sending logic to choose appropriate templates
  - [ ] 3.5 Verify all employee invitation API tests pass

- [ ] 4. Create Cross-Organization Invitation Acceptance API
  - [ ] 4.1 Write tests for invitation acceptance endpoint
  - [ ] 4.2 Create `/api/invitations/accept-cross-organization` endpoint
  - [ ] 4.3 Implement user-organization relationship creation
  - [ ] 4.4 Add security validation for invitation tokens
  - [ ] 4.5 Verify all acceptance API tests pass

- [ ] 5. Update Admin UI for Enhanced Feedback
  - [ ] 5.1 Write tests for enhanced AddEmployeePage validation feedback
  - [ ] 5.2 Update AddEmployeePage to handle cross-organization invitation responses
  - [ ] 5.3 Add confirmation dialog for existing user invitations
  - [ ] 5.4 Implement actionable error messages with next steps
  - [ ] 5.5 Verify all frontend tests pass

- [ ] 6. Create Enhanced Email Templates
  - [ ] 6.1 Write tests for email template selection logic
  - [ ] 6.2 Create cross-organization invitation email template
  - [ ] 6.3 Update email service to choose templates based on invitation type
  - [ ] 6.4 Add organization context variables to email templates
  - [ ] 6.5 Verify all email service tests pass