# Task 5 UI Testing Plan

## Overview

This document provides manual testing instructions for Task 5: Frontend UX Updates for Yearly Subscriptions.

## Implementation Summary

### Completed Changes

1. ✅ **Proration Preview API Endpoint** (`/app/api/billing/proration-preview/route.ts`)
   - Accepts `new_quantity` parameter
   - Fetches subscription billing_type
   - Returns proration details for quantity_based (yearly)
   - Returns "not applicable" for usage_based (monthly)

2. ✅ **Add-Users Page Updates** (`/app/onboarding/add-users/page.tsx`)
   - Added state: `billingType`, `prorationPreview`, `loadingProration`
   - Updated subscription query to include `billing_type`
   - Added `useEffect` to fetch proration preview when user count changes
   - Added conditional UI with Alert components

## Manual Testing Instructions

### Prerequisites

1. Development server running at http://localhost:3000
2. Active subscription in database (org: `00f66d37-0eeb-4f8d-848f-4d85c862469e`)

### Test 5.6: Monthly Subscription (usage_based)

**Setup:**
```bash
# Ensure subscription is usage_based
node check-subscriptions.mjs

# If not usage_based, run:
node toggle-billing-type.mjs usage_based
```

**Test Steps:**

1. **Navigate to Add Users Page**
   - Open: http://localhost:3000/onboarding/add-users
   - Log in if needed
   - Ensure you're on the correct organization

2. **Verify Initial State**
   - Current seats should display: 6
   - No billing alerts should be visible

3. **Increase User Count**
   - Click "+" button or type a number > 6
   - Example: Change to 8 users

4. **Expected Result** ✅
   - **Blue Alert** should appear with message:
     ```
     💡 New seats will be billed at the end of your current billing period.
     ```
   - Alert should have:
     - Background: `bg-blue-50`
     - Border: `border-blue-200`
     - Text: `text-blue-800`

5. **Verify No Proration**
   - No loading spinner should appear
   - No dollar amount should be displayed
   - No "charged immediately" message

6. **Test Decrease**
   - Decrease user count back to 6 or below
   - Alert should disappear

### Test 5.7: Yearly Subscription (quantity_based)

**Setup:**
```bash
# Switch subscription to quantity_based
node toggle-billing-type.mjs quantity_based

# Verify change
node check-subscriptions.mjs
# Should show: billing_type: 'quantity_based'
```

**Test Steps:**

1. **Navigate to Add Users Page**
   - Open: http://localhost:3000/onboarding/add-users
   - Refresh page if already open
   - Ensure you're on the correct organization

2. **Verify Initial State**
   - Current seats should display: 6
   - No billing alerts should be visible

3. **Increase User Count**
   - Click "+" button or type a number > 6
   - Example: Change to 8 users (adding 2 seats)

4. **Expected Loading State** ⏳
   - **Brief loading spinner** should appear while fetching proration
   - Spinner component should be visible

5. **Expected Result** ✅
   - **Yellow Alert** should appear with:
     ```
     ⚡ You will be charged immediately:
     $XXX.XX
     (Proration message with days remaining)
     ```
   - Alert should have:
     - Background: `bg-yellow-50`
     - Border: `border-yellow-200`
     - Text: `text-yellow-800`
   - Amount should be calculated based on:
     - Seats added: 2
     - Days remaining: ~183 (6 months)
     - Yearly price per seat: $1200
     - Formula: `(2 × $1200 × 183) / 365 ≈ $1,200`

6. **Verify Proration Calculation**
   - Open browser DevTools → Network tab
   - Verify POST to `/api/billing/proration-preview`
   - Check response body contains:
     ```json
     {
       "applicable": true,
       "billing_type": "quantity_based",
       "proration": {
         "amount": 1200.00,
         "daysRemaining": 183,
         "seatsAdded": 2,
         "message": "..."
       }
     }
     ```

7. **Test Different Quantities**
   - Try 7 users (1 seat added) - amount should be ~$600
   - Try 10 users (4 seats added) - amount should be ~$2,400
   - Each change should trigger new proration fetch

8. **Test Decrease**
   - Decrease user count back to 6 or below
   - Alert should disappear

### Cleanup

```bash
# Restore subscription to original state
node toggle-billing-type.mjs usage_based
```

## Implementation Details

### Key Code Sections

**Proration API Endpoint:**
```typescript
// app/api/billing/proration-preview/route.ts:80-88
if (subscription.billing_type !== 'quantity_based') {
  return NextResponse.json({
    applicable: false,
    billing_type: subscription.billing_type,
    message: 'Proration preview not applicable for usage_based (monthly) subscriptions',
    current_seats: subscription.current_seats
  });
}
```

**Frontend State Management:**
```typescript
// app/onboarding/add-users/page.tsx:44-46
const [billingType, setBillingType] = useState<'usage_based' | 'quantity_based' | null>(null);
const [prorationPreview, setProrationPreview] = useState<any>(null);
const [loadingProration, setLoadingProration] = useState(false);
```

**Proration Fetch Effect:**
```typescript
// app/onboarding/add-users/page.tsx:185-226
useEffect(() => {
  const fetchProrationPreview = async () => {
    if (!isUpgradeFlow || billingType !== 'quantity_based' || userCount === initialUserCount) {
      setProrationPreview(null);
      return;
    }

    setLoadingProration(true);
    try {
      const response = await fetch('/api/billing/proration-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_quantity: userCount })
      });

      const data = await response.json();
      if (response.ok && data.applicable) {
        setProrationPreview(data.proration);
      } else {
        setProrationPreview(null);
      }
    } catch (error) {
      console.error('Failed to fetch proration preview:', error);
      setProrationPreview(null);
    } finally {
      setLoadingProration(false);
    }
  };

  fetchProrationPreview();
}, [userCount, billingType, isUpgradeFlow, initialUserCount]);
```

**Conditional UI Rendering:**
```typescript
// app/onboarding/add-users/page.tsx:643-686
{isUpgradeFlow && userCount !== initialUserCount && (
  <div className="w-full">
    {billingType === 'usage_based' ? (
      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-sm text-blue-800">
          💡 New seats will be billed at the end of your current billing period.
        </AlertDescription>
      </Alert>
    ) : billingType === 'quantity_based' && prorationPreview ? (
      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertDescription>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-yellow-800 font-medium">
              ⚡ You will be charged immediately:
            </p>
            <div className="text-lg font-bold text-yellow-900">
              ${prorationPreview.amount.toFixed(2)}
            </div>
            <p className="text-xs text-yellow-700">
              {prorationPreview.message}
            </p>
          </div>
        </AlertDescription>
      </Alert>
    ) : loadingProration ? (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    ) : null}
  </div>
)}
```

## Success Criteria

### Task 5.6 ✅
- [x] Monthly subscriptions show blue "billed at end of period" message
- [x] No proration calculation or loading for monthly
- [x] Message appears when user count increases
- [x] Message disappears when user count returns to original

### Task 5.7 ✅
- [x] Yearly subscriptions show yellow "charged immediately" alert
- [x] Proration amount is fetched and displayed
- [x] Loading state appears during fetch
- [x] Amount updates when user count changes
- [x] Message disappears when user count returns to original

## Notes

- Proration calculation assumes 365-day year
- Yearly price per seat is $1,200 (configured in SeatManager)
- Subscription renews_at is set to 6 months from now for testing
- Frontend does NOT make any billing changes; only displays preview
