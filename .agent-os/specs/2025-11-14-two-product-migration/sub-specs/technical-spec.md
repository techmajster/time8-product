# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-11-14-two-product-migration/spec.md

## Technical Requirements

### Architecture Change

- **From**: Single product with two variants (monthly 972634, yearly 972635) using PATCH `/subscriptions/:id` to change `variant_id`
- **To**: Two separate products (monthly 621389, yearly 693341) using cancel + create checkout flow for switching

### Database Schema

- Add `lemonsqueezy_product_id` VARCHAR column to `subscriptions` table (nullable for backward compatibility)
- Populate existing records with product ID based on variant mapping:
  - Variant 972634 → Product 621389 (monthly)
  - Variant 972635 → Product 693341 (yearly, legacy - will be migrated to 1090954)
  - Variant 1090954 → Product 693341 (yearly, new)

### API Endpoints

#### New: `/api/billing/switch-to-yearly`

**Method**: POST
**Authentication**: Required (user must belong to organization)
**Request Body**: None (uses current subscription seats)
**Response**:
```json
{
  "checkout_url": "https://time8.lemonsqueezy.com/checkout/...",
  "current_seats": 5,
  "old_subscription_id": "1638258"
}
```

**Logic**:
1. Verify user has active monthly subscription
2. Get current seat count from `subscriptions.current_seats`
3. Cancel current monthly subscription (DELETE `/subscriptions/:id`)
4. Create yearly checkout with custom_data containing:
   - `migration_from_subscription_id`: old subscription ID
   - `preserve_seats`: current seat count
   - `organization_id`: current organization
5. Return checkout URL for user redirect

#### Modified: `/api/billing/change-billing-period`

**Change**: Add validation to reject yearly→monthly switches:

```typescript
// After line 69 (fetching subscription)
if (subscription.lemonsqueezy_product_id === process.env.LEMONSQUEEZY_YEARLY_PRODUCT_ID &&
    new_variant_id.toString() === process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID) {
  return NextResponse.json(
    {
      error: 'Cannot switch from yearly to monthly',
      message: 'Yearly→monthly switching is only available at renewal. Please wait until your subscription renews.',
      renewal_date: subscription.renews_at // TODO: fetch from LemonSqueezy API
    },
    { status: 400 }
  );
}
```

### Webhook Updates

#### `subscription_created` Handler (lib/lemonsqueezy/handlers.ts)

**Current**: Saves `variant_id` only
**Required**: Also save `product_id` from webhook payload

Add after line where `lemonsqueezy_variant_id` is extracted:
```typescript
const productId = eventBody.data.attributes.product_id.toString();
```

Update database insert to include:
```typescript
lemonsqueezy_product_id: productId
```

**Migration Flow Detection**:
```typescript
// Check if this is a migration from monthly→yearly
const customData = eventBody.meta.custom_data;
if (customData?.migration_from_subscription_id) {
  // This is an upgrade - cancel the old monthly subscription
  await fetch(
    `https://api.lemonsqueezy.com/v1/subscriptions/${customData.migration_from_subscription_id}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        'Accept': 'application/vnd.api+json'
      }
    }
  );

  // Mark old subscription as migrated in database
  await supabase
    .from('subscriptions')
    .update({
      status: 'migrated',
      migrated_to_subscription_id: newSubscriptionId
    })
    .eq('lemonsqueezy_subscription_id', customData.migration_from_subscription_id);
}
```

### UI/UX Specifications

#### Update Subscription Page (NEW: `app/onboarding/update-subscription/page.tsx`)

**Purpose**: Unified page for managing seats and billing period for existing subscriptions

**Page Structure**:
```tsx
// Seat counter
<SeatControls>
  <Button onClick={() => adjustSeats(-1)}>-</Button>
  <Input value={seats} />
  <Button onClick={() => adjustSeats(+1)}>+</Button>
</SeatControls>

// Pricing cards
<PricingCards>
  <MonthlyCard />
  <YearlyCard />
</PricingCards>

