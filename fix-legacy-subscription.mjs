/**
 * Fix legacy subscription billing_type
 * Run with: node fix-legacy-subscription.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixLegacySubscription() {
  console.log('🔧 Fixing legacy subscription...\n');

  const subscriptionId = 'bdec1db5-879d-4db8-8d5a-e9e45e577c74';
  const lemonSqueezySubscriptionId = '1447969';

  // Step 1: Determine billing type based on variant
  console.log('📡 Fetching subscription from LemonSqueezy...');
  const response = await fetch(
    `https://api.lemonsqueezy.com/v1/subscriptions/${lemonSqueezySubscriptionId}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        'Accept': 'application/vnd.api+json'
      }
    }
  );

  if (!response.ok) {
    console.error('❌ Failed to fetch subscription from LemonSqueezy');
    return;
  }

  const data = await response.json();
  const variantId = data.data.attributes.variant_id;
  const intervalUnit = data.data.attributes.billing_anchor;

  console.log(`   Variant ID: ${variantId}`);
  console.log(`   Monthly Variant: ${process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID}`);
  console.log(`   Yearly Variant: ${process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID}`);

  // Determine billing type
  let billingType;
  if (variantId === parseInt(process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID)) {
    billingType = 'usage_based';
    console.log('   ✅ Detected: MONTHLY (usage_based)');
  } else if (variantId === parseInt(process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID)) {
    billingType = 'quantity_based';
    console.log('   ✅ Detected: YEARLY (quantity_based)');
  } else {
    console.log(`   ⚠️  Unknown variant ID: ${variantId}`);
    console.log('   Defaulting to usage_based (monthly)');
    billingType = 'usage_based';
  }

  // Step 2: Update database
  console.log(`\n📝 Updating database with billing_type: ${billingType}...`);
  const { error } = await supabase
    .from('subscriptions')
    .update({ billing_type: billingType })
    .eq('id', subscriptionId);

  if (error) {
    console.error('❌ Failed to update subscription:', error);
    return;
  }

  console.log('✅ Successfully updated subscription!');
  console.log(`\n📋 Subscription ${subscriptionId} is now ${billingType}\n`);

  // Step 3: Verify update
  const { data: updated, error: fetchError } = await supabase
    .from('subscriptions')
    .select('id, billing_type, current_seats')
    .eq('id', subscriptionId)
    .single();

  if (fetchError) {
    console.error('❌ Failed to verify update:', fetchError);
    return;
  }

  console.log('📋 Verified subscription state:');
  console.log(`   ID: ${updated.id}`);
  console.log(`   Billing Type: ${updated.billing_type}`);
  console.log(`   Current Seats: ${updated.current_seats}`);
  console.log('\n✅ You can now use the update-subscription-quantity endpoint!\n');
}

fixLegacySubscription().catch(console.error);
