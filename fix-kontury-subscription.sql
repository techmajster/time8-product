-- Fix Kontury subscription by creating missing customer and subscription records
-- Run this to link the actual Lemon Squeezy purchase to the database

BEGIN;

-- First, verify the Kontury organization exists and has the right data
SELECT id, name, slug, subscription_tier, paid_seats 
FROM organizations 
WHERE slug = 'kontury';

-- Create a customer record for Kontury linking to a placeholder Lemon Squeezy customer ID
-- We'll use a placeholder since we don't have the exact customer ID from your purchase
INSERT INTO customers (
    organization_id,
    lemonsqueezy_customer_id,
    email,
    name
) VALUES (
    (SELECT id FROM organizations WHERE slug = 'kontury'),
    'kontury_customer_' || extract(epoch from now())::bigint::text,  -- Unique placeholder
    'admin@kontury.pl',
    'Kontury'
) ON CONFLICT (organization_id) DO NOTHING;

-- Create a subscription record for Kontury with the purchased details
INSERT INTO subscriptions (
    organization_id,
    customer_id,
    lemonsqueezy_subscription_id,
    variant_id,
    status,
    quantity,
    renews_at,
    ends_at,
    trial_ends_at
) VALUES (
    (SELECT id FROM organizations WHERE slug = 'kontury'),
    (SELECT id FROM customers WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'kontury')),
    'kontury_sub_' || extract(epoch from now())::bigint::text,  -- Unique placeholder
    NULL,  -- We don't have the exact variant ID
    'active',
    8,  -- Your purchased seats
    '2026-08-29T09:38:00Z',  -- Annual renewal
    NULL,
    NULL
) ON CONFLICT (lemonsqueezy_subscription_id) DO NOTHING;

-- Verify the records were created
SELECT 
    o.name as organization,
    o.subscription_tier,
    o.paid_seats,
    c.email as customer_email,
    s.status as subscription_status,
    s.quantity as subscription_quantity
FROM organizations o
LEFT JOIN customers c ON c.organization_id = o.id
LEFT JOIN subscriptions s ON s.organization_id = o.id
WHERE o.slug = 'kontury';

COMMIT;