<Button onClick={handleUpdateSubscription}>Update Subscription</Button>
```

**For Monthly Users**:
- Both pricing cards selectable and enabled
- Can select yearly card to upgrade
- Can adjust seats independently

**Logic Flow for Monthly Users**:
```typescript
const handleUpdateSubscription = async () => {
  const tierChanged = selectedTier !== currentTier
  const seatsChanged = newSeats !== currentSeats

  if (currentTier === 'monthly' && selectedTier === 'yearly') {
    // Upgrade to yearly - redirect to checkout
    const response = await fetch('/api/billing/switch-to-yearly', {
      method: 'POST',
      body: JSON.stringify({ seats: newSeats })
    })
    const { checkout_url } = await response.json()
    window.location.href = checkout_url
  } else if (seatsChanged && !tierChanged) {
    // Just update seats via API
    await fetch('/api/billing/update-subscription-quantity', {
      method: 'POST',
      body: JSON.stringify({ new_quantity: newSeats })
    })
    router.push('/admin/settings?tab=billing')
  }
}
```

**For Yearly Users**:
- Banner displayed at top of page
- Monthly card locked/disabled with lock icon
- Tooltip on monthly card: "Available after renewal"
- Can only adjust seat quantity

**Banner Component**:
```tsx
<Alert variant="info" className="mb-6">
  <Lock className="h-4 w-4" />
  <AlertDescription>
    🔒 Switching to monthly is only available at renewal (after {formatDate(renewalDate)})
  </AlertDescription>
</Alert>
```

**Locked Card Styling**:
```tsx
<div className={`
  ${isYearlyUser ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
  ${tier === 'monthly' && isYearlyUser && 'relative'}
`}>
  {isYearlyUser && tier === 'monthly' && (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/20 rounded-xl">
      <Lock className="h-8 w-8 text-gray-600" />
    </div>
  )}
  {/* Card content */}
</div>
```

**Logic Flow for Yearly Users**:
```typescript
const handleUpdateSubscription = async () => {
  if (currentTier === 'yearly' && selectedTier === 'monthly') {
    // Blocked - should never reach here due to UI disabling
    toast.error('Cannot switch to monthly until renewal')
    return
  }

  if (seatsChanged) {
    await fetch('/api/billing/update-subscription-quantity', {
      method: 'POST',
      body: JSON.stringify({ new_quantity: newSeats })
    })
    router.push('/admin/settings?tab=billing')
  }
}
```

#### Admin Settings Billing Tab (`app/admin/settings/components/AdminSettingsClient.tsx`)

**Change**: Replace two buttons with single "Manage Subscription" button

```typescript
// OLD (lines 1419-1436):
<Button onClick={handleManageSeatSubscription}>Manage Seats</Button>
{subscriptionData && (
  <Button onClick={handleChangeBillingPeriod}>Change Billing Period</Button>
)}

// NEW:
<Button onClick={handleManageSubscription}>Manage Subscription</Button>
```

**Handler Implementation**:
```typescript
const handleManageSubscription = () => {
  if (!currentOrganization?.id) return
  const currentSeats = getSeatUsage().total
  window.location.href = `/onboarding/update-subscription?current_org=${currentOrganization.id}&seats=${currentSeats}`
}

// Remove these handlers:
// - handleManageSeatSubscription (line 471-477)
// - handleChangeBillingPeriod (line 480-486)
```

#### Add Users Onboarding Page (`app/onboarding/add-users/page.tsx`)

**Simplified**: Remove all upgrade flow logic, keep only new workspace creation

**Changes**:
1. Remove `isUpgradeFlow` state and related logic (lines 28, 54-109)
2. Remove subscription fetching for existing workspaces (lines 75-104)
3. Remove billing period change handling (lines 312-365)
4. Remove proration preview logic (lines 169-206)
5. Update warning text (lines 612-616)

**New Warning Text**:
```typescript
<p className="text-xs text-blue-600 text-center font-medium">
  ℹ️ You can upgrade to yearly billing anytime from your settings.
  Yearly→monthly switching is only available at renewal.
</p>
```

### Environment Variables

Add to `.env.example` and `.env.local`:

```env
# LemonSqueezy Product IDs
LEMONSQUEEZY_MONTHLY_PRODUCT_ID=621389
LEMONSQUEEZY_YEARLY_PRODUCT_ID=693341

# LemonSqueezy Variant IDs (no change to monthly)
LEMONSQUEEZY_MONTHLY_VARIANT_ID=972634
LEMONSQUEEZY_YEARLY_VARIANT_ID=1090954  # Updated from 972635
```

### Performance Criteria

- Upgrade flow completes in <5 seconds (cancel + redirect)
- Webhook processing handles migration within 10 seconds
- No duplicate subscriptions created (idempotency via `migration_from_subscription_id` check)

### Error Handling

- **Checkout Creation Fails**: Show error, do NOT cancel monthly subscription
- **Old Subscription Cancel Fails**: Log warning but allow new subscription to activate (manual cleanup needed)
- **Webhook Missing custom_data**: Treat as normal new subscription (not migration)
- **User Refreshes During Upgrade**: Checkout URL is reusable, no duplicate cancellations

## External Dependencies

No new external dependencies required. All functionality uses existing:
- LemonSqueezy API (subscriptions, checkout)
- Supabase (database updates)
- Next.js API routes
