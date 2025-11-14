# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-11-14-two-product-migration/spec.md

## New Endpoints

### POST `/api/billing/switch-to-yearly`

**Purpose**: Initiate upgrade from monthly to yearly billing by canceling current monthly subscription and redirecting to yearly checkout.

**Authentication**: Required - user must be authenticated and belong to organization

**Request Headers**:
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

**Request Body**: None (inferred from current subscription)

**Success Response (200)**:
```json
{
  "success": true,
  "checkout_url": "https://time8.lemonsqueezy.com/checkout/buy/...",
  "current_seats": 5,
  "old_subscription_id": "1638258",
  "message": "Redirecting to yearly checkout. Your 5 seats will be preserved."
}
```

**Error Responses**:

**404 - No Active Subscription**:
```json
{
  "error": "No active monthly subscription found",
  "message": "Organization must have an active monthly subscription to upgrade"
}
```

**400 - Already on Yearly**:
```json
{
  "error": "Already on yearly billing",
  "message": "This subscription is already using yearly billing"
}
```

**500 - LemonSqueezy Error**:
```json
{
  "error": "Failed to create checkout",
  "details": "LemonSqueezy API error details",
  "old_subscription_not_cancelled": true
}
```

**Implementation Logic**:

```typescript
export async function POST(request: NextRequest) {
  // 1. Authenticate and get organization context
  const auth = await authenticateAndGetOrgContext();
  if (!auth.success) {
    return auth.error;
  }

  const { organization } = auth.context;
  const supabase = await createClient();

  // 2. Fetch active monthly subscription
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('organization_id', organization.id)
    .eq('lemonsqueezy_product_id', process.env.LEMONSQUEEZY_MONTHLY_PRODUCT_ID)
    .in('status', ['active', 'on_trial'])
    .single();

  if (subError || !subscription) {
    return NextResponse.json(
      {
        error: 'No active monthly subscription found',
        message: 'Organization must have an active monthly subscription to upgrade'
      },
      { status: 404 }
    );
  }

  // 3. Create yearly checkout with custom_data for migration
  const checkoutResponse = await fetch(
    'https://api.lemonsqueezy.com/v1/checkouts',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json'
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              custom: {
                migration_from_subscription_id: subscription.lemonsqueezy_subscription_id,
                preserve_seats: subscription.current_seats,
                organization_id: organization.id
              }
            }
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: process.env.LEMONSQUEEZY_STORE_ID
              }
            },
            variant: {
              data: {
                type: 'variants',
                id: process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID
              }
            }
          }
        }
      })
    }
  );

  if (!checkoutResponse.ok) {
    const errorData = await checkoutResponse.json();
    return NextResponse.json(
      {
        error: 'Failed to create checkout',
        details: errorData,
        old_subscription_not_cancelled: true
      },
      { status: 500 }
    );
  }

  const checkoutData = await checkoutResponse.json();
  const checkoutUrl = checkoutData.data.attributes.url;

  // 4. Return checkout URL for redirect
  return NextResponse.json({
    success: true,
    checkout_url: checkoutUrl,
    current_seats: subscription.current_seats,
    old_subscription_id: subscription.lemonsqueezy_subscription_id,
    message: `Redirecting to yearly checkout. Your ${subscription.current_seats} seats will be preserved.`
  });
}
```

## Modified Endpoints

### PATCH `/api/billing/change-billing-period`

**Current Behavior**: Attempts to PATCH subscription variant_id (causes 422 error for usage↔non-usage switches)

**Required Changes**:

1. **Add Yearly→Monthly Validation** (before line 106):

