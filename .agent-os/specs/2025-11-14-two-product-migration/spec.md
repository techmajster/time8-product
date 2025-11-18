# Spec Requirements Document

> Spec: Two-Product Migration for Billing Period Switching
> Created: 2025-11-14
> Status: Planning

## Overview

Migrate from single-product variant-switching architecture to two-product architecture to enable monthly→yearly billing period upgrades. This works around LemonSqueezy's platform limitation that prevents switching between usage-based and non-usage-based variants within the same product.

## User Stories

### Monthly User Upgrading to Yearly

As a monthly subscriber, I want to upgrade to yearly billing, so that I can save money with annual pricing and lock in my current seat count.

**Workflow**: User navigates to billing settings, clicks "Switch to Yearly", sees proration preview showing the annual cost for their current seats, confirms upgrade. System cancels monthly subscription and creates new yearly subscription with preserved seat count. User receives confirmation and new invoice.

**Problem Solved**: Currently users cannot upgrade from monthly to yearly due to LemonSqueezy API 422 error ("A subscription cannot be changed from a usage-based plan to a non-usage-based plan").

### Yearly User Attempting to Downgrade

As a yearly subscriber, I want to understand why I cannot switch to monthly until renewal, so that I know my subscription terms are honored.

**Workflow**: User navigates to billing settings, sees monthly option is locked with a message "Available after [renewal date]". Lock icon and tooltip explain that yearly→monthly switching is only available at renewal to honor prepaid annual period.

**Problem Solved**: Prevents user confusion and support tickets by clearly communicating the one-way upgrade policy.

## Critical Bug Fixes (Discovered During Testing)

### Issues Identified

During testing of workspace creation with user "testlemoniady", the following critical bugs were discovered:

1. **Billing Period Not Saved**: User selects "monthly" during workspace creation, but system shows "yearly" in settings
2. **Seat Count Shows Zero**: Admin settings displays "0 z 3 miejsc wykorzystanych" when should show "1 z 3 miejsc" (user is first seat)
3. **Wrong Redirect on Upgrade**: "Uaktualnij do płatnego planu" button redirects to new workspace creation instead of subscription management
4. **Monthly Option Incorrectly Locked**: Update subscription page shows monthly as unavailable even though user is on monthly plan
5. **Webhook Not Processing Billing Period**: No webhook received, or webhook fails to process billing period information

### Root Causes

**No Explicit Billing Period Storage**:
- Database has NO `billing_period` column to track monthly vs yearly
- System infers billing period from `lemonsqueezy_product_id` or `lemonsqueezy_variant_id`
- These IDs are NULL until webhook fires and processes subscription creation
- During workspace creation, billing period selection is lost

**Webhook Doesn't Read Tier from Custom Data**:
- `create-checkout` endpoint sends `tier: 'monthly'/'annual'` in `custom_data`
- Webhook handler receives this data but NEVER reads the `tier` field
- Instead, webhook infers billing type from variant_id comparison
- If webhook fails or is delayed, no billing period information exists

**Seat Count Display Bug**:
- `SubscriptionWidget` displays `subscription.current_seats` column
- This column defaults to 0 when subscription doesn't exist or webhook hasn't processed
- Should display count of actual active users from `organization_members` table

**Update-Subscription Defaults to Yearly**:
- Page checks: `subscription.lemonsqueezy_product_id === yearlyProductId`
- When product_id is NULL (no webhook yet), defaults to yearly
- Fallback logic: `subscription.lemonsqueezy_variant_id !== monthlyVariantId` also defaults to yearly when NULL

### Required Fixes (Added to Spec Scope)

1. **Add `billing_period` Column** - Explicit enum column ('monthly', 'yearly', null) in subscriptions table
2. **Update Webhook Handler** - Extract and save `tier` from `custom_data` to `billing_period` column
3. **Fix Seat Count Logic** - Query actual user count instead of displaying `current_seats` column
4. **Fix Billing Period Detection** - Use `billing_period` column as primary source in update-subscription page
5. **Fix Upgrade Button Redirect** - Change redirect from workspace creation to subscription management
6. **Add Billing Period to Org Creation** - Save billing period during free tier organization creation

