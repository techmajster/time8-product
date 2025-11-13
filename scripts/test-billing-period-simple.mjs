#!/usr/bin/env node

/**
 * Test billing period change on existing subscription
 * This should work regardless of usage-based vs volume pricing
 */

import { createClient } from '@supabase/supabase-js';

const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MONTHLY_VARIANT_ID = 972634;
const ANNUAL_VARIANT_ID = 972635;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testBillingPeriodChange() {
  const lsSubscriptionId = process.argv[2] || '1447969';

  console.log('🧪 Testing Billing Period Change');
  console.log(`📋 Subscription: ${lsSubscriptionId}\n`);

  // Get current state
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('lemonsqueezy_subscription_id', lsSubscriptionId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !subscription || subscription.length === 0) {
    console.error('❌ Subscription not found:', error);
    return;
  }

  const sub = subscription[0];
  console.log('📊 Current State:');
  console.log(`  Variant ID: ${sub.lemonsqueezy_variant_id}`);
  console.log(`  Quantity: ${sub.quantity}`);
  console.log(`  Current Seats: ${sub.current_seats}`);

  const currentVariant = sub.lemonsqueezy_variant_id;
  const isMonthly = currentVariant == MONTHLY_VARIANT_ID;
  const targetVariant = isMonthly ? ANNUAL_VARIANT_ID : MONTHLY_VARIANT_ID;
  const targetName = isMonthly ? 'Annual' : 'Monthly';

  console.log(`\n🔄 Changing ${isMonthly ? 'Monthly' : 'Annual'} → ${targetName}`);
  console.log(`  Current: ${currentVariant}`);
  console.log(`  Target: ${targetVariant}`);
  console.log(`  Expected quantity after change: ${sub.quantity} (should be preserved)\n`);

  // Make the change
  const response = await fetch(
    `https://api.lemonsqueezy.com/v1/subscriptions/${lsSubscriptionId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`,
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json'
      },
      body: JSON.stringify({
        data: {
          type: 'subscriptions',
          id: lsSubscriptionId.toString(),
          attributes: {
            variant_id: parseInt(targetVariant)
          }
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ API Error:', response.status, error);
    return;
  }

  const result = await response.json();
  const newQuantity = result.data.attributes.first_subscription_item?.quantity;

  console.log('✅ API Response:');
  console.log(`  New Variant ID: ${result.data.attributes.variant_id}`);
  console.log(`  Quantity: ${newQuantity}`);

  if (newQuantity === sub.quantity) {
    console.log('\n✅ SUCCESS: Quantity preserved during billing period change!');
  } else {
    console.log(`\n❌ FAILURE: Quantity changed from ${sub.quantity} to ${newQuantity}`);
  }

  console.log('\n⏳ Waiting 5 seconds for webhook to sync...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Check database after webhook
  const { data: updated } = await supabase
    .from('subscriptions')
    .select('lemonsqueezy_variant_id, quantity, current_seats')
    .eq('id', sub.id)
    .single();

  if (updated) {
    console.log('\n📊 Database After Webhook:');
    console.log(`  Variant ID: ${updated.lemonsqueezy_variant_id}`);
    console.log(`  Quantity: ${updated.quantity}`);
    console.log(`  Current Seats: ${updated.current_seats}`);

    const dbQuantityPreserved = updated.quantity === sub.quantity;
    const dbSeatsPreserved = updated.current_seats === sub.current_seats;

    if (dbQuantityPreserved && dbSeatsPreserved) {
      console.log('\n🎉 TEST PASSED: Billing period changed and quantity preserved!');
    } else {
      console.log('\n⚠️  TEST FAILED: Quantity or seats changed in database');
    }
  }
}

testBillingPeriodChange().catch(console.error);
