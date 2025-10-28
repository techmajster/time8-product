# Lemon Squeezy API Complete Documentation

## Overview

The Lemon Squeezy API is a REST API that provides programmatic access to all aspects of your Lemon Squeezy store. It has predictable resource-oriented URLs, returns valid [JSON:API](https://jsonapi.org/) encoded responses, and uses standard HTTP response codes, authentication, and verbs.

**Base URL:** `https://api.lemonsqueezy.com/v1/`

**Key Features:**
- Complete store management
- Payment processing and checkouts
- Subscription management 
- License key generation and validation
- Customer management
- Usage-based billing
- Webhooks for real-time notifications
- Multi-tenant support with test/live modes

## Authentication & Setup

### API Keys

1. **Creating API Keys**
   - Navigate to Settings → API in your Lemon Squeezy dashboard
   - Create separate keys for test and live modes
   - Store keys securely (never in client-side code or version control)

2. **Authentication Headers**
   ```http
   Accept: application/vnd.api+json
   Content-Type: application/vnd.api+json
   Authorization: Bearer {api_key}
   ```

### Rate Limiting
- **Limit:** 300 API calls per minute
- **Headers returned:**
  - `X-Ratelimit-Limit`
  - `X-Ratelimit-Remaining`
- **Rate limit exceeded:** `429 Too Many Requests`

### Test vs Live Mode
- **Test Mode:** Safe environment for development and testing
- **Live Mode:** Production environment for real transactions
- API keys are mode-specific and cannot be used across modes

## Core Concepts

### JSON:API Specification
All endpoints follow the JSON:API spec, providing:
- Consistent response structures
- Relationship handling
- Filtering and including related resources
- Standardized error responses

### Pagination
- **Type:** Page-based pagination
- **Parameters:** `page[number]` and `page[size]`
- **Response includes:** `links` object with `first`, `last`, `next`, `prev`

### Filtering
```http
GET /v1/orders?filter[status]=paid
GET /v1/subscriptions?filter[store_id]=1
```

### Including Related Resources
```http
GET /v1/products/1?include=variants
GET /v1/orders/1?include=customer,order-items
```

## API Endpoints Reference

### User Management

#### Get Current User
```http
GET /v1/users/me
```
Returns information about the authenticated user.

### Store Management

#### List All Stores
```http
GET /v1/stores
```

#### Retrieve a Store
```http
GET /v1/stores/{id}
```

### Product Management

#### List All Products
```http
GET /v1/products
```

#### Retrieve a Product
```http
GET /v1/products/{id}
```

#### List All Variants
```http
GET /v1/variants
```

#### Retrieve a Variant
```http
GET /v1/variants/{id}
```

**Variant Object Attributes:**
- `product_id` - ID of the parent product
- `name` - Variant name
- `slug` - Unique identifier
- `description` - HTML description
- `price` - Price in cents
- `is_subscription` - Boolean subscription flag
- `interval` - Billing interval (month, year)
- `interval_count` - Interval multiplier
- `has_free_trial` - Trial availability
- `trial_interval` - Trial period unit
- `trial_interval_count` - Trial duration
- `has_license_keys` - License key generation
- `license_activation_limit` - Max activations
- `status` - published, draft, pending

### Checkout Management

#### Create a Checkout
```http
POST /v1/checkouts
```

**Request Body:**
```json
{
  "data": {
    "type": "checkouts",
    "attributes": {
      "custom_price": 50000,
      "product_options": {
        "enabled_variants": [1],
        "redirect_url": "https://mysite.com/success"
      },
      "checkout_options": {
        "embed": false,
        "media": true,
        "logo": true,
        "button_color": "#7047EB"
      },
      "checkout_data": {
        "email": "customer@example.com",
        "discount_code": "10PERCENTOFF",
        "custom": {
          "user_id": 123
        }
      },
      "expires_at": "2024-12-31T23:59:59Z",
      "preview": true
    },
    "relationships": {
      "store": {
        "data": { "type": "stores", "id": "1" }
      },
      "variant": {
        "data": { "type": "variants", "id": "1" }
      }
    }
  }
}
```

#### Retrieve a Checkout
```http
GET /v1/checkouts/{id}
```

**Checkout Object Attributes:**
- `store_id` - Parent store ID
- `variant_id` - Associated variant
- `custom_price` - Override price (cents)
- `product_options` - Product customizations
- `checkout_options` - UI customizations
- `checkout_data` - Pre-filled customer data
- `expires_at` - Checkout expiration
- `url` - Unique checkout URL
- `preview` - Price breakdown (if requested)

### Order Management

#### List All Orders
```http
GET /v1/orders
```

#### Retrieve an Order
```http
GET /v1/orders/{id}
```

**Order Object Attributes:**
- `store_id` - Parent store
- `customer_id` - Associated customer
- `identifier` - Unique UUID
- `order_number` - Sequential number
- `user_name` - Customer name
- `user_email` - Customer email
- `currency` - ISO currency code
- `currency_rate` - USD conversion rate
- `subtotal` - Pre-tax total (cents)
- `setup_fee` - One-time fee (cents)
- `discount_total` - Discount amount (cents)
- `tax` - Tax amount (cents)
- `total` - Final total (cents)
- `status` - paid, pending, failed, refunded
- `refunded` - Refund status boolean
- `urls.receipt` - Customer receipt URL

### Customer Management

#### List All Customers
```http
GET /v1/customers
```

#### Retrieve a Customer
```http
GET /v1/customers/{id}
```

**Customer Object Attributes:**
- `store_id` - Parent store
- `name` - Full name
- `email` - Email address
- `status` - Marketing status (subscribed, unsubscribed, archived)
- `city`, `region`, `country` - Address information
- `total_revenue_currency` - Lifetime value (cents)
- `mrr` - Monthly recurring revenue (cents)
- `urls.customer_portal` - Self-service portal URL

### Subscription Management

#### List All Subscriptions
```http
GET /v1/subscriptions
```

#### Retrieve a Subscription
```http
GET /v1/subscriptions/{id}
```

#### Update a Subscription
```http
PATCH /v1/subscriptions/{id}
```

**Update Examples:**
```json
// Change plan
{
  "data": {
    "type": "subscriptions",
    "id": "1",
    "attributes": {
      "variant_id": 11
    }
  }
}

// Cancel subscription  
{
  "data": {
    "type": "subscriptions", 
    "id": "1",
    "attributes": {
      "cancelled": true
    }
  }
}

// Pause subscription
{
  "data": {
    "type": "subscriptions",
    "id": "1", 
    "attributes": {
      "pause": {
        "mode": "free",
        "resumes_at": "2024-06-30T00:00:00Z"
      }
    }
  }
}

// Resume subscription
{
  "data": {
    "type": "subscriptions",
    "id": "1",
    "attributes": {
      "pause": null
    }
  }
}
```

#### Cancel a Subscription
```http
DELETE /v1/subscriptions/{id}
```

**Subscription Object Attributes:**
- `store_id` - Parent store
- `customer_id` - Associated customer  
- `order_id` - Original order
- `product_id`, `variant_id` - Product details
- `product_name`, `variant_name` - Display names
- `user_name`, `user_email` - Customer info
- `status` - active, cancelled, expired, past_due, unpaid, paused
- `card_brand`, `card_last_four` - Payment method
- `payment_processor` - stripe, paypal, etc.
- `pause` - Pause configuration object
- `cancelled` - Cancellation status
- `trial_ends_at` - Trial expiration
- `billing_anchor` - Billing day of month
- `renews_at` - Next billing date
- `ends_at` - Expiration date (if cancelled)
- `urls.update_payment_method` - Payment update URL
- `urls.customer_portal` - Self-service portal

**Subscription Statuses:**
- `active` - Active subscription
- `cancelled` - Cancelled, in grace period
- `expired` - Ended subscription
- `on_trial` - In trial period
- `paused` - Payment collection paused
- `past_due` - Payment failed, retrying
- `unpaid` - All retries failed

### Subscription Items & Usage-Based Billing

#### List Subscription Items
```http
GET /v1/subscription-items
```

#### Update Subscription Item
```http
PATCH /v1/subscription-items/{id}
```

#### Report Usage
```http
POST /v1/subscription-items/{id}/usage-records
```

**Usage Record Request:**
```json
{
  "data": {
    "type": "usage-records",
    "attributes": {
      "quantity": 23,
      "action": "increment"
    }
  }
}
```

#### Get Current Usage
```http
GET /v1/subscription-items/{id}/current-usage
```

### License Key Management

#### List All License Keys
```http
GET /v1/license-keys
```

#### Retrieve a License Key
```http
GET /v1/license-keys/{id}
```

**License Key Object Attributes:**
- `store_id` - Parent store
- `customer_id` - Key owner
- `order_id`, `order_item_id` - Purchase details
- `product_id` - Associated product
- `user_name`, `user_email` - Customer info
- `key` - Full license key
- `key_short` - Masked version (XXXX-last12chars)
- `activation_limit` - Max activations allowed
- `instances_count` - Current activation count
- `disabled` - Manual disable flag
- `status` - inactive, active, expired, disabled
- `expires_at` - Expiration date

### License Key Validation API

#### Activate License Key
```http
POST https://api.lemonsqueezy.com/v1/licenses/activate
```

**Request:**
```json
{
  "license_key": "YOUR_LICENSE_KEY",
  "instance_name": "User's Computer"
}
```

**Response:**
```json
{
  "activated": true,
  "error": null,
  "license_key": {
    "id": 1,
    "status": "active",
    "key": "38b1460a-5104-4067-a91d-77b872934d51",
    "activation_limit": 5,
    "activation_usage": 1
  },
  "instance": {
    "id": "47596ad9-a811-4ebf-ac8a-03fc7b6d2a17",
    "name": "User's Computer"
  },
  "meta": {
    "store_id": 1,
    "product_id": 4,
    "variant_id": 5,
    "customer_email": "customer@example.com"
  }
}
```

#### Validate License Key
```http
POST https://api.lemonsqueezy.com/v1/licenses/validate
```

#### Deactivate License Key
```http
POST https://api.lemonsqueezy.com/v1/licenses/deactivate
```

### Discount Management

#### List All Discounts
```http
GET /v1/discounts
```

#### Create a Discount
```http
POST /v1/discounts
```

**Discount Request:**
```json
{
  "data": {
    "type": "discounts",
    "attributes": {
      "name": "10% Off",
      "code": "10PERCENT", 
      "amount": 10,
      "amount_type": "percent",
      "is_limited_to_products": true,
      "is_limited_redemptions": true,
      "max_redemptions": 100,
      "starts_at": "2024-01-01T00:00:00Z",
      "expires_at": "2024-12-31T23:59:59Z",
      "duration": "repeating",
      "duration_in_months": 3
    },
    "relationships": {
      "store": {
        "data": { "type": "stores", "id": "1" }
      },
      "variants": {
        "data": [
          { "type": "variants", "id": "1" },
          { "type": "variants", "id": "2" }
        ]
      }
    }
  }
}
```

**Discount Attributes:**
- `name` - Display name
- `code` - Redemption code
- `amount` - Discount value
- `amount_type` - percent, fixed
- `is_limited_to_products` - Product restriction
- `is_limited_redemptions` - Usage limit
- `max_redemptions` - Max uses
- `starts_at`, `expires_at` - Validity period
- `duration` - once, repeating
- `duration_in_months` - Repeat duration

#### Retrieve a Discount
```http
GET /v1/discounts/{id}
```

### File Management

#### List All Files
```http
GET /v1/files
```

#### Retrieve a File  
```http
GET /v1/files/{id}
```

### Webhook Management

#### List All Webhooks
```http
GET /v1/webhooks
```

#### Create a Webhook
```http
POST /v1/webhooks
```

#### Update a Webhook
```http
PATCH /v1/webhooks/{id}
```

#### Delete a Webhook
```http
DELETE /v1/webhooks/{id}
```

**Webhook Object Attributes:**
- `store_id` - Parent store
- `url` - Endpoint URL
- `events` - Array of subscribed events
- `last_sent_at` - Last webhook delivery

## Webhooks

### Event Types

**Order Events:**
- `order_created` - New order placed
- `order_refunded` - Order refunded

**Subscription Events:**
- `subscription_created` - New subscription started
- `subscription_updated` - Subscription modified
- `subscription_cancelled` - Subscription cancelled
- `subscription_resumed` - Cancelled subscription resumed
- `subscription_expired` - Subscription ended
- `subscription_paused` - Subscription paused
- `subscription_unpaused` - Subscription resumed from pause
- `subscription_payment_failed` - Payment failed
- `subscription_payment_success` - Payment successful
- `subscription_payment_recovered` - Payment recovered after failure

**License Key Events:**
- `license_key_created` - New license key generated
- `license_key_updated` - License key modified

### Webhook Structure

```json
{
  "meta": {
    "event_name": "subscription_created",
    "custom_data": {
      "user_id": 123
    }
  },
  "data": {
    "type": "subscriptions",
    "id": "1",
    "attributes": {
      // Full subscription object
    },
    "relationships": {
      // Related object links
    }
  }
}
```

### Security

**Signature Verification:**
1. Webhooks include `X-Signature` header
2. Use your signing secret to verify authenticity
3. Always verify signatures to prevent fraud

**Response Requirements:**
- Return `HTTP 200` to acknowledge receipt
- Non-200 responses trigger up to 3 retries
- Process webhooks asynchronously when possible

### Setup Methods

1. **Dashboard:** Settings → Webhooks
2. **API:** Use webhook endpoints
3. **Required fields:** URL, signing secret, events

## SDKs & Tools

### Official SDKs

#### JavaScript/TypeScript
```bash
npm install @lemonsqueezy/lemonsqueezy.js
```

```javascript
import { 
  lemonSqueezySetup, 
  getAuthenticatedUser,
  createCheckout,
  listSubscriptions
} from "@lemonsqueezy/lemonsqueezy.js";

// Setup
lemonSqueezySetup({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
  onError: (error) => console.error(error)
});

// Usage
const user = await getAuthenticatedUser();
const checkout = await createCheckout(storeId, variantId, {
  checkoutData: { email: "customer@example.com" }
});
```

### Unofficial Community SDKs

- **Go:** [@NdoleStudio/lemonsqueezy-go](https://github.com/NdoleStudio/lemonsqueezy-go)
- **Ruby:** [@deanpcmad/lemonsqueezy](https://github.com/deanpcmad/lemonsqueezy)  
- **Rust:** [@VarunPotti/lemonsqueezy.rs](https://github.com/VarunPotti/lemonsqueezy.rs)
- **Swift:** [@mauryaratan/lemonsqueezy-swift](https://github.com/mauryaratan/lemonsqueezy-swift)
- **Python:** [@mthli/lemonsqueepy](https://github.com/mthli/lemonsqueepy)
- **PHP:** [@seisigmasrl/lemonsqueezy.php](https://github.com/seisigmasrl/lemonsqueezy.php)
- **Elixir:** [@PJUllrich/lemon_ex](https://github.com/PJUllrich/lemon_ex)
- **Java:** [@codewriterbv/lemonsqueezy-java](https://github.com/codewriterbv/lemonsqueezy-java)

## Common Use Cases & Examples

### 1. Creating a Subscription Checkout

```javascript
// Create checkout for subscription
const checkout = await createCheckout(storeId, variantId, {
  checkoutOptions: {
    embed: false,
    media: false,
    logo: true
  },
  checkoutData: {
    email: customer.email,
    custom: { user_id: customer.id }
  },
  productOptions: {
    enabledVariants: [variantId],
    redirectUrl: "https://myapp.com/success",
    receiptButtonText: "Go to Dashboard"
  }
});

// Redirect customer to checkout.data.attributes.url
```

### 2. Managing Subscription Changes

```javascript
// Upgrade/downgrade subscription
const subscription = await updateSubscription(subscriptionId, {
  variant_id: newVariantId,
  proration_behavior: "create_prorations"
});

// Cancel subscription (with grace period)
await updateSubscription(subscriptionId, {
  cancelled: true
});

// Pause subscription
await updateSubscription(subscriptionId, {
  pause: {
    mode: "free", 
    resumes_at: "2024-07-01T00:00:00Z"
  }
});
```

### 3. License Key Validation

```javascript
// Validate license key
const response = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    license_key: userLicenseKey,
    instance_id: deviceId
  })
});

const validation = await response.json();

if (validation.valid && validation.license_key.status === "active") {
  // Grant access
  grantAccess(validation.meta);
} else {
  // Deny access
  denyAccess(validation.error);
}
```

### 4. Usage-Based Billing

```javascript
// Report usage for subscription
await createUsageRecord(subscriptionItemId, {
  quantity: 150,
  action: "increment" // or "set"
});

// Get current usage
const usage = await getSubscriptionItemCurrentUsage(subscriptionItemId);
console.log(`Current usage: ${usage.data.meta.quantity} units`);
```

### 5. Webhook Handling

```javascript
// Express.js webhook handler
app.post("/webhooks/lemonsqueezy", express.raw({type: 'application/json'}), (req, res) => {
  const signature = req.headers['x-signature'];
  const payload = req.body;
  
  // Verify signature
  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  const event = JSON.parse(payload);
  
  switch (event.meta.event_name) {
    case 'subscription_created':
      handleNewSubscription(event.data);
      break;
    case 'subscription_updated': 
      handleSubscriptionUpdate(event.data);
      break;
    case 'subscription_cancelled':
      handleSubscriptionCancellation(event.data);
      break;
  }
  
  res.status(200).send('OK');
});
```

## Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden  
- `404` - Not Found
- `422` - Unprocessable Entity
- `429` - Rate Limit Exceeded
- `500` - Server Error

### Error Response Format
```json
{
  "errors": [
    {
      "status": "422",
      "detail": "The variant field is required.",
      "source": {
        "pointer": "/data/relationships/variant"
      }
    }
  ]
}
```

## Best Practices

### Security
1. **Never expose API keys** in client-side code
2. **Verify webhook signatures** to prevent fraud  
3. **Use HTTPS** for all API calls
4. **Rotate API keys** regularly
5. **Store sensitive data securely**

### Performance  
1. **Use pagination** for large datasets
2. **Filter requests** to reduce payload size
3. **Cache frequently accessed data** locally
4. **Include related resources** to reduce API calls
5. **Handle rate limits** gracefully with exponential backoff

### Integration
1. **Store essential data locally** (customer IDs, subscription IDs)
2. **Use webhooks** for real-time updates  
3. **Implement proper error handling** and retries
4. **Test thoroughly** in test mode before going live
5. **Monitor webhook deliveries** and handle failures

### Data Management
1. **Sync product data regularly** from API
2. **Store checkout custom data** for webhook processing
3. **Maintain subscription status** in your database
4. **Log webhook events** for debugging
5. **Handle edge cases** (failed payments, plan changes)

## Versioning & Backwards Compatibility

The API uses semantic versioning with the major version in the URL (`/v1/`). Lemon Squeezy maintains backwards compatibility and considers these changes safe:

- Adding new API resources
- Adding optional request parameters  
- Adding new response properties
- Changing property order in responses
- Adding new webhook event types

Breaking changes will result in a new major version with deprecation notices for the old version.

---

This documentation covers the complete Lemon Squeezy API as of August 2025. For the most current information, always refer to the [official Lemon Squeezy API documentation](https://docs.lemonsqueezy.com/api).
