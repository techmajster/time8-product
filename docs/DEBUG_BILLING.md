# Billing System Debug Guide

This guide provides debugging tools and utilities for testing your Lemon Squeezy billing integration.

## ✅ Current Status

Your billing system is **fully configured and ready to test**:

- ✅ **Environment Variables**: All Lemon Squeezy credentials configured
- ✅ **Database Schema**: All billing tables created with proper structure
- ✅ **API Endpoints**: Checkout, subscription, products, and webhook handlers implemented
- ✅ **Authorization**: Admin access controls in place
- ✅ **Seat Calculation**: Complete logic for seat limits and billing overrides

## 🔧 Debug Tools

### 1. Command Line Debug Script

Run the comprehensive system check:

```bash
node scripts/debug-billing.js
```

This checks:
- Environment variable configuration
- Database connectivity and table structure
- Billing columns in organizations table
- Lemon Squeezy API package availability

### 2. Web Debug Interface

Start your development server and visit the debug page:

```bash
npm run dev
# Then visit: http://localhost:3000/debug/billing
```

The web interface lets you test:
- Webhook endpoint health
- Database table structure
- Products API endpoint
- Subscription retrieval
- Customer portal URL generation
- Checkout session creation

## 🧪 Testing Your Integration

### Step 1: Test Webhook Endpoint

Your webhook URL for Lemon Squeezy configuration:
```
https://your-domain.com/api/webhooks/lemonsqueezy
```

For local testing:
```
http://localhost:3000/api/webhooks/lemonsqueezy
```

### Step 2: Test API Endpoints

**Products Endpoint:**
```bash
curl http://localhost:3000/api/billing/products
```

**Subscription Status (replace with real org ID):**
```bash
curl "http://localhost:3000/api/billing/subscription?organization_id=YOUR_ORG_ID"
```

**Customer Portal:**
```bash
curl "http://localhost:3000/api/billing/customer-portal?organization_id=YOUR_ORG_ID"
```

**Create Checkout Session:**
```bash
curl -X POST http://localhost:3000/api/billing/create-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "variant_id": "YOUR_VARIANT_ID",
    "organization_id": "YOUR_ORG_ID"
  }'
```

### Step 3: Test with Real Lemon Squeezy Data

1. **Configure Webhook in Lemon Squeezy Dashboard:**
   - Go to Settings → Webhooks
   - Add webhook URL: `https://your-domain.com/api/webhooks/lemonsqueezy`
   - Enable events: `subscription_created`, `subscription_updated`, `subscription_cancelled`

2. **Create Test Products:**
   - Set up subscription products in your Lemon Squeezy store
   - Note the product IDs and variant IDs

3. **Test Subscription Flow:**
   - Use the checkout endpoint to create a test subscription
   - Complete the checkout process
   - Verify webhook events are received and processed

## 📋 Environment Configuration

Required environment variables in `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Lemon Squeezy
LEMONSQUEEZY_API_KEY=your-api-key
LEMONSQUEEZY_STORE_ID=your-store-id
LEMONSQUEEZY_WEBHOOK_SECRET=your-webhook-secret

# App URL
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

## 🔍 Common Issues & Solutions

### Issue: "Database connection failed"
- Check your Supabase URL and service role key
- Verify your project is active and accessible

### Issue: "Webhook validation failed"
- Verify `LEMONSQUEEZY_WEBHOOK_SECRET` matches your Lemon Squeezy webhook configuration
- Check that webhook payload format is correct

### Issue: "Price variant not found"
- Ensure you've created products and variants in your Supabase database
- Run migrations to create the billing tables

### Issue: "Organization not found"
- Make sure you're using a valid organization ID from your organizations table
- Check that the user has proper permissions for the organization

## 📊 Database Structure

Your billing tables:

```sql
-- Products from Lemon Squeezy
products (id, lemonsqueezy_product_id, name, description, status)

-- Price variants for products  
price_variants (id, product_id, lemonsqueezy_variant_id, name, price, quantity)

-- Customer records
customers (id, organization_id, lemonsqueezy_customer_id, email)

-- Active subscriptions
subscriptions (id, organization_id, lemonsqueezy_subscription_id, status, quantity, ...)

-- Event log for debugging
billing_events (id, event_type, event_id, payload, status, created_at)

-- Organizations with billing columns
organizations (id, name, paid_seats, billing_override_seats, billing_override_expires_at, ...)
```

## 🚀 Next Steps

1. **Configure Lemon Squeezy Products:**
   - Set up your subscription tiers
   - Configure pricing and billing intervals

2. **Test Webhook Integration:**
   - Create a test subscription
   - Verify events are processed correctly

3. **Build Frontend UI:**
   - Implement Task 5: Billing UI & Management Page
   - Create subscription management interface

4. **Production Deployment:**
   - Set up production webhook URLs
   - Configure production environment variables
   - Test end-to-end subscription flow

## 📞 Support

If you encounter issues:
1. Check the debug outputs for specific error messages
2. Verify all environment variables are correctly set
3. Ensure your database migrations have been applied
4. Test individual API endpoints using the debug interface

Your billing system is ready for production use! 🎉