## Spec Scope

1. **Database Schema Update** - Add `lemonsqueezy_product_id` column to track which product (monthly 621389 vs yearly 693341) each subscription belongs to

2. **New Upgrade Endpoint** - Create `/api/billing/switch-to-yearly` endpoint that cancels monthly subscription and redirects to yearly checkout with seat preservation

3. **Webhook Enhancement** - Update `subscription_created` webhook to capture `product_id` and handle migration cleanup (cancel old subscription if upgrade)

4. **UI Redesign** - Create unified subscription management page, separate from workspace creation flow

5. **Environment Variables** - Add `LEMONSQUEEZY_MONTHLY_PRODUCT_ID` and `LEMONSQUEEZY_YEARLY_PRODUCT_ID` to track separate products

## UI Architecture

### Page Separation Strategy

**Two Dedicated Pages**:
1. `/onboarding/add-users` - New workspace creation ONLY (no upgrade logic)
2. `/onboarding/update-subscription` - Existing subscription management (seats + billing period)

**Deprecated**:
- `/onboarding/change-billing-period` - Removed entirely

### Update Subscription Page Behavior

**For Monthly Users**:
- Both pricing cards selectable (monthly + yearly)
- Can upgrade to yearly + adjust seats in one action
- Switching to yearly: calls `/api/billing/switch-to-yearly` with new seat count, redirects to checkout
- Staying monthly but changing seats: calls `/api/billing/update-subscription-quantity`

**For Yearly Users**:
- Banner displayed at top: "🔒 Switching to monthly is only available at renewal (after [renewal_date])"
- Both pricing cards visible but monthly card locked/disabled with lock icon and tooltip
- Can only adjust seat quantity on yearly plan
- Calls `/api/billing/update-subscription-quantity` for seat changes

### Admin Settings Integration

**Single "Manage Subscription" Button**:
- Replaces previous "Manage Seats" and "Change Billing Period" buttons
- Redirects to `/onboarding/update-subscription` with current organization and seat count

## Subscription Cancellation & Deletion Handling

### Problem

Users retain access to the system even after their subscription is cancelled or deleted in LemonSqueezy. During testing on the BB8 Studio account, deleting a subscription in LemonSqueezy did not trigger database updates or revoke user access, creating a critical security gap.

### Root Causes

