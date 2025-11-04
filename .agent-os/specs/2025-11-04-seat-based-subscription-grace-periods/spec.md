# Spec Requirements Document

> Spec: Seat-Based Subscription with Grace Periods
> Created: 2025-11-04
> Status: Planning

## Overview

Implement a comprehensive seat management system that allows organizations to remove users while maintaining their access until the end of the billing period, then automatically archiving them and updating Lemon Squeezy billing accordingly. This ensures fair billing (customers only pay for active seats at renewal) while providing a smooth user experience with grace periods.

## User Stories

### Admin Removes User with Grace Period

As an organization admin, I want to remove a user from my team so that they no longer have access after the current billing period ends, but I want them to retain access through the period I've already paid for.

**Workflow:**
1. Admin navigates to team members page
2. Admin clicks "Remove User" on a team member
3. System confirms: "User will be removed on [renewal_date]. They will have access until then."
4. Admin confirms removal
5. User status changes to "pending_removal" with visible badge
6. User continues working normally until renewal date
7. At renewal date, user is automatically archived
8. Organization is billed for reduced seat count going forward

**Problem Solved:** Fair billing and graceful user off-boarding without immediate access loss during paid period.

### Admin Views Pending Changes

As an organization admin, I want to see all pending subscription changes so that I understand what will happen at the next billing cycle.

**Workflow:**
1. Admin views subscription/billing page
2. System displays:
   - Current seats: 10
   - Pending seats (at renewal): 9
   - Next renewal date: December 5, 2025
   - List of users marked for removal with dates
3. Admin can cancel pending removals if needed

**Problem Solved:** Transparency and control over subscription changes before they take effect.

### Admin Reactivates Archived User

As an organization admin, I want to reactivate a previously archived user so that they can rejoin the team if we have available seats.

**Workflow:**
1. Admin views archived users list
2. Admin clicks "Reactivate" on an archived user
3. System checks if seats are available
4. If available, user status changes to "active" immediately
5. User regains full access
6. If at seat limit, admin is prompted to upgrade seats first

**Problem Solved:** Easy rehiring or reactivation without losing historical data.

## Spec Scope

1. **User Removal with Grace Period** - Mark users for removal while maintaining access until billing renewal, with clear UI indicators
2. **Automatic Lemon Squeezy Sync** - Scheduled background job updates seat count 24 hours before renewal to guarantee correct billing
3. **User Archival System** - Automatically archive removed users at renewal time while preserving historical data (vacation days, leave requests)
4. **User Reactivation** - Allow admins to unarchive and reactivate users if seats are available
5. **Admin Dashboard** - UI showing pending changes, renewal dates, seat usage, and sync status

## Out of Scope

- Bulk user operations (add/remove multiple users at once)
- Custom grace periods per organization (all use billing cycle)
- User self-service reactivation requests
- Advanced analytics on seat usage patterns
- Seat reservation system
- Prorated refunds for mid-cycle removals (billing adjusts at next cycle only)

## Expected Deliverable

1. Users marked for removal retain full access through paid billing period
2. System automatically updates Lemon Squeezy seat count 24h before renewal
3. Customers charged correct amount at renewal (no overcharging)
4. Users automatically archived at renewal with preserved historical data
5. Admin dashboard shows pending changes with renewal dates
6. Admins can reactivate archived users (if seats available)
7. Background jobs run automatically with zero manual intervention
8. Alerts fire for any billing discrepancies requiring attention
