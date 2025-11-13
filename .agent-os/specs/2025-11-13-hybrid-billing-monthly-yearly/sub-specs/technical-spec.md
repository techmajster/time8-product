# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-11-13-hybrid-billing-monthly-yearly/spec.md

## Architecture Overview

### Current State (Monthly - Do Not Modify)
```
User adds seats
      ↓
POST /v1/usage-records
      ↓
Usage record created (quantity: new_count)
      ↓
Charged at end of billing period
```

### New State (Yearly - To Implement)
```
User adds seats
      ↓
PATCH /v1/subscription-items/{id}
(with invoice_immediately: true)
      ↓
Proration calculated by LemonSqueezy
      ↓
Charged immediately
```

### Routing Logic
```typescript
if (billingType === 'usage_based') {
  // Monthly path (existing - DO NOT MODIFY)
  await createUsageRecord(subscriptionItemId, newQuantity);
} else if (billingType === 'quantity_based') {
  // Yearly path (NEW - TO IMPLEMENT)
  await updateSubscriptionQuantity(subscriptionItemId, newQuantity, true);
}
```

## Technical Requirements

### 1. Database Schema Updates

**File**: `supabase/migrations/20251113000001_add_quantity_based_billing_type.sql`

**Requirements**:
- Add 'quantity_based' to billing_type CHECK constraint
- Keep existing 'usage_based' and 'volume' values
- Add comment explaining three billing types
- No data migration needed (only schema change)

**Expected enum values**:
```sql
CHECK (billing_type IN ('volume', 'usage_based', 'quantity_based'))
```

**Meanings**:
- `'volume'`: Legacy subscriptions (pre-migration, to be cleaned up)
- `'usage_based'`: Monthly subscriptions using usage records API
- `'quantity_based'`: Yearly subscriptions using quantity updates with immediate proration

### 2. Webhook Handler: subscription_created

**File**: `app/api/webhooks/lemonsqueezy/handlers.ts`

**Current Implementation** (simplified):
```typescript
async function handleSubscriptionCreated(payload) {
  const variantId = payload.data.attributes.variant_id;
  const subscriptionItemId = payload.data.attributes.first_subscription_item.id;
  const userCount = parseInt(customData.user_count);

  // Currently sets billing_type to 'usage_based' for all
  await createSubscription({
    billing_type: 'usage_based',
    lemonsqueezy_subscription_item_id: subscriptionItemId,
    // ...
  });

  // Creates usage record for all subscriptions
  await createUsageRecord(subscriptionItemId, userCount);
}
```

**Required Changes**:
```typescript
async function handleSubscriptionCreated(payload) {
  const variantId = payload.data.attributes.variant_id;
  const subscriptionItemId = payload.data.attributes.first_subscription_item.id;
  const userCount = parseInt(customData.user_count);

  // DETECT billing type based on variant
  let billingType: 'usage_based' | 'quantity_based';
  if (variantId === parseInt(process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID!)) {
    billingType = 'usage_based';
  } else if (variantId === parseInt(process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID!)) {
    billingType = 'quantity_based';
  } else {
    throw new Error(`Unknown variant ID: ${variantId}`);
  }

  console.log(`🎫 [Webhook] Detected billing type: ${billingType} for variant ${variantId}`);

  await createSubscription({
    billing_type: billingType,  // Now dynamic!
    lemonsqueezy_subscription_item_id: subscriptionItemId,
    // ...
  });

  // ONLY create usage record for monthly subscriptions
  if (billingType === 'usage_based') {
    console.log(`📊 [Webhook] Creating usage record for monthly subscription`);
    await createUsageRecord(subscriptionItemId, userCount);
  } else {
    console.log(`⏭️  [Webhook] Skipping usage record for yearly (quantity-based) subscription`);
  }
}
```

**Critical Points**:
- ✅ Detect billing_type from variant_id (monthly vs yearly)
- ✅ Store correct billing_type in database
- ✅ ONLY create usage record for monthly (usage_based)
- ✅ DO NOT create usage record for yearly (prevents double charging)
- ✅ Comprehensive logging for debugging

### 3. SeatManager Service (New File)

**File**: `lib/billing/seat-manager.ts`

**Purpose**: Centralized service for managing seats that routes to correct billing method

