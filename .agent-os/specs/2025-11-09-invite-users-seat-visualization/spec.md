# Spec Requirements Document

> Spec: Invite Users Dialog with Seat Visualization & LemonSqueezy Integration
> Created: 2025-11-09
> Status: Planning

## Overview

Create a comprehensive invite users dialog that provides real-time seat visualization, billing transparency, and seamless LemonSqueezy integration for seat upgrades. This feature enables admins to understand seat availability at a glance and upgrade their subscription directly from the invitation flow when needed.

## User Stories

### Admin Invites Users with Available Seats

As an organization admin, I want to invite new team members and see my current seat usage so that I understand how many employees I can invite without needing to upgrade.

**Workflow:**
1. Admin clicks "Invite Users" button from team management page
2. Dialog opens showing:
   - Current seat usage visualization (e.g., "7/10 seats used")
   - Visual progress bar or indicator
   - List of pending invitations (if any)
   - Available seats count prominently displayed
3. Admin enters email addresses for new invitees (single or bulk)
4. Admin selects roles (admin/manager/employee) for each invitee
5. Admin optionally assigns teams and adds personal messages
6. System validates that invitations won't exceed seat limit
7. Admin clicks "Send Invitations"
8. Invitations are sent and dialog shows success confirmation
9. Seat visualization updates to reflect pending invitations

**Problem Solved:** Clear visibility into seat availability prevents errors and reduces friction in the invitation process.

### Admin Invites Users Exceeding Seat Limit

As an organization admin, I want to be notified when I'm trying to invite more users than my current plan allows so that I can upgrade my subscription seamlessly without leaving the invitation flow.

**Workflow:**
1. Admin opens invite dialog showing "10/10 seats used" (at capacity)
2. Admin enters 3 new email addresses to invite
3. System detects that invitation would exceed limit (10/10 + 3 = 13 total needed)
4. Dialog shows upgrade prompt:
   - "You need 3 additional seats to invite these users"
   - Current plan: 10 seats
   - Required plan: 13 seats (or next available tier)
   - Price difference displayed clearly
5. Admin clicks "Upgrade & Send Invitations"
6. System initiates LemonSqueezy checkout for seat upgrade
7. After successful payment, invitations are sent automatically
8. Admin is returned to dashboard with updated seat count

**Problem Solved:** Removes friction from growth by enabling instant upgrades during the invitation process.

### Admin Reviews Pending Invitations

As an organization admin, I want to see all pending invitations within the invite dialog so that I can manage who has been invited and cancel invitations if needed.

**Workflow:**
1. Admin opens invite dialog
2. Dialog displays "Pending Invitations" section showing:
   - Email addresses of invited users
   - Roles assigned
   - Date invited
   - Status (pending/accepted)
   - "Cancel" button for each invitation
3. Admin can cancel pending invitations to free up seats
4. Seat visualization updates immediately when invitations are cancelled

**Problem Solved:** Provides transparency and control over seat allocation before users accept invitations.

### Admin Views Seat Usage Breakdown

As an organization admin, I want to see a detailed breakdown of how my seats are being used so that I can make informed decisions about upgrades and user management.

**Workflow:**
1. Admin opens invite dialog
2. Seat visualization section displays:
   - Total seats: 10 (3 free + 7 paid)
   - Active members: 8
   - Pending invitations: 1
   - Available seats: 1
   - Visual breakdown (free seats vs paid seats)
   - Users marked for removal at next renewal: 2
3. Admin can see exactly where their seats are allocated
4. If seats are marked for removal, dialog shows: "2 seats will be freed on Dec 5, 2025"

**Problem Solved:** Complete transparency into seat allocation enables better resource planning.

## Spec Scope

1. **Invite Users Dialog UI** - Modal/dialog with seat visualization, invitation form, and upgrade prompt
2. **Real-time Seat Calculation** - Accurate seat counting including active members, pending invitations, and pending removals
3. **Visual Seat Indicators** - Progress bars, badges, and clear messaging showing seat usage and availability
4. **Bulk Invitation Support** - Allow inviting multiple users simultaneously with seat validation
5. **LemonSqueezy Checkout Integration** - Seamless upgrade flow when seat limit is exceeded
6. **Pending Invitations Management** - View and cancel pending invitations within the dialog
7. **Role and Team Assignment** - Assign roles and teams during invitation process
8. **Seat Upgrade Pricing Preview** - Show exact cost difference for required seat upgrades

## Out of Scope

- Bulk CSV upload for invitations (handled by existing add-employee flow)
- Custom invitation email templates (use existing templates)
- Invitation expiration settings (use existing 7-day expiration)
- Seat reservation system for future hires
- Automatic seat downgrade recommendations
- Team-based seat allocation limits
- Department-level access controls

## Expected Deliverable

1. Invite users dialog accessible from team management page with prominent "Invite Users" button
2. Real-time seat visualization showing current usage, pending invitations, and available seats
3. Form validation preventing invitations that exceed seat limits
4. Upgrade prompt with LemonSqueezy integration when seat limit exceeded
5. Pending invitations list with cancel functionality
6. Success/error states with clear messaging
7. Responsive design working on desktop and mobile
8. Accessibility compliance (ARIA labels, keyboard navigation)
9. All invitations sent successfully track seat usage correctly
10. LemonSqueezy webhook updates seat counts immediately after payment
