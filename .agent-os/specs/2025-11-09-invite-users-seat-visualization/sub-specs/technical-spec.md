# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-11-09-invite-users-seat-visualization/spec.md

## Technical Requirements

### Frontend Components

#### InviteUsersDialog Component
- Build using shadcn/ui Dialog component
- Implement responsive design (mobile and desktop)
- Support keyboard navigation (Esc to close, Tab navigation)
- ARIA labels for accessibility compliance
- Toast notifications for success/error states using Sonner

#### SeatVisualizationCard Component
- Display current seat usage with visual progress bar
- Show breakdown: total seats, active members, pending invitations, available seats
- Highlight free vs paid seats distinction (3 free + X paid)
- Warning states when approaching capacity (80%+ utilization)
- Error states when over capacity
- Display users marked for removal with effective dates

#### InvitationForm Component
- Support single and bulk email input
- Email validation using Zod schema
- Role selection dropdown (admin/manager/employee)
- Optional team assignment selector
- Optional personal message textarea
- Real-time seat validation as emails are added
- Clear visual feedback when seat limit would be exceeded

#### PendingInvitationsTable Component
- Display all pending invitations with email, role, date invited
- Cancel button for each invitation
- Confirmation dialog for cancellation
- Auto-refresh when invitations are cancelled
- Show invitation status (pending/expired)

#### UpgradePrompt Component
- Calculate required seat upgrade based on invitations
- Display current plan vs required plan
- Show pricing information from LemonSqueezy
- "Upgrade & Send Invitations" CTA button
- Initiate LemonSqueezy checkout flow
- Handle successful payment callback

### Data Fetching & State Management

#### Seat Calculation Hook (`useSeatInfo`)
```typescript
interface SeatInfo {
  totalSeats: number
  paidSeats: number
  freeSeats: number
  activeMembers: number
  pendingInvitations: number
  pendingRemovals: number
  availableSeats: number
  utilizationPercentage: number
  canAddMore: boolean
  renewalDate?: string
  usersMarkedForRemoval: Array<{
    email: string
    effectiveDate: string
  }>
}
```

- Use React Query for data fetching and caching
- Fetch from `/api/organizations/[id]/seat-info` endpoint
- Auto-refetch on window focus
- Optimistic updates when invitations are sent/cancelled
- Leverage existing `calculateComprehensiveSeatInfo` from `lib/billing/seat-calculation.ts`

#### Invitation State Management
- Use React Hook Form for form state management
- Zod validation schema for email format and required fields
- Track invitation submission progress
- Handle bulk invitation validation
- Manage upgrade flow state transitions

### API Integration

#### Seat Information API
- Endpoint: `GET /api/organizations/[organizationId]/seat-info`
- Returns comprehensive seat usage data
- Includes pending invitations count from database
- Includes pending removals from user_organizations table
- Uses existing `getSeatUsage()` from `lib/seat-management.ts`

#### Bulk Invitation API
- Endpoint: `POST /api/organizations/[organizationId]/invitations`
- Validates seat availability before sending invitations
- Sends invitation emails via existing Resend integration
- Creates invitation records in database
- Returns success/failure for each invitation
- Atomic operation: all invitations succeed or all fail

#### Cancel Invitation API
- Endpoint: `DELETE /api/invitations/[invitationId]`
- Validates admin permissions
- Soft-deletes invitation record
- Updates seat availability count
- Returns updated seat info

### LemonSqueezy Integration

#### Checkout Flow
1. Calculate required seat quantity based on invitations
2. Fetch LemonSqueezy variant for required seats from database
3. Create checkout session via LemonSqueezy API
4. Include metadata: organization_id, invitation_emails, upgrade_reason
5. Redirect to LemonSqueezy hosted checkout
6. Handle return URL after successful payment

#### Post-Payment Flow
1. LemonSqueezy webhook updates subscription (existing implementation)
2. Webhook handler updates `current_seats` in subscriptions table
3. Webhook handler triggers invitation sending for queued emails
4. System redirects admin to success page
5. Invitations are sent automatically after seat update

### Database Schema Usage

#### Tables Involved
- `subscriptions`: current_seats, pending_seats, renews_at
- `user_organizations`: status, removal_effective_date
- `invitations`: email, role, organization_id, status, created_at
- `organizations`: id, name
- `teams`: id, name (for team assignment)

#### Queries
- Count active members: `SELECT COUNT(*) FROM user_organizations WHERE status = 'active'`
- Count pending invitations: `SELECT COUNT(*) FROM invitations WHERE status = 'pending'`
- Count pending removals: `SELECT COUNT(*) FROM user_organizations WHERE status = 'pending_removal'`
- Get users marked for removal: `SELECT email, removal_effective_date FROM user_organizations WHERE status = 'pending_removal'`

### Validation Logic

#### Client-side Validation
- Email format validation using Zod
- Duplicate email detection within invitation batch
- Check if email already exists in organization
- Validate seat availability before submission
- Role selection validation (required field)

#### Server-side Validation
- Admin permission check
- Seat limit enforcement using `validateEmployeeInvitation()`
- Email uniqueness across organization
- Valid team_id if assigned
- Rate limiting on invitation endpoints (max 50 invitations per request)

### Error Handling

#### User-facing Errors
- "No available seats. Upgrade required to invite more users."
- "Email [email] is already a member of this organization."
- "You can invite up to [X] users with your current plan."
- "Failed to send invitation to [email]. Please try again."
- "Seat upgrade required. You need [X] additional seats."

#### Technical Error Handling
- Network errors: Retry with exponential backoff
- Validation errors: Display inline on form fields
- Payment errors: Display error message with retry option
- Webhook failures: Queue invitations for retry
- Database errors: Rollback transactions, log errors

### Performance Considerations

#### Optimization Strategies
- Debounce email input validation (500ms)
- Pagination for pending invitations list (20 per page)
- Optimistic UI updates for invitation cancellation
- Cache seat info response (60 second TTL)
- Lazy load upgrade pricing data only when needed
- Batch invitation API calls (max 50 per request)

#### Loading States
- Skeleton loaders for seat visualization
- Loading spinners for invitation submission
- Disabled state for form during submission
- Progress indicator for bulk invitations

### Security Considerations

#### Authentication & Authorization
- Require admin role to access invite dialog
- Validate JWT token on all API requests
- Verify organization membership before showing data
- RLS policies enforce organization-scoped queries

#### Data Protection
- Sanitize email inputs to prevent XSS
- Rate limiting on invitation endpoints
- CSRF protection on API routes
- Audit log for invitation creation and cancellation
- Secure webhook signature validation for LemonSqueezy

### Analytics & Monitoring

#### Events to Track
- Dialog opened
- Invitation sent (success/failure)
- Upgrade initiated from dialog
- Upgrade completed
- Invitation cancelled
- Seat limit reached
- Error occurred during invitation

#### Metrics to Monitor
- Average invitations per session
- Upgrade conversion rate from dialog
- Failed invitation rate
- Time to complete invitation flow
- Seat utilization percentage over time

## External Dependencies

None. This feature uses existing dependencies:
- shadcn/ui (already installed)
- React Hook Form (already installed)
- Zod (already installed)
- React Query (already installed)
- Sonner (already installed)
- Lucide React (already installed)
