#!/usr/bin/env node

/**
 * End-to-End Test for Usage-Based Billing
 *
 * This script tests the complete usage-based billing flow:
 * 1. Create usage record with 5 seats
 * 2. Increase to 10 seats
 * 3. Change billing period (monthly <-> annual) and verify seats preserved
 * 4. Decrease to 3 seats
 * 5. Verify all webhook syncs work correctly
 *
 * Usage: node scripts/test-e2e-usage-billing.mjs <subscription_id>
 */

import { createClient } from '@supabase/supabase-js';

const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// LemonSqueezy variant IDs
const MONTHLY_VARIANT_ID = 972634;
const ANNUAL_VARIANT_ID = 972635;

if (!LEMONSQUEEZY_API_KEY || !supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper: Fetch subscription from LemonSqueezy
async function fetchLSSubscription(lsSubscriptionId) {
  const response = await fetch(
    `https://api.lemonsqueezy.com/v1/subscriptions/${lsSubscriptionId}`,
    {
      headers: {
        'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`,
        'Accept': 'application/vnd.api+json'
      }
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LemonSqueezy API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Helper: Get subscription item ID from subscription
async function getSubscriptionItemId(lsSubscriptionId) {
  const response = await fetch(
    `https://api.lemonsqueezy.com/v1/subscription-items?filter[subscription_id]=${lsSubscriptionId}`,
    {
      headers: {
        'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`,
        'Accept': 'application/vnd.api+json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch subscription items: ${response.status}`);
  }

  const data = await response.json();

  if (!data.data || data.data.length === 0) {
    throw new Error('No subscription items found');
  }

  return data.data[0].id;
}

// Helper: Create usage record (set absolute quantity)
async function setUsageQuantity(subscriptionItemId, quantity, description) {
  console.log(`\n📊 Setting usage to ${quantity} seats...`);

  const response = await fetch(
    'https://api.lemonsqueezy.com/v1/usage-records',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`,
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json'
      },
      body: JSON.stringify({
        data: {
          type: 'usage-records',
          attributes: {
            quantity,
            action: 'set',
            description: description || `E2E Test: Set quantity to ${quantity}`
          },
          relationships: {
            'subscription-item': {
              data: {
                type: 'subscription-items',
                id: subscriptionItemId
              }
            }
          }
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Usage record creation failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log(`✅ Usage record created: ${data.data.id}`);
  return data;
}

// Helper: Change billing period (variant)
async function changeBillingPeriod(lsSubscriptionId, newVariantId) {
  const variantName = newVariantId === MONTHLY_VARIANT_ID ? 'Monthly' : 'Annual';
  console.log(`\n🔄 Changing billing period to ${variantName}...`);

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
            variant_id: parseInt(newVariantId)
          }
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Billing period change failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log(`✅ Billing period changed to ${variantName}`);
  return data;
}

// Helper: Wait for webhook sync
async function waitForWebhookSync(dbSubscriptionId, expectedQuantity, maxAttempts = 10) {
  console.log(`\n⏳ Waiting for webhook sync (expecting quantity: ${expectedQuantity})...`);

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('quantity, current_seats, pending_seats')
      .eq('id', dbSubscriptionId)
      .single();

    if (error) {
      console.error('❌ Error fetching subscription:', error);
      continue;
    }

    console.log(`   Attempt ${i + 1}: quantity=${subscription.quantity}, current_seats=${subscription.current_seats}`);

    if (subscription.quantity === expectedQuantity && subscription.current_seats === expectedQuantity) {
      console.log(`✅ Webhook synced successfully!`);
      return subscription;
    }
  }

  throw new Error(`Webhook did not sync after ${maxAttempts} attempts`);
}

// Helper: Get database subscription
async function getDBSubscription(lsSubscriptionId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('lemonsqueezy_subscription_id', lsSubscriptionId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to fetch subscription from database: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(`No subscription found with LemonSqueezy ID: ${lsSubscriptionId}`);
  }

  return data[0];
}

// Helper: Verify subscription state
function verifySubscriptionState(subscription, expectedQuantity, testName) {
  console.log(`\n🔍 Verifying ${testName}...`);
  console.log(`   Quantity: ${subscription.quantity} (expected: ${expectedQuantity})`);
  console.log(`   Current Seats: ${subscription.current_seats} (expected: ${expectedQuantity})`);

  const quantityMatch = subscription.quantity === expectedQuantity;
  const seatsMatch = subscription.current_seats === expectedQuantity;

  if (quantityMatch && seatsMatch) {
    console.log(`✅ ${testName} PASSED`);
    return true;
  } else {
    console.log(`❌ ${testName} FAILED`);
    return false;
  }
}

// Main test flow
async function runE2ETests() {
  const lsSubscriptionId = process.argv[2];

  if (!lsSubscriptionId) {
    console.error('Usage: node scripts/test-e2e-usage-billing.mjs <lemonsqueezy_subscription_id>');
    process.exit(1);
  }

  console.log('🚀 Starting E2E Usage-Based Billing Tests');
  console.log(`📋 Testing subscription: ${lsSubscriptionId}\n`);

  const results = [];

  try {
    // Step 0: Get subscription item ID
    console.log('📍 Step 0: Fetch subscription details');
    const subscriptionItemId = await getSubscriptionItemId(lsSubscriptionId);
    console.log(`✅ Subscription Item ID: ${subscriptionItemId}`);

    const dbSubscription = await getDBSubscription(lsSubscriptionId);
    console.log(`✅ Database Subscription ID: ${dbSubscription.id}`);

    const initialVariantId = dbSubscription.lemonsqueezy_variant_id;
    console.log(`✅ Current Variant: ${initialVariantId === MONTHLY_VARIANT_ID ? 'Monthly' : 'Annual'}`);

    // Test 6.1: Set usage to 5 seats
    console.log('\n' + '='.repeat(60));
    console.log('📍 Test 6.1: Create subscription with 5 seats via usage records');
    console.log('='.repeat(60));

    await setUsageQuantity(subscriptionItemId, 5, 'E2E Test 6.1: Initial 5 seats');
    const test1 = await waitForWebhookSync(dbSubscription.id, 5);
    results.push({
      test: '6.1 - Set 5 seats',
      passed: verifySubscriptionState(test1, 5, 'Test 6.1')
    });

    // Test 6.2: Increase to 10 seats
    console.log('\n' + '='.repeat(60));
    console.log('📍 Test 6.2: Increase to 10 seats via usage records API');
    console.log('='.repeat(60));

    await setUsageQuantity(subscriptionItemId, 10, 'E2E Test 6.2: Increase to 10 seats');
    const test2 = await waitForWebhookSync(dbSubscription.id, 10);
    results.push({
      test: '6.2 - Increase to 10 seats',
      passed: verifySubscriptionState(test2, 10, 'Test 6.2')
    });

    // Test 6.3 & 6.4: Change billing period
    const targetVariantId = initialVariantId === MONTHLY_VARIANT_ID ? ANNUAL_VARIANT_ID : MONTHLY_VARIANT_ID;
    const targetName = targetVariantId === MONTHLY_VARIANT_ID ? 'Monthly' : 'Annual';

    console.log('\n' + '='.repeat(60));
    console.log(`📍 Test 6.3: Change to ${targetName}, verify 10 seats preserved`);
    console.log('='.repeat(60));

    await changeBillingPeriod(lsSubscriptionId, targetVariantId);
    const test3 = await waitForWebhookSync(dbSubscription.id, 10);
    results.push({
      test: `6.3 - Change to ${targetName}, preserve 10 seats`,
      passed: verifySubscriptionState(test3, 10, 'Test 6.3')
    });

    // Change back
    const originalName = initialVariantId === MONTHLY_VARIANT_ID ? 'Monthly' : 'Annual';

    console.log('\n' + '='.repeat(60));
    console.log(`📍 Test 6.4: Change back to ${originalName}, verify 10 seats preserved`);
    console.log('='.repeat(60));

    await changeBillingPeriod(lsSubscriptionId, initialVariantId);
    const test4 = await waitForWebhookSync(dbSubscription.id, 10);
    results.push({
      test: `6.4 - Change back to ${originalName}, preserve 10 seats`,
      passed: verifySubscriptionState(test4, 10, 'Test 6.4')
    });

    // Test 6.5: Decrease to 3 seats
    console.log('\n' + '='.repeat(60));
    console.log('📍 Test 6.5: Decrease to 3 seats via usage records API');
    console.log('='.repeat(60));

    await setUsageQuantity(subscriptionItemId, 3, 'E2E Test 6.5: Decrease to 3 seats');
    const test5 = await waitForWebhookSync(dbSubscription.id, 3);
    results.push({
      test: '6.5 - Decrease to 3 seats',
      passed: verifySubscriptionState(test5, 3, 'Test 6.5')
    });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.test}`);
    });

    const allPassed = results.every(r => r.passed);
    const passedCount = results.filter(r => r.passed).length;

    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log(`🎉 ALL TESTS PASSED (${passedCount}/${results.length})`);
    } else {
      console.log(`⚠️  SOME TESTS FAILED (${passedCount}/${results.length} passed)`);
    }
    console.log('='.repeat(60));

    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error('\n❌ E2E Test Failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runE2ETests();
