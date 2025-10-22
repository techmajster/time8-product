# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-08-28-lemon-squeezy-payments/spec.md

## Schema Changes

### New Tables

```sql
-- Products synchronized from Lemon Squeezy
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lemonsqueezy_product_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Price variants for products (monthly/yearly)
CREATE TABLE price_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  lemonsqueezy_variant_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  interval TEXT NOT NULL CHECK (interval IN ('month', 'year')),
  interval_count INTEGER NOT NULL DEFAULT 1,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Map organizations to Lemon Squeezy customers
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  lemonsqueezy_customer_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Active subscriptions
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  lemonsqueezy_subscription_id TEXT UNIQUE NOT NULL,
  variant_id UUID REFERENCES price_variants(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'cancelled', 'expired', 'on_trial', 'paused')),
  quantity INTEGER NOT NULL DEFAULT 1,
  renews_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Webhook event log for debugging
CREATE TABLE billing_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  lemonsqueezy_event_id TEXT UNIQUE,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processed', 'failed', 'skipped')),
  error_message TEXT
);

-- Indexes for performance
CREATE INDEX idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_billing_events_event_type ON billing_events(event_type);
CREATE INDEX idx_billing_events_processed_at ON billing_events(processed_at);
```

### Modifications to Existing Tables

```sql
-- Add billing fields to organizations table
ALTER TABLE organizations 
ADD COLUMN paid_seats INTEGER DEFAULT 0,
ADD COLUMN billing_override BOOLEAN DEFAULT false,
ADD COLUMN billing_override_type TEXT CHECK (billing_override_type IN ('lifetime', 'partner', 'promotional')),
ADD COLUMN billing_override_seats INTEGER,
ADD COLUMN billing_override_expires_at TIMESTAMPTZ;

-- Add constraint to ensure override fields are set together
ALTER TABLE organizations
ADD CONSTRAINT billing_override_fields_check 
CHECK (
  (billing_override = false AND billing_override_type IS NULL) OR
  (billing_override = true AND billing_override_type IS NOT NULL)
);
```

### Row Level Security Policies

```sql
-- Products and price variants are public read
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);

ALTER TABLE price_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Price variants are viewable by everyone" ON price_variants FOR SELECT USING (true);

-- Customers, subscriptions only viewable by organization members
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers viewable by organization members" ON customers 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_members.organization_id = customers.organization_id 
      AND organization_members.user_id = auth.uid()
    )
  );

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subscriptions viewable by organization members" ON subscriptions 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_members.organization_id = subscriptions.organization_id 
      AND organization_members.user_id = auth.uid()
    )
  );

-- Billing events only for system (no user access)
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
-- No policies = no user access
```

## Migration Strategy

1. Run migrations in order to create schema
2. Manually sync initial products/variants from Lemon Squeezy dashboard
3. Set billing_override=true for own organization with type='lifetime' after deployment
4. All monetary values stored in smallest currency unit (cents) to avoid decimal issues

## Rationale

- **Separate customers table**: Allows mapping between our organizations and Lemon Squeezy's customer records
- **Billing events log**: Critical for debugging webhook issues and maintaining audit trail
- **Status enums**: Match Lemon Squeezy's subscription states exactly for consistency
- **Override system**: Flexible enough for various free account scenarios while maintaining data integrity
- **RLS policies**: Ensure billing data privacy while allowing public pricing information