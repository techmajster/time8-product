/**
 * Diagnostic script to check subscription state
 * Run with: node check-subscriptions.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSubscriptions() {
  console.log('🔍 Checking subscription state...\n');

  // Fetch all active subscriptions
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*')
    .in('status', ['active', 'on_trial']);

  if (error) {
    console.error('❌ Error fetching subscriptions:', error);
    return;
  }

  console.log(`Found ${subscriptions.length} active subscriptions:\n`);

  for (const sub of subscriptions) {
    console.log(`\n📋 Subscription: ${sub.id}`);
    console.log(`   Organization: ${sub.organization_id}`);
    console.log(`   LemonSqueezy ID: ${sub.lemonsqueezy_subscription_id}`);
    console.log(`   Subscription Item ID: ${sub.lemonsqueezy_subscription_item_id}`);
    console.log(`   Billing Type: ${sub.billing_type}`);
    console.log(`   Current Seats: ${sub.current_seats}`);
    console.log(`   Quantity: ${sub.quantity}`);
    console.log(`   Status: ${sub.status}`);

    // Check for issues
    const issues = [];

    if (!sub.lemonsqueezy_subscription_item_id) {
      issues.push('❌ MISSING subscription_item_id (required for seat updates)');
    }

    if (sub.billing_type === 'volume') {
      issues.push('⚠️  LEGACY billing type (should be usage_based or quantity_based)');
    }

    if (sub.billing_type === null) {
      issues.push('❌ NULL billing_type (must be set)');
    }

    if (issues.length > 0) {
      console.log('\n   Issues:');
      issues.forEach(issue => console.log(`   ${issue}`));
    } else {
      console.log('\n   ✅ No issues detected');
    }
  }

  // Check environment variables
  console.log('\n\n🔑 Environment Variables:');
  console.log(`   LEMONSQUEEZY_API_KEY: ${process.env.LEMONSQUEEZY_API_KEY ? '✅ Set' : '❌ NOT SET'}`);
  console.log(`   LEMONSQUEEZY_MONTHLY_VARIANT_ID: ${process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID || '❌ NOT SET'}`);
  console.log(`   LEMONSQUEEZY_YEARLY_VARIANT_ID: ${process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID || '❌ NOT SET'}`);
  console.log(`   YEARLY_PRICE_PER_SEAT: ${process.env.YEARLY_PRICE_PER_SEAT || '❌ NOT SET'}`);
}

checkSubscriptions().catch(console.error);
