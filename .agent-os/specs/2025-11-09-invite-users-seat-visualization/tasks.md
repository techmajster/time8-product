# Spec Tasks

## Tasks

- [ ] 1. Implement Seat Information API Endpoint
  - [ ] 1.1 Write tests for seat-info endpoint
  - [ ] 1.2 Create GET /api/organizations/[organizationId]/seat-info route
  - [ ] 1.3 Implement seat usage calculation using existing utilities
  - [ ] 1.4 Add pending invitations count query
  - [ ] 1.5 Add users marked for removal query
  - [ ] 1.6 Implement response formatting and error handling
  - [ ] 1.7 Add authentication and authorization checks
  - [ ] 1.8 Verify all tests pass

- [ ] 2. Create Seat Visualization Components
  - [ ] 2.1 Write tests for SeatVisualizationCard component
  - [ ] 2.2 Create SeatVisualizationCard component with progress bar
  - [ ] 2.3 Implement seat breakdown display (free vs paid)
  - [ ] 2.4 Add warning states for high utilization (80%+)
  - [ ] 2.5 Add pending removals section with dates
  - [ ] 2.6 Implement responsive design for mobile
  - [ ] 2.7 Add accessibility attributes (ARIA labels)
  - [ ] 2.8 Verify all tests pass

- [ ] 3. Build Bulk Invitations API
  - [ ] 3.1 Write tests for bulk invitations endpoint
  - [ ] 3.2 Create POST /api/organizations/[organizationId]/invitations route
  - [ ] 3.3 Implement request validation using Zod schema
  - [ ] 3.4 Add seat availability validation
  - [ ] 3.5 Implement duplicate email detection
  - [ ] 3.6 Create invitation records in database (atomic transaction)
  - [ ] 3.7 Integrate with Resend for email sending
  - [ ] 3.8 Add error handling and rollback logic
  - [ ] 3.9 Implement rate limiting (10 requests/min)
  - [ ] 3.10 Verify all tests pass

- [ ] 4. Implement Pending Invitations Management
  - [ ] 4.1 Write tests for pending invitations API
  - [ ] 4.2 Create GET /api/organizations/[organizationId]/pending-invitations route
  - [ ] 4.3 Implement pagination support
  - [ ] 4.4 Create DELETE /api/invitations/[invitationId] route
  - [ ] 4.5 Add soft-delete logic for cancellation
  - [ ] 4.6 Build PendingInvitationsTable component
  - [ ] 4.7 Add cancel confirmation dialog
  - [ ] 4.8 Implement optimistic UI updates
  - [ ] 4.9 Verify all tests pass

- [ ] 5. Create Invitation Form with Validation
  - [ ] 5.1 Write tests for InvitationForm component
  - [ ] 5.2 Build form using React Hook Form
  - [ ] 5.3 Create Zod validation schema for email, role, team
  - [ ] 5.4 Implement single and bulk email input
  - [ ] 5.5 Add real-time seat validation
  - [ ] 5.6 Create role selector dropdown
  - [ ] 5.7 Add optional team assignment selector
  - [ ] 5.8 Add optional personal message textarea
  - [ ] 5.9 Implement error display for validation failures
  - [ ] 5.10 Verify all tests pass

- [ ] 6. Build LemonSqueezy Upgrade Flow
  - [ ] 6.1 Write tests for checkout session creation
  - [ ] 6.2 Create POST /api/billing/create-checkout-session route
  - [ ] 6.3 Implement seat quantity calculation for upgrade
  - [ ] 6.4 Query LemonSqueezy variants from database
  - [ ] 6.5 Create LemonSqueezy checkout session via API
  - [ ] 6.6 Build UpgradePrompt component
  - [ ] 6.7 Display pricing and seat difference
  - [ ] 6.8 Implement "Upgrade & Send Invitations" button
  - [ ] 6.9 Handle successful payment callback
  - [ ] 6.10 Queue invitations to send after payment
  - [ ] 6.11 Verify all tests pass

- [ ] 7. Integrate All Components into InviteUsersDialog
  - [ ] 7.1 Write tests for InviteUsersDialog component
  - [ ] 7.2 Create main dialog component using shadcn/ui Dialog
  - [ ] 7.3 Integrate SeatVisualizationCard
  - [ ] 7.4 Integrate InvitationForm
  - [ ] 7.5 Integrate PendingInvitationsTable
  - [ ] 7.6 Integrate UpgradePrompt (conditional rendering)
  - [ ] 7.7 Implement dialog open/close state management
  - [ ] 7.8 Add success/error toast notifications
  - [ ] 7.9 Implement loading states and skeletons
  - [ ] 7.10 Add keyboard navigation support (Esc, Tab)
  - [ ] 7.11 Verify all tests pass

- [ ] 8. Add Dialog Trigger to Team Management Page
  - [ ] 8.1 Write tests for dialog trigger integration
  - [ ] 8.2 Add "Invite Users" button to team management page
  - [ ] 8.3 Connect button to InviteUsersDialog
  - [ ] 8.4 Implement admin-only visibility
  - [ ] 8.5 Add proper positioning and styling
  - [ ] 8.6 Verify all tests pass

- [ ] 9. Implement React Query Data Fetching
  - [ ] 9.1 Write tests for useSeatInfo hook
  - [ ] 9.2 Create useSeatInfo custom hook with React Query
  - [ ] 9.3 Implement auto-refetch on window focus
  - [ ] 9.4 Add 60-second cache TTL
  - [ ] 9.5 Create usePendingInvitations hook
  - [ ] 9.6 Implement optimistic updates for cancellations
  - [ ] 9.7 Add error retry logic with exponential backoff
  - [ ] 9.8 Verify all tests pass

- [ ] 10. End-to-End Testing and Polish
  - [ ] 10.1 Write E2E tests for complete invitation flow
  - [ ] 10.2 Test dialog opening and closing
  - [ ] 10.3 Test seat visualization accuracy
  - [ ] 10.4 Test invitation sending with available seats
  - [ ] 10.5 Test upgrade flow when seat limit exceeded
  - [ ] 10.6 Test pending invitation cancellation
  - [ ] 10.7 Test mobile responsive behavior
  - [ ] 10.8 Test accessibility (screen reader, keyboard nav)
  - [ ] 10.9 Fix any visual or UX issues
  - [ ] 10.10 Verify all tests pass
