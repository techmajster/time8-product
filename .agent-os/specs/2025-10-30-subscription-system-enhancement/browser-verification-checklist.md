# Browser Verification Checklist - Task 3.8

## Date: 2025-10-31
## Purpose: Verify subscription status displays work correctly in browser

---

## Prerequisites
- ✅ Development server running on localhost
- ✅ User logged in with admin access
- ✅ Access to Admin Settings > Billing tab

---

## Test Scenarios

### 1. Trial Status (on_trial) Display

**Setup Required:**
- Subscription with `status: 'on_trial'`
- `trial_ends_at` date in the future

**What to Verify:**

#### Status Badge
- [ ] Badge displays with text "Trial" (English) or "Okres próbny" (Polish)
- [ ] Badge has blue styling: `bg-blue-100 text-blue-800 border-blue-200`
- [ ] Badge is positioned correctly in the Billing Information card

#### Trial Countdown Banner
- [ ] Banner appears at the top of the Billing tab
- [ ] Banner title shows "Trial Period" (English) or "Okres próbny" (Polish)
- [ ] Days remaining message displays correctly:
  - >3 days: Blue styling (`bg-blue-50 border-blue-200`)
  - ≤3 days: Red styling (`bg-red-50 border-red-200`)
  - 1 day: Shows "1 day remaining" message
  - 0 days: Shows "Less than 24 hours remaining" message

#### Call-to-Action
- [ ] "Upgrade to Paid Plan" button displays in banner
- [ ] Button has blue background for >3 days remaining
- [ ] Button has red background for ≤3 days remaining
- [ ] Button links to `/onboarding/add-users?upgrade=true`
- [ ] CTA section in Billing Information card shows "Upgrade to Paid Plan" button
- [ ] Days remaining text displays below CTA button

#### Language Switching
- [ ] Switch to Polish - all text translates correctly
- [ ] Switch back to English - all text displays correctly

---

### 2. Expired Status Display

**Setup Required:**
- Subscription with `status: 'expired'`
- `trial_ends_at` date in the past

**What to Verify:**

#### Status Badge
- [ ] Badge displays with text "Expired" (English) or "Wygasł" (Polish)
- [ ] Badge has red styling: `bg-red-100 text-red-800 border-red-200`
- [ ] Badge is positioned correctly in the Billing Information card

#### Trial Banner
- [ ] Trial countdown banner does NOT display (only shows for on_trial status)

#### Call-to-Action
- [ ] "Reactivate Subscription" button displays in Billing Information card
- [ ] Button has red background (`bg-red-600 hover:bg-red-700`)
- [ ] Message shows "Your trial has expired" below button
- [ ] Button links to `/onboarding/add-users`

#### Language Switching
- [ ] Switch to Polish - all text translates correctly
- [ ] Switch back to English - all text displays correctly

---

### 3. Paused Status Display

**Setup Required:**
- Subscription with `status: 'paused'`

**What to Verify:**

#### Status Badge
- [ ] Badge displays with text "Paused" (English) or "Wstrzymany" (Polish)
- [ ] Badge has orange/yellow styling
- [ ] Badge is positioned correctly

#### Call-to-Action
- [ ] "Resume Subscription" button displays
- [ ] Button has orange background (`bg-orange-600 hover:bg-orange-700`)
- [ ] Message shows "Subscription is paused" below button
- [ ] Button opens customer portal when clicked

#### Language Switching
- [ ] Switch to Polish - "Wznów subskrypcję" button displays
- [ ] Switch back to English - "Resume Subscription" displays

---

### 4. Past Due Status Display

**Setup Required:**
- Subscription with `status: 'past_due'`

**What to Verify:**

#### Status Badge
- [ ] Badge displays with text "Payment Failed" (English) or "Płatność nieudana" (Polish)
- [ ] Badge has red styling

#### Call-to-Action
- [ ] "Update Payment Method" button displays
- [ ] Button has red background (`bg-red-600 hover:bg-red-700`)
- [ ] Error message shows "Your payment failed..."
- [ ] Button opens customer portal when clicked

---

### 5. Active Status Display (Control Test)

**Setup Required:**
- Subscription with `status: 'active'`

**What to Verify:**

#### Status Badge
- [ ] Badge displays with text "Active" (English) or "Aktywny" (Polish)
- [ ] Badge has green styling: `bg-green-100 text-green-800 border-green-200`

#### Trial Banner
- [ ] Trial countdown banner does NOT display

---

## Manual Testing Instructions

### To Test Trial Status (on_trial):

Since you're using LemonSqueezy test mode, you can:

1. **Create a test subscription with trial:**
   - Use LemonSqueezy dashboard to create a test subscription with trial period
   - OR manually update database for testing:
   ```sql
   UPDATE subscriptions
   SET status = 'on_trial',
       trial_ends_at = NOW() + INTERVAL '7 days'
   WHERE organization_id = 'your-org-id';
   ```

2. **Test different trial durations:**
   - 7+ days remaining (blue styling)
   - 3 days remaining (red styling)
   - 1 day remaining (specific message)
   - 0 days remaining (hours message)

### To Test Expired Status:

```sql
UPDATE subscriptions
SET status = 'expired',
    trial_ends_at = NOW() - INTERVAL '5 days'
WHERE organization_id = 'your-org-id';
```

### To Test Paused Status:

```sql
UPDATE subscriptions
SET status = 'paused'
WHERE organization_id = 'your-org-id';
```

### To Test Past Due Status:

```sql
UPDATE subscriptions
SET status = 'past_due'
WHERE organization_id = 'your-org-id';
```

---

## Verification Results

### Summary
- **Test Date:** _____________
- **Browser Used:** _____________
- **Tests Passed:** _____ / 50+
- **Tests Failed:** _____
- **Issues Found:** _____

### Issues / Notes
_Document any issues, styling problems, or unexpected behavior here_

---

## Sign-off

Task 3.8 is complete when:
- [ ] All status badges display correctly for all 7 statuses
- [ ] Trial countdown banner displays correctly with proper styling
- [ ] All CTAs appear and link to correct destinations
- [ ] All translations work in both English and Polish
- [ ] No console errors appear in browser
- [ ] Layout looks correct on desktop and mobile

**Verified by:** _____________
**Date:** _____________