1. **Missing `subscription_deleted` Webhook Handler**:
   - LemonSqueezy fires `subscription_deleted` event when subscription is permanently removed
   - Current webhook handler only processes `subscription_cancelled` (grace period cancellation)
   - `subscription_deleted` events are logged as "skipped" instead of being processed
   - No handler exists in [route.ts:90-138](app/api/webhooks/lemonsqueezy/route.ts#L90-L138)

2. **LemonSqueezy Dashboard Configuration Gap**:
   - `subscription_deleted` event may not be enabled in webhook settings
   - Need to verify Settings » Webhooks in LemonSqueezy dashboard
   - Missing events: `subscription_deleted`, `subscription_unpaused`

3. **No Reactive Access Control**:
   - System relies on proactive seat limit checks when inviting new users
   - No enforcement preventing existing users from accessing after cancellation
   - Users can continue using system even with `current_seats = 0`

4. **No Auto-Archival on Downgrade**:
   - Archive system fully implemented but not triggered automatically
   - Users marked for removal only get archived at next renewal
   - No immediate archival when subscription cancelled/deleted

### Solution

**Multi-Layer Protection Approach:**

1. **Fix Missing Webhook Handlers**:
   - Add `subscription_deleted` event handler to webhook route
   - Add `subscription_unpaused` event handler (bonus fix)
   - Implement `processSubscriptionDeleted()` in handlers.ts
   - Log all events to `billing_events` audit table

2. **Auto-Archival on Cancellation/Deletion**:
   - When subscription cancelled or deleted, automatically archive users exceeding free tier
   - **Smart Downgrade Logic**: Keep 3 users active (free tier limit):
     - Always keep organization owner
     - Keep up to 2 additional admins/managers (prioritized by role)
     - Archive all remaining users
   - Organization seamlessly downgrades to free tier (`subscription_tier = 'free'`)
   - Archived users can be reactivated later (charges at next renewal)

3. **Reconciliation Safety Net**:
   - Enhance existing daily cron job at `/api/cron/reconcile-subscriptions`
   - Fetch subscription status from LemonSqueezy API for all organizations
   - Compare with database: status, seats, product_id, renewal dates
   - Auto-correct discrepancies (database out of sync with LemonSqueezy)
   - Trigger archival if subscription found cancelled/deleted remotely
   - Creates comprehensive audit trail in `billing_events` table

4. **LemonSqueezy Dashboard Configuration**:
   - Document required webhook event subscriptions
   - Verification checklist for production deployment
   - Ensure these events are enabled:
     - subscription_created ✓
     - subscription_updated ✓
     - subscription_cancelled ✓
     - **subscription_deleted** ← CRITICAL (currently missing)
     - subscription_expired ✓
     - subscription_paused ✓
     - subscription_resumed ✓
     - **subscription_unpaused** ← ADD THIS
     - subscription_payment_success ✓
     - subscription_payment_failed ✓

### Expected Behavior

**When Subscription Cancelled:**
- Webhook fires `subscription_cancelled` event
- System marks subscription as cancelled, sets `ends_at` date
- If organization has > 3 users:
  - Keeps owner + 2 admins/managers active
  - Archives all remaining users immediately
- Organization reverts to free tier (`subscription_tier = 'free'`, `paid_seats = 0`)
- Archived users lose access immediately (middleware blocks `is_active = false`)

**When Subscription Deleted:**
- Webhook fires `subscription_deleted` event
- Same auto-archival logic as cancellation
- Database updated to reflect deletion status
- Comprehensive logging to `billing_events` table

**Daily Reconciliation (3 AM UTC):**
- Cron job fetches all subscriptions from LemonSqueezy API
- Detects organizations where database doesn't match LemonSqueezy
- Auto-fixes mismatches (status, seats, product changes)
- Triggers archival for any missed cancellations/deletions
- Creates alerts for manual review if needed

### Integration with Existing Archive System

The auto-archival leverages the fully-built archive infrastructure:
- User states: `active`, `pending_removal`, `archived` (enum in database)
- Archived users: `is_active = false` (blocked by middleware)
- Seat calculations exclude archived users automatically
- Admin UI available for viewing/restoring archived users
- Reactivation available anytime (charges for seat at next renewal)

## Work Mode Column Migration Conflict (Production Blocker)

### Problem

**CRITICAL:** Production workspace creation is completely broken due to conflicting database schema from two work mode migrations. Organizations cannot be created, blocking all new user signups.

**Error in Production:**
```
new row for relation "organizations" violates check constraint "organizations_work_schedule_type_check"
Failing row contains (..., monday_to_friday, ["monday", "tuesday", "wednesday", "thursday", "friday"], ...)
```

### Root Cause

Two migrations created **conflicting columns** with incompatible value constraints:

**Migration 1 (Nov 3, 2025):** `20251103132613_add_work_modes_to_organizations.sql`
- Created `work_mode` column
- Allowed values: `'monday_to_friday'` | `'multi_shift'`
- Set default: `'monday_to_friday'`
- Added CHECK constraint

**Migration 2 (Nov 17, 2025):** `20251117113000_add_work_schedule_config.sql`
- Created `work_schedule_type` column
- Allowed values: `'daily'` | `'multi_shift'`
- Set default: `'daily'`
- Added CHECK constraint
- **Did NOT remove or migrate the old `work_mode` column**

**What's Happening:**
- Both columns exist simultaneously in production database
- Code tries to maintain both columns (backward compatibility attempt)
- When creating organization, old default `work_mode = 'monday_to_friday'` triggers
- System attempts to sync this to `work_schedule_type`
- Value `'monday_to_friday'` violates new constraint (only allows `'daily'` or `'multi_shift'`)
- **Organization creation fails with constraint violation**

### Affected Code (12 Files)

**Files still referencing OLD column (`work_mode`):**
1. [app/api/admin/settings/work-mode/route.ts](app/api/admin/settings/work-mode/route.ts#L36) - Updates both columns
2. [lib/validations/work-mode.ts](lib/validations/work-mode.ts#L15) - Maps between old/new values
3. [lib/auth-utils-v2.ts](lib/auth-utils-v2.ts#L46) - Type definitions for both
4. [app/admin/settings/components/WorkModeSettings.tsx](app/admin/settings/components/WorkModeSettings.tsx#L19) - Old type in props
5. [hooks/use-admin-mutations.ts](hooks/use-admin-mutations.ts#L13) - Old payload type
6. [types/leave.ts](types/leave.ts) - References old values
7. Plus 6 test/component files

**Value Mapping Issue:**
```typescript
// lib/validations/work-mode.ts (line 201)
workMode: body.work_mode === 'multi_shift'
  ? 'multi_shift'
  : 'monday_to_friday',  // ← Tries to set this in NEW column
```

### Solution

**Two-Phase Migration Fix:**

**Phase 1: Database Cleanup Migration**
- Migrate `'monday_to_friday'` → `'daily'` in `work_schedule_type` for any rows needing it
- Drop old `work_mode` column and its constraint
- Ensure all organizations have valid `work_schedule_type`

**Phase 2: Code Cleanup (12 files)**
- Remove all references to `work_mode` column from API endpoints
- Remove mapping logic between old and new values
- Update type definitions to only use `WorkScheduleType`
- Update components and hooks to only use new column
- Remove old column from all SELECT queries
- Update validation logic to only handle new values
- Fix tests to use new column/values

**Impact:**
- Fixes organization creation (CRITICAL - production blocker)
- Aligns codebase with Nov 17 Tryby Pracy spec implementation
- Removes technical debt from dual-column maintenance
- Ensures consistency with Figma-aligned admin settings UI

### Expected Behavior After Fix

**Organization Creation:**
- New organizations created with `work_schedule_type = 'daily'` (default)
- No `work_mode` column exists
- No constraint violations
- Workspace creation succeeds

**Admin Settings - Tryb Pracy Tab:**
- UI shows "Praca codzienna" (daily) or "Praca według grafiku" (multi-shift)
- API updates only `work_schedule_type` column
- Values are `'daily'` or `'multi_shift'` only
- Full compatibility with Figma design implementation

**Backward Compatibility:**
- Existing organizations with old `work_mode` data migrated to new column
- Calendar and dashboard use `work_schedule_type` exclusively
- No code references to deprecated column

## Out of Scope

- Yearly→monthly downgrade functionality (blocked until renewal)
- Automatic refund/credit handling for yearly users (LemonSqueezy doesn't support this on cancellation)
- Migration of existing subscriptions (handled manually or through separate script)
- Customer portal switching (same limitation applies)

## Expected Deliverable

### Critical Bug Fixes Verified
1. Billing period correctly saved and displayed (monthly shows as monthly, yearly shows as yearly)
2. Seat count displays accurate user count ("1 z 3 miejsc" for first user on free tier)
3. "Upgrade to paid plan" button redirects to subscription management page
4. Monthly plan users can see and select monthly option in update-subscription page
5. Webhook properly processes and saves billing period from checkout custom_data

### Original Two-Product Migration Features
1. Monthly users can successfully upgrade to yearly billing with seat count preserved through checkout flow
2. Yearly→monthly switch is visually disabled in UI with clear messaging about renewal date
3. Database tracks both `lemonsqueezy_product_id` and `lemonsqueezy_variant_id` for all subscriptions
4. Webhooks properly handle upgrade flow by canceling old monthly subscription after yearly is created
