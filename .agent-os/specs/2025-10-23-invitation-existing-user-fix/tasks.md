# Spec Tasks

## Tasks

- [ ] 1. Update invitation lookup API to detect existing users
  - [ ] 1.1 Add user existence check to `/api/invitations/lookup`
  - [ ] 1.2 Return `userExists: true/false` flag in API response
  - [ ] 1.3 Test API with existing and non-existing emails

- [ ] 2. Update join page to handle existing users
  - [ ] 2.1 Check `userExists` flag from invitation lookup
  - [ ] 2.2 Redirect to login page with token if user exists
  - [ ] 2.3 Preserve invitation token in login URL
  - [ ] 2.4 Continue to registration page if user doesn't exist

- [ ] 3. Implement post-login invitation acceptance
  - [ ] 3.1 Update login callback to check for invitation token
  - [ ] 3.2 Accept invitation automatically after successful login
  - [ ] 3.3 Redirect to new workspace dashboard
  - [ ] 3.4 Handle errors gracefully

- [ ] 4. Testing
  - [ ] 4.1 Test with existing account (admin@bb8.pl)
  - [ ] 4.2 Test with new account
  - [ ] 4.3 Test with expired invitation
  - [ ] 4.4 Test with invalid token
