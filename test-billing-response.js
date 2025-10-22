const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function simulateBillingAPI() {
  console.log('🧪 Simulating billing API for Test BB8...\n');
  
  const organizationId = 'b01a2dba-e289-410d-af0e-50fda183a306';
  
  // Step 1: Get organization
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, subscription_tier, paid_seats')
    .eq('id', organizationId)
    .single();

  if (orgError || !organization) {
    console.error('❌ Organization not found:', orgError);
    return;
  }
  
  console.log('🏢 Organization data:');
  console.log(`   Name: ${organization.name}`);
  console.log(`   Subscription tier: ${organization.subscription_tier}`);
  console.log(`   Paid seats: ${organization.paid_seats}`);
  
  // Step 2: Check if free tier
  if (organization.subscription_tier === 'free' || organization.paid_seats === 0) {
    console.log('\n❌ API would return: subscription = null (Free tier)');
    return;
  }
  
  // Step 3: Get subscription record
  const { data: subscriptionRecord, error: subError } = await supabase
    .from('subscriptions')
    .select('lemonsqueezy_subscription_id, status, quantity')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .single();

  if (subError || !subscriptionRecord) {
    console.error('❌ No subscription record found:', subError);
    console.log('❌ API would return: subscription = null');
    return;
  }
  
  console.log('\n📋 Subscription record found:');
  console.log(`   Lemon Squeezy ID: ${subscriptionRecord.lemonsqueezy_subscription_id}`);
  console.log(`   Status: ${subscriptionRecord.status}`);
  console.log(`   Quantity: ${subscriptionRecord.quantity}`);
  
  // Step 4: Try to fetch from Lemon Squeezy
  const lemonSqueezyId = subscriptionRecord.lemonsqueezy_subscription_id;
  
  try {
    console.log(`\n🔍 Attempting to fetch from Lemon Squeezy: ${lemonSqueezyId}`);
    
    const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${lemonSqueezyId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        'Accept': 'application/vnd.api+json'
      }
    });
    
    if (!response.ok) {
      console.log(`❌ Lemon Squeezy API failed: ${response.status} ${response.statusText}`);
      console.log('❌ API would return: subscription = null (fallback to free)');
      return;
    }
    
    const data = await response.json();
    console.log('✅ Lemon Squeezy response successful');
    console.log(`   Real subscription found: ${data.data.attributes.variant_name}`);
    console.log(`   Real quantity: ${data.data.attributes.first_subscription_item?.quantity}`);
    console.log('✅ API would return: Real subscription data from Lemon Squeezy');
    
  } catch (error) {
    console.log(`❌ Lemon Squeezy fetch error: ${error.message}`);
    console.log('❌ API would return: subscription = null (fallback)');
  }
}

simulateBillingAPI();