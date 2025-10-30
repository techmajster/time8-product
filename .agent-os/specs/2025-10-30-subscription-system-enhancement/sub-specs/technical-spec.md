# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-10-30-subscription-system-enhancement/spec.md

## Technical Requirements

### 1. Webhook Handler Implementation

**File:** `app/api/webhooks/lemonsqueezy/handlers.ts`

#### New Event Handler: subscription_payment_failed
- **Input:** LemonSqueezy webhook payload with payment failure details
- **Processing:**
  - Log event to `billing_events` table (idempotency check first)
  - Update subscription status to reflect payment failure
  - Record failure reason and attempted_at timestamp
- **Output:** Event logged, subscription status updated
- **Error Handling:** Return 200 even on duplicate events, log errors for investigation

#### New Event Handler: subscription_paused
- **Input:** LemonSqueezy webhook payload when user pauses via portal
- **Processing:**
  - Log event to `billing_events` table
  - Update subscription status to `paused`
  - Record pause_initiated_at timestamp
- **Output:** Subscription status set to paused
- **Error Handling:** Handle idempotency, return appropriate status codes

#### New Event Handler: subscription_resumed
- **Input:** LemonSqueezy webhook payload when user resumes paused subscription
- **Processing:**
  - Log event to `billing_events` table
  - Update subscription status to `active`
  - Clear pause timestamps
- **Output:** Subscription reactivated
- **Error Handling:** Verify subscription exists before resume

**File:** `app/api/webhooks/lemonsqueezy/route.ts`
- Add new event types to switch statement:
  - `subscription_payment_failed`
  - `subscription_paused`
  - `subscription_resumed`
- Route to appropriate handlers

---

### 2. UI Status Display

**File:** `app/admin/settings/components/AdminSettingsClient.tsx`

#### Status Badge Component Enhancement
- Add rendering for `on_trial` status:
  - Badge color: Blue/Info variant
  - Icon: Clock or trial icon
  - Translation key: `subscription.status.on_trial`

- Add rendering for `expired` status:
  - Badge color: Red/Destructive variant
  - Icon: X or expired icon
  - Translation key: `subscription.status.expired`

#### Trial Countdown Banner
- **Display Condition:** `subscription.status === 'on_trial' && trial_ends_at exists`
- **Content:**
  - Calculate days remaining: `Math.ceil((trial_ends_at - now) / (1000 * 60 * 60 * 24))`
  - Show message: "X days remaining in your trial"
  - Display upgrade CTA button
- **Styling:**
  - Banner positioned at top of settings page
  - Blue/info background
  - Responsive design (mobile + desktop)
- **Urgency Thresholds:**
  - >7 days: Informational tone
  - 3-7 days: Prominent CTA
  - <3 days: Urgent messaging, larger CTA

#### Context-Aware Actions
- **on_trial status:** "Upgrade to Paid Plan" CTA
- **past_due status:** "Update Payment Method" CTA
- **paused status:** "Resume Subscription" CTA (via portal)
- **expired status:** "Reactivate Subscription" CTA
- **cancelled status:** "Restart Subscription" CTA

---

### 3. Translation Updates

**Files:** `messages/en.json`, `messages/pl.json`

#### New Translation Keys

**English (en.json):**
```json
{
  "subscription": {
    "status": {
      "on_trial": "Trial",
      "expired": "Expired"
    },
    "trial": {
      "banner_title": "Trial Period",
      "days_remaining": "{days} days remaining in your trial",
      "day_remaining": "1 day remaining in your trial",
      "hours_remaining": "Less than 24 hours remaining",
      "upgrade_cta": "Upgrade to Paid Plan",
      "expired_message": "Your trial has expired"
    },
    "payment": {
      "failed_message": "Payment failed - please update your payment method",
      "update_payment_cta": "Update Payment Method"
    },
    "paused": {
      "message": "Subscription is paused",
      "resume_cta": "Resume Subscription"
    }
  }
}
```

**Polish (pl.json):**
```json
{
  "subscription": {
    "status": {
      "on_trial": "Okres próbny",
      "expired": "Wygasł"
    },
    "trial": {
      "banner_title": "Okres próbny",
      "days_remaining": "Pozostało {days} dni okresu próbnego",
      "day_remaining": "Pozostał 1 dzień okresu próbnego",
      "hours_remaining": "Pozostało mniej niż 24 godziny",
      "upgrade_cta": "Przejdź na plan płatny",
      "expired_message": "Twój okres próbny wygasł"
    },
    "payment": {
      "failed_message": "Płatność nie powiodła się - zaktualizuj metodę płatności",
      "update_payment_cta": "Zaktualizuj metodę płatności"
    },
    "paused": {
      "message": "Subskrypcja jest wstrzymana",
      "resume_cta": "Wznów subskrypcję"
    }
  }
}
```

---

### 4. Database Schema

**No new tables or columns required.**

Existing schema already supports:
- `subscriptions.status` - Stores all 7 status types
- `subscriptions.trial_ends_at` - Stores trial expiration timestamp
- `billing_events` - Logs all webhook events (including new types)

**Existing columns used:**
- `status` (TEXT) - Values: active, on_trial, paused, past_due, cancelled, expired, unpaid
- `trial_ends_at` (TIMESTAMP)
- `pause_initiated_at` (TIMESTAMP) - For tracking when pause occurred
- `billing_events.event_name` - Will store: subscription_payment_failed, subscription_paused, subscription_resumed

---

### 5. Testing Requirements

#### Webhook Handler Tests
**File:** `__tests__/billing/webhook-subscription-events.test.ts`

Test cases for each new handler:
1. **subscription_payment_failed:**
   - Processes payment failure correctly
   - Logs to billing_events table
   - Handles idempotency (duplicate events)
   - Updates subscription status appropriately
   - Returns 200 status

2. **subscription_paused:**
   - Updates status to paused
   - Logs event
   - Handles already paused subscriptions

3. **subscription_resumed:**
   - Reactivates subscription
   - Clears pause timestamps
   - Handles non-existent subscriptions

#### UI Status Display Tests
**File:** `__tests__/billing/subscription-display-logic.test.ts`

Test cases for UI components:
1. **on_trial status badge** renders correctly
2. **expired status badge** renders correctly
3. **Trial countdown banner:**
   - Shows correct days remaining
   - Shows urgency at different thresholds
   - Hides when not on trial
4. **Context-aware CTAs** display for each status
5. **Translation keys** are used correctly

---

### 6. Performance Considerations

- **Webhook processing:** Already idempotent with `isEventAlreadyProcessed()` check
- **UI rendering:** Trial countdown calculated client-side, no additional API calls
- **Database queries:** No new queries, only updates to existing subscription records

---

### 7. Security Considerations

- **Webhook validation:** Already implemented (signature verification)
- **Auth checks:** Status display only visible to admins (existing RLS)
- **Customer portal access:** Only organization admins can access portal URL

---

## External Dependencies

**None.** All functionality uses existing integrations:
- LemonSqueezy API (already integrated)
- Webhook infrastructure (already in place)
- UI component library (shadcn/ui - already installed)
- Translation system (next-intl - already configured)
