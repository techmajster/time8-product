# LemonSqueezy Complete Documentation

> **Purpose**: This document contains comprehensive LemonSqueezy API and integration documentation to ensure proper implementation without assumptions.

---

## Table of Contents

1. [API Overview](#api-overview)
2. [Getting Started](#getting-started)
3. [Taking Payments](#taking-payments)
4. [Customer Portal](#customer-portal)
5. [Webhooks](#webhooks)
6. [Managing Subscriptions](#managing-subscriptions)
7. [Usage-Based Billing](#usage-based-billing)
8. [Lemon.js](#lemonjs)
9. [Testing & Going Live](#testing-going-live)
10. [Tutorials](#tutorials)

---

## API Overview

### Core Features

The Lemon Squeezy API is a REST-based service that returns JSON:API formatted responses and uses standard HTTP status codes and authentication methods.

**Test Mode**: Developers can build and test integrations using test mode, with API keys interacting exclusively with test store data. When ready for production, create live mode API keys.

**Versioning**: The API includes major version numbers as URL prefixes (e.g., `/v1`). The service maintains backward compatibility by:
- Adding new resources
- Including optional parameters for existing methods
- Adding response properties
- Reordering response fields
- Creating new webhook event types

**Rate Limiting**: The API enforces a limit of **300 calls per minute**. Success responses include headers `X-Ratelimit-Limit` and `X-Ratelimit-Remaining`. Exceeding the limit returns a 429 status code.

### Available SDKs

**Official**:
- JavaScript: `@lmsqueezy/lemonsqueezy.js`
- Laravel: `@lmsqueezy/laravel`

**Community**:
- Go, Ruby, Rust, Swift, Python, PHP, Elixir, and Java implementations available

### API Resources

The documentation covers extensive endpoints including:
- Users
- Stores
- Customers
- Products and variants
- Prices
- Orders
- Subscriptions
- Licenses
- Webhooks
- Affiliate management

---

## Getting Started

### Setup Requirements

Before beginning, you need a Lemon Squeezy account.

### Creating API Keys

Navigate to **Settings » API** in your Lemon Squeezy dashboard to generate authentication keys.

**Important Notes**:
- Assign a clear, descriptive name (cannot be changed later)
- After submission, you'll see your key **once only**—save it securely immediately
- The key won't be displayed again in the dashboard

**Security Best Practices**:
- Never embed API keys in code or version control systems
- Use environment files for storage
- Rotate keys regularly for additional protection

If you lose a key, generate new ones or delete old ones from Settings » API page.

### Authentication Headers

All API requests require **three headers**:

```
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json
Authorization: Bearer {api_key}
```

### API Endpoint

Base URL: `https://api.lemonsqueezy.com/v1/`

All requests must use HTTPS and include authentication.

### API Response Format

The API follows the JSON:API specification, returning object data with relationships and optional included data. Responses contain store data, customer information, and order details with formatted values in multiple currencies.

### Key Capabilities

The API enables:
- Displaying products within applications
- Creating checkout links for subscribers
- Custom-priced checkout generation
- Customer detail retrieval and order history access
- Dynamic discount code creation
- License key activation and validation
- Subscription management (upgrade, downgrade, cancel, pause, resume)

---

## Taking Payments

### Core Payment Flow

Lemon Squeezy's payment system centers on directing customers to checkout pages where they can purchase products using various payment methods including cards, PayPal and Apple Pay.

### Checkout URLs

Each product variant receives a unique checkout URL:

```
https://[STORE].lemonsqueezy.com/checkout/buy/[VARIANT_ID]
```

**Critical Distinction**:
- Shareable URLs contain `/checkout/buy/`
- Customer-generated URLs convert to `/checkout/?cart=` format
- **Cart URLs are unique to that customer and single-use only**—cannot be reused or shared

### Creating Checkouts

#### Dashboard Method

1. Log into Lemon Squeezy dashboard
2. Navigate to Products
3. Click "Share" on any product
4. Configure checkout settings (hosted vs. overlay display, visible elements)
5. Copy the generated URL

#### API Method

Use the Checkouts API endpoint to create checkouts programmatically with more flexibility.

**Basic Requirements**:
- `relationships` to both store and variant
- Response returns unique checkout URL in `data.attributes.url`

### Advanced Customization Options

#### Display Types

- **Hosted Checkout**: Opens in a new browser tab (default)
- **Checkout Overlay**: Displays checkout in an iframe over your page using Lemon.js

#### Pre-fill Customer Data

Query parameters allow pre-population of checkout fields:
- Name and email
- Billing address details
- Tax numbers
- Discount codes
- Quantities

#### Custom Data

Pass merchant-specific data via query parameters:

```
?checkout[custom][user_id]=123
```

This data appears in webhook events as `meta.custom_data` but remains hidden from customers.

#### Custom Pricing

**API-only feature** allowing dynamic price overrides at checkout time.

**Important**: For subscriptions, the custom price applies to **all future renewals** unless the customer changes plans.

#### Product Details Override

Modify through API `product_options`:
- Product name
- Description
- Media
- Redirect URL
- Displayed variants

#### Expiring Checkouts

Set automatic expiration dates using the `expires_at` attribute to limit purchase windows.

### Post-Purchase Flow

After successful payment, customers see a customizable confirmation modal with a button redirecting to a configurable URL (defaults to customer's My Orders page).

**Customizable Elements**:
- Button text
- Receipt messaging
- Receipt button links

Configure through dashboard settings or API `product_options`.

### Data Storage Best Practices

#### For Orders

Store the order `id` from Order objects for future API reference.

#### For Subscriptions

Capture:
- Subscription `id`, `product_id`, `variant_id`
- `first_subscription_item.id` (for usage-based billing)
- `customer_id`, `status`, `trial_ends_at`, `renews_at`
- `card_brand`, `card_last_four`
- `urls.update_payment_method` for customer payment updates

**Implementation**: Store this data by listening to `order_created` and `subscription_created` webhook events.

---

## Customer Portal

### Overview

The Customer Portal is a no-code solution enabling customers to manage subscriptions and billing information independently.

### Access Methods

#### Signed URLs

Subscription and Customer objects contain signed `customer_portal` URLs valid for **24 hours**.

**Key Feature**: "This URL will automatically log in customers to manage their subscription(s) and is valid for 24 hours."

**Implementation**:
1. Request fresh URLs via Retrieve Subscription or Retrieve Customer API endpoints
2. Redirect users when they click billing buttons
3. URL automatically authenticates customer

#### Unsigned URLs

Format: `https://[STORE].lemonsqueezy.com/billing`

**Behavior**:
- No API calls required
- Prompts unauthenticated customers to log in via email magic link
- Similar to the My Orders feature

### Customization Options

Available through Design settings in your dashboard:

- Modify header copy displayed to customers
- Toggle specific portal sections on/off
- Select which subscription products/variants customers can upgrade/downgrade to
- Configure a "Back" link URL to return customers to your application
- Changes apply **globally to all customers**

### Important Requirements

**⚠️ Critical**: "You will still need to set up webhooks if you want your billing and application data to stay in sync."

Webhooks are **essential** for maintaining data consistency between your application and Lemon Squeezy.

---

## Webhooks

### Overview

Webhooks automatically transmit data from Lemon Squeezy to your application when store events occur, keeping users informed and maintaining product access.

**Example**: Subscription renewals trigger payment notifications sent directly to your endpoint.

### Supported Events

Lemon Squeezy sends webhooks for numerous events:

#### Order Events
- `order_created`
- `order_refunded`

#### Subscription Lifecycle Events
- `subscription_created`
- `subscription_updated`
- `subscription_cancelled`
- `subscription_resumed`
- `subscription_expired`
- `subscription_paused`
- `subscription_unpaused`

#### Payment Events
- `subscription_payment_failed`
- `subscription_payment_success`
- `subscription_payment_recovered`

#### Other Events
- `license_key_created`
- `license_key_updated`
- `affiliate_activated`

### Webhook Payload Structure

Webhooks arrive as JSON via POST requests containing:

- **Meta object**: Contains `event_name` and optional `custom_data` (if passed during checkout)
- **Data object**: Returns Subscription, Invoice, Order, or License Key objects depending on event type
- **Relationships**: Links to related objects for sequential API requests

**Example**: A `subscription_created` event includes:
- Customer details
- Subscription status
- Card information
- Portal URLs for payment method updates
- Customer management links

### Setup Methods

#### Dashboard Setup

1. Navigate to Settings » Webhooks
2. Add your endpoint URL
3. Configure a signing secret for validation
4. Select specific events to monitor

#### API Setup

Submit a POST request to `https://api.lemonsqueezy.com/v1/webhooks` with:
- Your endpoint
- Event subscriptions
- Signing secret
- Store relationship

### Response Requirements

**⚠️ Critical**: Return **HTTP 200** to confirm receipt.

Any other status triggers automatic retries (up to **4 attempts total**).

Failed webhooks can be manually resent from dashboard settings.

### Security: Signing & Validation

The `X-Signature` header contains a hash combining your signing secret and request body.

**Validation Process**:
1. Extract `X-Signature` header
2. Recreate hash using your signing secret and raw request body
3. Use `crypto.timingSafeEqual()` for safe comparison (prevents timing attacks)
4. Compare against header signature to confirm authenticity

### Testing

In Test Mode, manually trigger webhook simulations for existing test subscriptions.

**For renewal events**:
1. Create daily-billing test products
2. Purchase subscriptions
3. Wait for the first renewal cycle
4. Simulate `subscription_payment_*` events

### Best Practices

**⚠️ Important**: Store webhook events locally (database or cache) to enable quick HTTP 200 responses while processing data asynchronously.

**Benefits**:
- Preserves event data for troubleshooting if processing fails
- Prevents timeout issues
- Allows for retry logic on your side

---

## Managing Subscriptions

### Changing Plans

To modify a subscription's plan, send a **PATCH request** to the subscription endpoint with the new variant ID.

**Behavior**: The subscription "will be instantly moved to the new product variant" and you can verify the change through the API response.

### Proration Handling

When switching plans, proration occurs automatically by default.

**Control Options**:

1. **`invoice_immediately: true`** - Creates an immediate invoice for price differences
2. **`disable_prorations: true`** - Moves customers to the new plan price at next renewal without extra charges

**Priority**: If both are used, `disable_prorations` takes precedence.

### Cancelling & Resuming

#### Cancelling

Send a **DELETE request** to the subscription endpoint.

**Response**: Subscription object with:
- `cancelled: true`
- `status: "cancelled"`

**Grace Period**: Cancelled subscriptions enter a grace period before expiration at the next renewal date. Customers retain access during this period since they've already paid.

#### Resuming

Send a **PATCH request** with `cancelled: false`.

**⚠️ Limitation**: Once subscriptions reach their renewal date without resumption, they expire and become **non-resumable**.

### Pausing Subscriptions

Send a **PATCH request** with a `pause` object specifying:

- **`mode: "free"`** - Offer service at no cost during the pause
- **`mode: "void"`** - Cannot provide services during the pause

**Payment Collection**: Both modes stop payment collection.

**Resumption Options**:
- Set `resumes_at` for automatic unpausing
- Manually unpause by setting `pause: null`

### Updating Quantities

For subscription quantity modifications, consult the **Usage-Based Billing** section for detailed instructions on managing subscription usage and quantities.

---

## Usage-Based Billing

### Overview

Usage-based billing allows customers to be charged based on consumption during a billing period rather than upfront. This differs from quantity-based billing, which requires advance charges.

### Key Differences

#### Quantity-Based Billing
- Charges customers upfront based on predetermined units
- Changes to quantity affect the next renewal amount
- Functions similarly to plan changes

#### Usage-Based Billing
- Enables reporting consumption over time through multiple API requests
- **"Customers are charged based on usage during the previous billing period rather than up-front"**

### ⚠️ CRITICAL: Checkout Behavior

**"When you use usage-based billing, the initial charge at checkout will always be 0. Any quantity value set at checkout will be ignored."**

This contrasts with quantity-based billing, where you can set initial quantities via:
- Query parameter: `?quantity=100`
- API's `checkout_data.variant_quantities`

### Pricing Model Compatibility

Both quantity-based and usage-based billing work with **all four pricing models**:
- Standard pricing
- Package pricing
- Volume pricing
- Graduated pricing

### Reporting Usage

Two mechanisms work together:

#### 1. Aggregation Setting (Product/Variant Level)

Configure on the product/variant:
- **Sum of usage during period**
- **Most recent usage during period**
- **Most recent usage**
- **Maximum usage during period**

#### 2. API Action Parameter

When reporting usage:

- **`"action": "increment"`** — Adds to existing usage (for sum-based aggregation)
- **`"action": "set"`** — Replaces usage (for "most recent" or "maximum" aggregation)

### API Implementation

#### Creating Usage Records

```
POST https://api.lemonsqueezy.com/v1/usage-records
Authorization: Bearer {api_key}
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json

{
  "data": {
    "type": "usage-records",
    "attributes": {
      "quantity": 100,
      "action": "set"
    },
    "relationships": {
      "subscription-item": {
        "data": {
          "type": "subscription-items",
          "id": "12345"
        }
      }
    }
  }
}
```

#### Querying Current Usage

```
GET https://api.lemonsqueezy.com/v1/subscription-items/1/current-usage
```

The returned `quantity` value reflects billable units for the next invoice, allowing you to display customer consumption transparently.

### Implementation Steps

#### 1. Enable Metered Billing

Toggle "Usage is metered?" in product settings and select aggregation method:
- Sum of usage during period
- Most recent usage

#### 2. Set Up Webhooks

Configure webhooks to receive notifications when subscriptions are created or modified.

**⚠️ Critical**: Store subscription item IDs locally—these identifiers are **required** for reporting usage data.

#### 3. Send Customers to Checkout

Customers proceed through standard checkout flows.

**Important**: No payment is collected at this stage; payment methods are simply stored for future billing cycles.

#### 4. Report Usage Data

Send usage information via the usage records endpoint as frequently as needed:

- Report immediately after each unit consumption, or
- Send daily batch updates with cumulative totals

Use either `"increment"` action (adds to existing quantity) or `"set"` action (replaces previous quantity), depending on your aggregation choice.

### Key Considerations

- Store subscription item IDs in your database for later reference
- Choose aggregation method before enabling—this determines how you'll report usage
- Frequency of reporting depends on your use case and billing precision needs

### Real-World Pricing Models

#### Volume Pricing
Seat-based software where per-unit costs decrease with volume.

**Example**: $9/seat for 4 seats, dropping to $6/seat for 20+ seats

#### Package Pricing
API platforms charging per usage unit package.

**Example**: €9 per 1,000 API call credits

#### Graduated Pricing
Tiered consumption costs where rates decrease at usage thresholds.

**Example**: $0.03 per query initially, declining to $0.01 after 2,000 queries

---

## Lemon.js

### Overview

Lemon.js is a lightweight JavaScript library (**2.3kB**) that enables developers to integrate Lemon Squeezy payment functionality directly into their applications.

### Setup

Embed the script tag in your page's head or body section:

```html
<script src="https://app.lemonsqueezy.com/js/lemon.js" defer></script>
```

### Checkout Overlays

Two methods exist for opening checkout experiences:

#### 1. CSS Class Approach

Add the `lemonsqueezy-button` class to any link pointing to a Lemon Squeezy checkout URL.

**Behavior**: Automatically triggers an overlay modal

```html
<a href="https://store.lemonsqueezy.com/checkout/buy/123"
   class="lemonsqueezy-button">
  Subscribe Now
</a>
```

#### 2. Programmatic Method

Use `LemonSqueezy.Url.Open(checkoutUrl)` to dynamically open checkout URLs generated via the API.

**Benefits**: Offers flexibility for custom implementations

```javascript
LemonSqueezy.Url.Open('https://store.lemonsqueezy.com/checkout/buy/123');
```

### Additional Overlay Support

The library also handles payment method update overlays, allowing customers to modify their billing information within your application.

**Usage**: `LemonSqueezy.Url.Open()` with appropriate subscription URLs

### Event Handling

Set up event listeners using:

```javascript
LemonSqueezy.Setup({
  eventHandler: (data) => {
    // Handle events
  }
});
```

**Available Events**:

- **`Checkout.Success`** - Returns order object with immediate transaction details
- **`PaymentMethodUpdate.Mounted`** - Overlay loaded successfully
- **`PaymentMethodUpdate.Closed`** - User dismissed the form
- **`PaymentMethodUpdate.Updated`** - Payment method changed successfully

**Benefit**: Enables real-time application state management following customer transactions

---

## Testing & Going Live

### Test Mode Overview

Lemon Squeezy provides a built-in test environment for every store.

**Default Behavior**: When you first sign up, your store operates in test mode by default.

**Isolation**: "A test environment completely separate from your live store, with separate products, customers and purchases."

### Key Test Mode Features

#### Isolated Environment

Test and live modes maintain completely separate data sets, allowing you to experiment freely without affecting production.

#### Email Handling

During testing, all emails—including receipts, subscription notifications, and broadcasts—route to the **store owner and team members**, regardless of the customer email used during checkout.

#### Testing Capabilities

- Make test purchases through your store's checkout
- Execute full webhook integration testing
- Manually simulate individual subscription webhooks from the dashboard

### Best Practices

**Recommendation**: "Make dummy purchases, test the API and set up webhooks with a data set separate from your live store."

Start development in test mode.

### Going Live Checklist

When transitioning to production, address these critical areas:

#### 1. API Keys

**⚠️ Critical**: "Generate a new live mode API key to connect with the live mode API endpoints."

Test and live keys work **only** on their respective sides.

#### 2. Webhooks

Establish **separate test and live webhooks**, ensuring production webhooks point to your live endpoints.

#### 3. Products

Test mode products don't automatically transfer to live mode.

**Solution**: Use the "Copy to Live Mode" feature

**⚠️ Important**: Copied products receive **new IDs**, requiring URL updates.

#### 4. Dashboard Personalization

Consider adding subscription-specific charts:
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- Churn rate
- Trial conversion rate

---

## Tutorials

### 1. Next.js SaaS Billing Integration

#### Overview

Comprehensive guide for building a billing portal for SaaS applications using Next.js and Lemon Squeezy.

**Features Covered**:
- Plan selection and signup interface
- Plan data synchronization from billing provider
- Webhook listeners for subscription updates
- Plan change functionality
- Subscription cancellation and resuming capabilities
- Pause/unpause subscription options
- Payment method updates

#### Implementation Stack

- TypeScript
- Next.js
- Auth.js for authentication
- Tailwind CSS for styling
- Lemon Squeezy SDK
- Drizzle ORM
- Neon database
- Wedges UI components

#### Key Setup Steps

**API Configuration** (`.env`):

```
LEMONSQUEEZY_API_KEY={your-api-key}
LEMONSQUEEZY_STORE_ID={store-id}
LEMONSQUEEZY_WEBHOOK_SECRET={webhook-secret}
```

**Install SDK**:

```bash
pnpm install @lemonsqueezy/lemonsqueezy.js
```

**Configure the SDK**: Set up with your API key before making requests.

#### Plan Synchronization

Use `listProducts` method with `include: ['variants']` to fetch products and variants.

**Storage**: Store plan data in a database model tracking:
- Product IDs
- Variant IDs
- Pricing
- Subscription intervals

#### Creating Checkouts

The `SignupButton` component handles checkout creation and opens a modal using Lemon.js.

**Implementation**: Generate checkout URLs with customer email and user ID for tracking subscriptions.

#### Webhook Integration

Set up webhook endpoints to listen for subscription events:
- `subscription_created`
- `subscription_updated`

**Validation**: Verify incoming requests using the signing secret via the `X-Signature` header before processing.

**⚠️ Critical Requirement**: "Return a `200` response quickly so Lemon Squeezy knows the request was successful."

#### Subscription Management

Implement functions for:
- Canceling subscriptions
- Pausing/unpausing payments
- Retrieving payment update URLs
- Accessing customer portal links
- Changing subscription plans

#### Display Subscription Data

Show customers:
- Current plan
- Renewal dates
- Pricing
- Status

**Implementation**: UI displays different information based on subscription status (active, paused, cancelled, etc.).

#### Plan Changes

Create a dedicated page allowing active subscribers to upgrade or downgrade plans.

**Filtering**: System filters available plans based on subscription type (usage-based vs. standard).

#### Resources

Full implementation: [github.com/lmsqueezy/nextjs-billing](https://github.com/lmsqueezy/nextjs-billing)

---

### 2. Customer Portal for SaaS

#### Two Approaches

##### No-Code Solution: Pre-Built Customer Portal

The simplest implementation uses Lemon Squeezy's ready-made portal.

**URL Types**:
1. **Signed URLs** - Automatically authenticate customers
2. **Unsigned URLs** - Require email login

**Features**:
- Manage subscriptions
- Update payment details
- Retrieve receipts
- Customization to align with brand identity

##### Custom Approach: API and Webhooks

For deeper integration, build a tailored billing interface:

**Requirements**:
- Retrieve subscription plan data through API
- Process webhook events to keep subscription information current
- Develop UI components for:
  - Subscription creation
  - Plan transitions
  - Subscription cancellation and resumption
  - Pause/resume functionality
  - Payment method updates

**Trade-off**: More development work but complete design control.

---

### 3. Usage-Based Subscriptions

#### Core Concepts

Usage-based billing charges customers for "what they use" rather than "what they plan to use."

**Key Difference**: Bills in arrears based on actual consumption during each billing cycle.

**Checkout Behavior**: Customers skip checkout charges, but payment details are captured.

**Requirement**: Your application must report usage data to Lemon Squeezy, which then calculates final invoices.

#### Implementation Steps

##### 1. Enable Metered Billing

Toggle "Usage is metered?" in product settings.

Select aggregation method:
- Sum of usage during period
- Most recent usage

##### 2. Set Up Webhooks

Configure webhooks to receive notifications when subscriptions are created or modified.

**⚠️ Critical**: Store subscription item IDs locally—required for reporting usage data.

##### 3. Send Customers to Checkout

Customers proceed through standard checkout flows.

**Important**: No payment is collected; payment methods are stored for future billing.

##### 4. Report Usage Data

Send usage information via usage records endpoint.

**Frequency Options**:
- Report immediately after each unit consumption
- Send daily batch updates with cumulative totals

**Actions**:
- `"increment"` - Adds to existing quantity
- `"set"` - Replaces previous quantity

---

### 4. Webhooks in Next.js

#### Implementation Steps

**Project Setup**: Create route handler in `src/app/api/webhooks/route.ts`

#### Signature Verification

**⚠️ Critical**: "The first thing the webhook handler should do is verify the webhook signature"

**Process**:
1. Extract `X-Signature` header from request
2. Compute HMAC-SHA256 hash of raw request body using webhook secret
3. Use `crypto.timingSafeEqual()` for safe comparison (prevents timing attacks)

#### Data Processing

After validation, parse JSON payload to access:
- Event name: `data['meta']['event_name']`
- Attributes: `data['data']['attributes']`
- Entity ID: `data['data']['id']`

#### Webhook Configuration

Configure in Lemon Squeezy settings:
- Select events to receive (e.g., `order_created`, `subscription_*` events)

#### Environment Setup

Store webhook secret:

```
LEMONSQUEEZY_WEBHOOK_SECRET=your_secret_here
```

---

### 5. Preview Checkout Total

#### Overview

Display estimated checkout totals to customers before payment.

**Method**: Make API call that calculates costs based on location, discounts, and tax details.

#### API Implementation

**Endpoint**: `POST https://api.lemonsqueezy.com/v1/checkouts`

**Required Parameters**:
- `"preview": true` in attributes
- `billing_address` with customer's country
- `tax_number` if applicable
- `discount_code` if customer has one

**⚠️ Security Requirement**: "Never query the API directly from a client (e.g., a browser). Always create a server-side wrapper" to protect your secret API key.

#### Response Data

The API returns a `preview` object containing:
- Currency information and exchange rates
- Subtotal (before tax and discounts)
- Discount amounts applied
- Tax calculations
- Final total
- Formatted values for display (e.g., "$28.56")

#### Display Example

Show customers:

```
Subtotal: $24.00
Tax: $4.56
Total: $28.56
```

**Benefit**: Transparent pricing display improves customer confidence.

---

### 6. API Related Resources

#### Overview

The API allows loading multiple related data objects in a single request using the `include` query parameter.

**Benefits**:
- Reduces number of API calls needed
- Helps avoid rate limiting issues

#### Key Use Cases

##### Products and Variants

**Inefficient Approach** (multiple requests):
```
GET /products
GET /products/1/variants
GET /products/2/variants
```

**Efficient Approach** (single request):
```
GET https://api.lemonsqueezy.com/v1/products?include=variants
```

**Response Structure**:
- `data` array with products
- `included` array containing all variant objects

##### Multiple Relationships

Separate with commas:

```
GET https://api.lemonsqueezy.com/v1/products?include=variants,store
```

##### Additional Examples

- **Single product with store**: `?include=store`
- **Subscriptions with customers**: `?include=customer`
- **Subscription with invoices**: `?include=subscription-invoices`

#### Response Structure

When using `include` parameters:

- **`data`**: Primary resource objects
- **`included`**: Related resource objects you requested

**Format**: JSON:API format allows efficient data retrieval without multiple round trips.

---

### 7. SaaS Subscription Plans

#### Core Concept

Lemon Squeezy uses a **Product/Variant system**.

- **Product**: Functions as a category
- **Variants**: Specific offerings within that category

**Default**: "A product has at least one variant (the default variant), but can have as many as needed."

#### Typical SaaS Setup

Create one product with multiple variants representing different plan options:
- Monthly billing cycle
- Yearly billing cycle

#### Setup Steps

1. **Create Product**: Navigate to Products page, select "+ New Product"
2. **Add Details**: Enter product name (e.g., "SaaS Subscription") and description
3. **Configure Variants**: Add variants for each plan tier
   - Monthly: $10/month
   - Yearly: $100/year
4. **Enable Features**: Toggle options like "Generate license keys" as needed
5. **Publish**: Click "Publish product" to activate

#### Customer Experience

Variants appear differently across touchpoints:

- **Storefront**: Shows price ranges across active variants
- **Checkout**: Displays product with selectable variant options
- **Receipts & Portal**: Shows both product and variant names

**Note**: "If a custom variant has been added, and it's not disabled, the default variant will not be used."

---

### 8. Changing Subscriber Plans

#### Dashboard Method

1. Navigate to Subscriptions section
2. Select any active subscription
3. Click "Modify subscription"
4. Choose new product and variant
5. Select proration handling option
6. Apply changes

#### API Implementation

Send **PATCH request** to subscriptions endpoint with:
- Subscription ID
- New product and variant IDs in request attributes

#### Proration Options

##### Default Behavior

When upgrading to a costlier plan or changing billing intervals:
"A prorated charge will be added to user's next renewal."

##### Immediate Charging

Include `"invoice_immediately": true` to bill the proration amount right away.

##### Disable Proration

Add `"disable_prorations": true` so customers "just start paying the new price from the next renewal."

#### Key Features

- Support for both dashboard and API-based changes
- Flexible proration handling to match business needs
- Automatic customer notification via receipt when charges occur
- Seamless integration for subscription management workflows

---

## Summary of Critical Points

### ⚠️ Usage-Based Billing

1. **Initial checkout charge is ALWAYS $0**
2. **Quantity at checkout is IGNORED**
3. **Must create usage records after subscription_created**
4. **Store subscription_item_id for usage reporting**
5. **Billing happens retrospectively based on usage records**

### ⚠️ Webhooks

1. **Always return HTTP 200 quickly**
2. **Process data asynchronously**
3. **Verify X-Signature header**
4. **Store events locally for troubleshooting**

### ⚠️ Security

1. **Never expose API keys in client-side code**
2. **Use server-side wrappers for API calls**
3. **Rotate keys regularly**
4. **Use crypto.timingSafeEqual() for signature comparison**

### ⚠️ Test vs Live Mode

1. **Separate API keys**
2. **Separate webhook endpoints**
3. **Products must be copied to live mode**
4. **New IDs after copying products**

---

## Quick Reference: Common Operations

### Create Checkout (Usage-Based Billing)

```javascript
POST /v1/checkouts
{
  "data": {
    "type": "checkouts",
    "attributes": {
      "custom_data": {
        "user_id": "123",
        "user_count": 6
      }
    },
    "relationships": {
      "store": { "data": { "type": "stores", "id": "1" } },
      "variant": { "data": { "type": "variants", "id": "123" } }
    }
  }
}
```

### Report Usage

```javascript
POST /v1/usage-records
{
  "data": {
    "type": "usage-records",
    "attributes": {
      "quantity": 6,
      "action": "set"
    },
    "relationships": {
      "subscription-item": {
        "data": {
          "type": "subscription-items",
          "id": "12345"
        }
      }
    }
  }
}
```

### Change Subscription Plan

```javascript
PATCH /v1/subscriptions/{id}
{
  "data": {
    "type": "subscriptions",
    "id": "{id}",
    "attributes": {
      "variant_id": "456",
      "invoice_immediately": true
    }
  }
}
```

### Cancel Subscription

```javascript
DELETE /v1/subscriptions/{id}
```

### Resume Subscription

```javascript
PATCH /v1/subscriptions/{id}
{
  "data": {
    "type": "subscriptions",
    "id": "{id}",
    "attributes": {
      "cancelled": false
    }
  }
}
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-13
**Source**: Official LemonSqueezy Documentation