**Class Structure**:
```typescript
export class SeatManager {
  /**
   * Add seats to a subscription
   * Routes to correct method based on billing_type
   */
  async addSeats(subscriptionId: string, additionalSeats: number): Promise<SeatChangeResult>

  /**
   * Remove seats from a subscription
   * Routes to correct method based on billing_type
   */
  async removeSeats(subscriptionId: string, seatsToRemove: number): Promise<SeatChangeResult>

  /**
   * PRIVATE: Handle seat addition for usage-based (monthly) subscriptions
   */
  private async addSeatsUsageBased(subscription: Subscription, newQuantity: number): Promise<SeatChangeResult>

  /**
   * PRIVATE: Handle seat addition for quantity-based (yearly) subscriptions
   */
  private async addSeatsQuantityBased(subscription: Subscription, newQuantity: number): Promise<SeatChangeResult>

  /**
   * Calculate proration cost for UI display
   * Only applicable for quantity-based subscriptions
   */
  async calculateProration(subscriptionId: string, newQuantity: number): Promise<ProrationDetails>
}
```

**addSeatsUsageBased Implementation**:
```typescript
private async addSeatsUsageBased(
  subscription: Subscription,
  newQuantity: number
): Promise<SeatChangeResult> {
  console.log(`📊 [SeatManager] Adding seats via usage record (monthly)`, {
    subscriptionId: subscription.id,
    currentSeats: subscription.current_seats,
    newQuantity,
    billingType: 'usage_based'
  });

  // POST to usage records endpoint
  const response = await fetch(
    `https://api.lemonsqueezy.com/v1/subscription-items/${subscription.lemonsqueezy_subscription_item_id}/usage-records`,
    {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`
      },
      body: JSON.stringify({
        data: {
          type: 'usage-records',
          attributes: {
            quantity: newQuantity,
            action: 'set'  // CRITICAL: 'set' not 'increment'
          }
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ [SeatManager] Failed to create usage record:`, errorText);
    throw new Error(`Failed to create usage record: ${errorText}`);
  }

  const data = await response.json();
  console.log(`✅ [SeatManager] Usage record created:`, data);

  // Update local database
  await updateSubscriptionSeats(subscription.id, newQuantity);

  return {
    success: true,
    billingType: 'usage_based',
    chargedAt: 'end_of_period',
    message: 'New seats will be billed at end of current billing period',
    currentSeats: newQuantity
  };
}
```

**addSeatsQuantityBased Implementation**:
```typescript
private async addSeatsQuantityBased(
  subscription: Subscription,
  newQuantity: number
): Promise<SeatChangeResult> {
  console.log(`💰 [SeatManager] Adding seats via quantity update (yearly)`, {
    subscriptionId: subscription.id,
    currentSeats: subscription.current_seats,
    newQuantity,
    billingType: 'quantity_based'
  });

  // Calculate proration for logging
  const proration = await this.calculateProration(subscription.id, newQuantity);

  console.log(`💵 [SeatManager] Proration calculated:`, {
    amount: proration.amount,
    daysRemaining: proration.daysRemaining,
    seatsAdded: proration.seatsAdded
  });

  // PATCH to subscription-items endpoint
  const response = await fetch(
    `https://api.lemonsqueezy.com/v1/subscription-items/${subscription.lemonsqueezy_subscription_item_id}`,
    {
      method: 'PATCH',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`
      },
      body: JSON.stringify({
        data: {
          type: 'subscription-items',
          id: subscription.lemonsqueezy_subscription_item_id,
          attributes: {
            quantity: newQuantity,
            invoice_immediately: true  // CRITICAL: Charge now, not at renewal
          }
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ [SeatManager] Failed to update quantity:`, errorText);
    throw new Error(`Failed to update subscription quantity: ${errorText}`);
  }

  const data = await response.json();
  console.log(`✅ [SeatManager] Quantity updated:`, data);

  // Update local database
  await updateSubscriptionSeats(subscription.id, newQuantity);

  return {
    success: true,
    billingType: 'quantity_based',
    chargedAt: 'immediately',
    prorationAmount: proration.amount,
    daysRemaining: proration.daysRemaining,
    message: `You will be charged $${proration.amount} for ${proration.daysRemaining} remaining days`,
    currentSeats: newQuantity
  };
}
```

**calculateProration Implementation**:
```typescript
async calculateProration(
  subscriptionId: string,
  newQuantity: number
): Promise<ProrationDetails> {
  // Fetch subscription from database
  const subscription = await getSubscription(subscriptionId);

  if (!subscription) {
    throw new Error(`Subscription not found: ${subscriptionId}`);
  }

  if (subscription.billing_type !== 'quantity_based') {
    // Proration only applies to quantity-based (yearly) subscriptions
    return {
      amount: 0,
      daysRemaining: 0,
      seatsAdded: 0,
      message: 'Proration not applicable for usage-based subscriptions'
    };
  }

  // Fetch subscription details from LemonSqueezy for renews_at date
  const response = await fetch(
    `https://api.lemonsqueezy.com/v1/subscriptions/${subscription.lemonsqueezy_subscription_id}`,
    {
      headers: {
        'Accept': 'application/vnd.api+json',
        'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch subscription from LemonSqueezy`);
  }

  const data = await response.json();
  const renewsAt = new Date(data.data.attributes.renews_at);
  const now = new Date();

  // Calculate days remaining in current billing period
  const msRemaining = renewsAt.getTime() - now.getTime();
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
  const totalDays = 365; // Yearly subscription

  // Calculate seats added
  const seatsAdded = newQuantity - subscription.current_seats;

  if (seatsAdded <= 0) {
    // Removing seats - credit will be applied at renewal
    return {
      amount: 0,
      daysRemaining,
      seatsAdded: 0,
      message: 'Credit will be applied at next renewal'
    };
  }

  // Get yearly price per seat from environment or database
  const yearlyPricePerSeat = parseFloat(process.env.YEARLY_PRICE_PER_SEAT || '1200');

  // Calculate prorated amount
  // Formula: (seats_added × yearly_price × days_remaining) / total_days
  const prorationAmount = (seatsAdded * yearlyPricePerSeat * daysRemaining) / totalDays;

  return {
    amount: Math.round(prorationAmount * 100) / 100, // Round to 2 decimals
    daysRemaining,
    seatsAdded,
    yearlyPricePerSeat,
    message: `${seatsAdded} seat${seatsAdded > 1 ? 's' : ''} for ${daysRemaining} days`
  };
}
```

**Type Definitions**:
```typescript
interface SeatChangeResult {
  success: boolean;
  billingType: 'usage_based' | 'quantity_based';
  chargedAt: 'immediately' | 'end_of_period';
  prorationAmount?: number;
  daysRemaining?: number;
  message: string;
  currentSeats: number;
}

interface ProrationDetails {
  amount: number;
  daysRemaining: number;
  seatsAdded: number;
  yearlyPricePerSeat?: number;
  message: string;
}
```

### 4. Update Existing Seat Management API

**File**: `app/api/billing/update-subscription-quantity/route.ts`

**Current Implementation**: Direct API calls to LemonSqueezy

**Required Changes**: Replace with SeatManager

```typescript
import { SeatManager } from '@/lib/billing/seat-manager';

export async function POST(request: NextRequest) {
  try {
    const { organization_id, new_quantity } = await request.json();

    // Fetch organization subscription
    const subscription = await getOrganizationSubscription(organization_id);

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Calculate seat change
    const currentSeats = subscription.current_seats;
    const seatDiff = new_quantity - currentSeats;

    // Use SeatManager for routing
    const seatManager = new SeatManager();
    let result: SeatChangeResult;

    if (seatDiff > 0) {
      // Adding seats
      result = await seatManager.addSeats(subscription.id, new_quantity);
    } else if (seatDiff < 0) {
      // Removing seats
      const seatsToRemove = Math.abs(seatDiff);
      result = await seatManager.removeSeats(subscription.id, seatsToRemove);
    } else {
      // No change
      return NextResponse.json({
        success: true,
        message: 'No change in seat count',
        currentSeats: currentSeats
      });
    }

    // Return result with billing-specific information
    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('❌ [API] update-subscription-quantity error:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription quantity' },
      { status: 500 }
    );
  }
}
```

### 5. Frontend UX Updates

**File**: `app/onboarding/add-users/page.tsx` (or equivalent)

**Requirements**:
- Detect billing_type from organization subscription
- Show different messages based on billing type
- For quantity-based (yearly): show proration calculation before user confirms

**UI Changes**:

```typescript
// Fetch subscription info including billing_type
const { subscription } = await getOrganizationWithSubscription(orgId);

// Calculate proration preview (only for yearly)
let prorationPreview = null;
if (subscription.billing_type === 'quantity_based') {
  const seatManager = new SeatManager();
  prorationPreview = await seatManager.calculateProration(
    subscription.id,
    newSeatCount
  );
}

// Render different UI based on billing type
{subscription.billing_type === 'usage_based' ? (
  <div className="bg-blue-50 p-4 rounded">
    <p className="text-sm text-blue-800">
      💡 New seats will be billed at the end of your current billing period.
    </p>
  </div>
) : (
  <div className="bg-yellow-50 p-4 rounded">
    <p className="text-sm text-yellow-800 font-medium mb-2">
      ⚡ You will be charged immediately:
    </p>
    <div className="text-lg font-bold text-yellow-900">
      ${prorationPreview.amount}
    </div>
    <p className="text-xs text-yellow-700 mt-1">
      {prorationPreview.message}
    </p>
  </div>
)}
```

### 6. Environment Variables

**Required additions to `.env`**:
```bash
# Yearly pricing (for proration calculations)
YEARLY_PRICE_PER_SEAT=1200

# Variant IDs (already exist)
LEMONSQUEEZY_MONTHLY_VARIANT_ID=513746
LEMONSQUEEZY_YEARLY_VARIANT_ID=513747
```

### 7. LemonSqueezy Dashboard Configuration

**Monthly Variant (513746)**:
- ✅ Usage-based billing: ENABLED
- ✅ Pricing model: Per-seat
- ✅ Billing interval: Monthly
- ❌ Do not change!

**Yearly Variant (513747)**:
- ⚠️ Usage-based billing: DISABLED (if not already)
- ✅ Pricing model: Per-seat
- ✅ Billing interval: Yearly
- ✅ Quantity-based billing: Enabled by default when usage-based is disabled

## Testing Requirements

### Test 1: Monthly Subscription Unchanged
- Create new monthly subscription with 6 users
- Verify: billing_type = 'usage_based'
- Verify: usage record created at subscription_created
- Add 2 seats via API
- Verify: new usage record created with quantity: 8
- Verify: NO immediate charge
- Verify: Everything works exactly as before

### Test 2: Yearly Subscription New Flow
- Create new yearly subscription with 6 users
- Verify: billing_type = 'quantity_based'
- Verify: NO usage record created at subscription_created
- Verify: Immediate charge for 6 seats × yearly rate
- Add 2 seats via API
- Verify: PATCH to subscription-items with invoice_immediately: true
- Verify: Immediate proration charge
- Verify: Subscription quantity updated to 8

### Test 3: Proration Calculation
- Create yearly subscription that renews in 183 days (half year)
- Add 1 seat
- Verify: Proration ≈ (1 × $1200 × 183) / 365 = ~$600
- Confirm charge matches calculation

### Test 4: Free Tier Both Types
- Create monthly subscription with 3 users → quantity: 0
- Verify: billing_type = 'usage_based', no charge
- Create yearly subscription with 3 users → quantity: 0
- Verify: billing_type = 'quantity_based', no charge

### Test 5: Seat Removal
- Test removing seats for monthly (new usage record with lower quantity)
- Test removing seats for yearly (PATCH with lower quantity)
- Verify: Credits handled correctly

## Error Handling

### Case 1: Unknown Variant ID
```typescript
if (variantId !== monthlyId && variantId !== yearlyId) {
  throw new Error(`Unknown variant ID: ${variantId}. Expected ${monthlyId} (monthly) or ${yearlyId} (yearly)`);
}
```

### Case 2: LemonSqueezy API Failure
```typescript
if (!response.ok) {
  const errorText = await response.text();
  console.error(`❌ LemonSqueezy API error:`, {
    endpoint: url,
    status: response.status,
    error: errorText
  });
  throw new Error(`LemonSqueezy API error: ${errorText}`);
}
```

### Case 3: Missing Subscription Item ID
```typescript
if (!subscription.lemonsqueezy_subscription_item_id) {
  throw new Error(`Missing subscription_item_id for subscription ${subscription.id}. Cannot update seats.`);
}
```

## Migration Path

### Phase 1: Schema Update
1. Create migration to add 'quantity_based' to enum
2. Run migration on staging
3. Verify no existing subscriptions affected

### Phase 2: Webhook Updates
1. Update subscription_created with routing logic
2. Deploy to staging
3. Test with new monthly subscription (verify unchanged)
4. Test with new yearly subscription (verify routing)

### Phase 3: SeatManager Implementation
1. Create SeatManager service
2. Add comprehensive tests
3. Deploy to staging
4. Test seat changes for both types

### Phase 4: API Updates
1. Update update-subscription-quantity to use SeatManager
2. Deploy to staging
3. Run end-to-end tests

### Phase 5: Frontend Updates
1. Add proration preview for yearly
2. Update messaging based on billing_type
3. Deploy to staging
4. User acceptance testing

### Phase 6: Production Deployment
1. Verify all staging tests pass
2. Deploy to production
3. Monitor logs for both monthly and yearly flows
4. Create test yearly subscription to verify

## Success Metrics

✅ Zero errors on existing monthly subscriptions
✅ Successful yearly subscription creation with correct billing_type
✅ Successful yearly seat addition with immediate proration
✅ Accurate proration calculations (within $0.01 of expected)
✅ Clear separation in code between billing types
✅ Comprehensive logging for debugging
✅ Zero double-charging incidents

## External Dependencies

None - LemonSqueezy SDK already installed and working.

## Performance Considerations

- Proration calculation requires additional API call to LemonSqueezy (fetch renews_at)
- Consider caching renews_at in local database to reduce API calls
- For now, acceptable to make API call on-demand (not high frequency operation)

## Security Considerations

- All LemonSqueezy API calls use API key from environment variables
- No user-controlled input passed directly to LemonSqueezy API
- Validate billing_type before routing to prevent unauthorized access to different billing methods
