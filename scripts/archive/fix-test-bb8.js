const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function manuallyFixTestBB8() {
  console.log('🔧 Manually fixing Test BB8 subscription...\n');
  
  const testOrgId = 'b01a2dba-e289-410d-af0e-50fda183a306';
  
  // Get the existing customer
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('*')
    .eq('organization_id', testOrgId)
    .single();
    
  let customer = existingCustomer;
  
  if (!customer) {
    console.log('👥 Creating customer record...');
    const { data: newCustomer, error: custError } = await supabase
      .from('customers')
      .insert({
        organization_id: testOrgId,
        lemonsqueezy_customer_id: 'manual_fix_' + Date.now(),
        email: 'test@bb8.pl'
      })
      .select()
      .single();
      
    if (custError) {
      console.error('❌ Customer creation failed:', custError);
      return;
    }
    
    customer = newCustomer;
    console.log('✅ Customer created:', customer.id);
  } else {
    console.log('✅ Using existing customer:', customer.id);
  }
  
  // Create subscription record (6 users monthly)
  console.log('📋 Creating subscription record...');
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .insert({
      organization_id: testOrgId,
      customer_id: customer.id,
      lemonsqueezy_subscription_id: 'manual_sub_' + Date.now(),
      variant_id: null, // Set as null for now
      status: 'active',
      quantity: 6, // Total users purchased
      renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })
    .select()
    .single();
    
  if (subError) {
    console.error('❌ Subscription creation failed:', subError);
    return;
  }
  
  console.log('✅ Subscription created:', subscription.id);
  
  // Update organization (6 total users = 3 paid seats)
  console.log('🏢 Updating organization...');
  const paidSeats = Math.max(0, 6 - 3); // 6 total - 3 free = 3 paid
  
  const { data: updatedOrg, error: orgError } = await supabase
    .from('organizations')
    .update({
      subscription_tier: 'active',
      paid_seats: paidSeats
    })
    .eq('id', testOrgId)
    .select();
    
  if (orgError) {
    console.error('❌ Organization update failed:', orgError);
    return;
  }
  
  console.log('✅ Organization updated:');
  console.log(`   Subscription tier: ${updatedOrg[0].subscription_tier}`);
  console.log(`   Paid seats: ${updatedOrg[0].paid_seats}`);
  
  console.log('\n🎉 Test BB8 subscription manually fixed!');
  console.log('The billing page should now show active subscription with 3 paid seats.');
}

manuallyFixTestBB8();