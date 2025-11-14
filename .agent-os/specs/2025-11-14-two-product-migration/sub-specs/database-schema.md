# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-11-14-two-product-migration/spec.md

## Schema Changes

### Add `lemonsqueezy_product_id` Column

**Table**: `subscriptions`

**Migration SQL**:
```sql
-- Add column to track which LemonSqueezy product (monthly vs yearly)
ALTER TABLE subscriptions
ADD COLUMN lemonsqueezy_product_id VARCHAR(255);

-- Create index for product-based queries
CREATE INDEX idx_subscriptions_product_id
ON subscriptions(lemonsqueezy_product_id);

-- Backfill existing records based on variant mapping
UPDATE subscriptions
SET lemonsqueezy_product_id = '621389'
WHERE lemonsqueezy_variant_id = '972634';  -- Monthly variant

UPDATE subscriptions
SET lemonsqueezy_product_id = '693341'
WHERE lemonsqueezy_variant_id IN ('972635', '1090954');  -- Yearly variants (old and new)

-- Add comment for documentation
COMMENT ON COLUMN subscriptions.lemonsqueezy_product_id IS 'LemonSqueezy product ID: 621389 (monthly usage-based), 693341 (yearly quantity-based)';
```

### Add Migration Tracking Columns (Optional but Recommended)

**Table**: `subscriptions`

**Migration SQL**:
```sql
-- Add column to track if subscription was migrated to another product
ALTER TABLE subscriptions
ADD COLUMN migrated_to_subscription_id VARCHAR(255);

-- Add index for migration tracking
CREATE INDEX idx_subscriptions_migrated_to
ON subscriptions(migrated_to_subscription_id);

-- Add comment
COMMENT ON COLUMN subscriptions.migrated_to_subscription_id IS 'If this subscription was upgraded/migrated, stores the new subscription ID';
```

## Updated Schema Definition

After migration, the `subscriptions` table will have:

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- LemonSqueezy identifiers
  lemonsqueezy_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  lemonsqueezy_subscription_item_id VARCHAR(255),
  lemonsqueezy_product_id VARCHAR(255),  -- NEW: 621389 or 693341
  lemonsqueezy_variant_id VARCHAR(255) NOT NULL,  -- 972634 or 1090954
  lemonsqueezy_customer_id VARCHAR(255),

  -- Subscription details
  status VARCHAR(50) NOT NULL,  -- active, on_trial, paused, past_due, cancelled, migrated
  billing_type VARCHAR(50) NOT NULL,  -- usage_based, quantity_based
  current_seats INTEGER NOT NULL DEFAULT 1,

  -- Migration tracking
  migrated_to_subscription_id VARCHAR(255),  -- NEW: Tracks upgrades

  -- Timestamps
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  renews_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes
  CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX idx_subscriptions_organization ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_product_id ON subscriptions(lemonsqueezy_product_id);
CREATE INDEX idx_subscriptions_migrated_to ON subscriptions(migrated_to_subscription_id);
```

## Rationale

### Why `lemonsqueezy_product_id` is Required

1. **Distinguish Monthly vs Yearly**: Currently we only track `variant_id`, but variants can change. Product ID is the stable identifier that tells us if a subscription is on the monthly product (621389) or yearly product (693341).

2. **Validation Logic**: The new validation in `/api/billing/change-billing-period` needs to check `lemonsqueezy_product_id` to prevent yearly→monthly switches.

3. **Migration Detection**: Webhooks can verify if a subscription creation is part of a migration by checking if the old subscription had a different `product_id`.

### Why `migrated_to_subscription_id` is Recommended

1. **Audit Trail**: Provides clear history of which subscriptions were upgraded, useful for debugging billing issues.

2. **Idempotency**: Prevents duplicate cancellations if webhook fires multiple times - check if `migrated_to_subscription_id` is already set.

3. **Customer Support**: Support team can quickly see if a customer upgraded from monthly→yearly and when.

### Why Column is Nullable

**Backward Compatibility**: Existing production data won't have `product_id` immediately. The backfill UPDATE statements populate historical records, but making it nullable prevents breaking existing queries during migration.

**Future**: Once all records are backfilled and webhook is updated, consider adding `NOT NULL` constraint.

## Data Integrity

### Constraints

- `lemonsqueezy_subscription_id` remains UNIQUE to prevent duplicate subscriptions
- No foreign key to "products" table because LemonSqueezy product IDs are external

### Status Values

Add new status value to existing enum:
- `migrated` - Subscription was upgraded to different product (monthly→yearly)

Existing statuses remain:
- `active` - Currently active
- `on_trial` - In trial period
- `paused` - Temporarily paused
- `past_due` - Payment failed
- `cancelled` - User canceled, active until end date
- `expired` - Subscription ended

### Performance Considerations

**Index on `lemonsqueezy_product_id`**: Needed for queries like "find all monthly subscriptions" or "find all yearly subscriptions", especially as user base grows.

**Index on `migrated_to_subscription_id`**: Sparse index (most values will be NULL), but useful for audit queries and preventing duplicate migrations.