```typescript
// After fetching subscription (around line 69)

// BLOCK yearly→monthly switches
if (
  subscription.lemonsqueezy_product_id === process.env.LEMONSQUEEZY_YEARLY_PRODUCT_ID &&
  new_variant_id.toString() === process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID
) {
  // Fetch renewal date from LemonSqueezy
  const lsResponse = await fetch(
    `https://api.lemonsqueezy.com/v1/subscriptions/${subscription.lemonsqueezy_subscription_id}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        'Accept': 'application/vnd.api+json'
      }
    }
  );

  const lsData = await lsResponse.json();
  const renewsAt = new Date(lsData.data.attributes.renews_at).toLocaleDateString();

  return NextResponse.json(
    {
      error: 'Cannot switch from yearly to monthly',
      message: 'Yearly→monthly switching is only available at renewal',
      renewal_date: renewsAt,
      blocked: true
    },
    { status: 400 }
  );
}
```

2. **Add Monthly→Yearly Redirect** (before line 106):

```typescript
// REDIRECT monthly→yearly to new endpoint
if (
  subscription.lemonsqueezy_product_id === process.env.LEMONSQUEEZY_MONTHLY_PRODUCT_ID &&
  new_variant_id.toString() === process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID
) {
  return NextResponse.json(
    {
      error: 'Use upgrade endpoint',
      message: 'Monthly→yearly upgrades must use /api/billing/switch-to-yearly',
      redirect_to: '/api/billing/switch-to-yearly'
    },
    { status: 400 }
  );
}
```

**Purpose**: This endpoint becomes a safety net that prevents invalid variant switches and redirects to proper upgrade flow.

## Webhook Updates

### POST `/api/webhooks/lemonsqueezy` - `subscription_created` Event

**Current Behavior**: Saves new subscription to database with variant_id only

**Required Changes**:

**1. Extract product_id from webhook payload**:

```typescript
// After extracting variant_id (around line 45)
const productId = eventBody.data.attributes.product_id.toString();
const customData = eventBody.meta.custom_data || {};
```

**2. Save product_id to database**:

```typescript
// In subscription insert (around line 60)
const { data: newSubscription, error: insertError } = await supabase
  .from('subscriptions')
  .insert({
    organization_id: organizationId,
    lemonsqueezy_subscription_id: subscriptionId,
    lemonsqueezy_subscription_item_id: subscriptionItemId,
    lemonsqueezy_product_id: productId,  // NEW
    lemonsqueezy_variant_id: variantId,
    lemonsqueezy_customer_id: customerId,
    status: status,
    billing_type: billingType,
    current_seats: quantity,
    // ... other fields
  })
  .select()
  .single();
```

**3. Handle migration flow**:

```typescript
// After successful subscription creation (around line 80)

// Check if this is a migration from monthly→yearly
if (customData.migration_from_subscription_id) {
  console.log(`🔄 [Migration] Detected upgrade from subscription ${customData.migration_from_subscription_id}`);

  // Cancel the old monthly subscription
  try {
    const cancelResponse = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${customData.migration_from_subscription_id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
          'Accept': 'application/vnd.api+json'
        }
      }
    );

    if (!cancelResponse.ok) {
      console.error(`❌ [Migration] Failed to cancel old subscription ${customData.migration_from_subscription_id}`);
      // Don't fail webhook - log for manual cleanup
    } else {
      console.log(`✅ [Migration] Canceled old subscription ${customData.migration_from_subscription_id}`);

      // Mark old subscription as migrated in database
      await supabase
        .from('subscriptions')
        .update({
          status: 'migrated',
          migrated_to_subscription_id: subscriptionId
        })
        .eq('lemonsqueezy_subscription_id', customData.migration_from_subscription_id);
    }
  } catch (error) {
    console.error(`❌ [Migration] Error during cancellation:`, error);
    // Don't fail webhook - new subscription is valid
  }
}
```

**Purpose**: Webhooks now track product_id and handle migration cleanup automatically when yearly subscription is created.

## Error Handling

### Checkout Creation Failures

**Scenario**: LemonSqueezy checkout API returns error

**Handling**:
- Return 500 error to client
- Include `old_subscription_not_cancelled: true` flag
- User can retry upgrade safely (no state changed)

### Old Subscription Cancel Failures

**Scenario**: New yearly subscription created but old monthly cancellation fails

**Handling**:
- Log error with correlation ID
- Allow webhook to succeed (new subscription is valid)
- Alert admin for manual cleanup via monitoring
- User now has 2 subscriptions (rare, requires manual fix)

### Webhook Idempotency

**Scenario**: Webhook fires multiple times for same subscription_created event

**Handling**:
- Check if `lemonsqueezy_subscription_id` already exists (UNIQUE constraint)
- If exists, check if `migrated_to_subscription_id` is already set
- Skip migration logic if already processed
- Return 200 OK to prevent retry storm

### Missing Custom Data

**Scenario**: Webhook payload missing `custom_data.migration_from_subscription_id`

**Handling**:
- Treat as normal subscription creation (not migration)
- No cancellation attempted
- Likely a fresh signup (expected behavior)
