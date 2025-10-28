/**
 * Update both organizations with correct subscription data
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updateBothSubscriptions() {
  try {
    console.log('📝 Updating both organizations with correct subscription data...\n');
    
    // 1. Update Kontury (8 seats, yearly subscription 1447723) - ALREADY CORRECT
    console.log('✅ Kontury already correct: 8 seats, subscription 1447723');
    
    // 2. Update BB8 Studio (6 seats, monthly subscription 1447969)
    console.log('📝 Updating BB8 Studio to 6 paid seats...');
    
    // Update BB8 Studio organization
    const { data: updatedOrg, error: orgError } = await supabase
      .from('organizations')
      .update({
        paid_seats: 6, // Update from 3 to 6
        subscription_tier: 'active'
      })
      .eq('slug', 'bb8-studio')
      .select();
      
    if (orgError) {
      console.error('❌ Failed to update BB8 Studio org:', orgError);
      return;
    }
    
    console.log('✅ Updated BB8 Studio organization:', updatedOrg[0]);
    
    // Check if BB8 Studio has existing subscription record
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', 'a5b891a0-f314-498d-aa9d-fa9dcc13d0ce') // BB8 Studio ID
      .single();
      
    if (existingSub) {
      // Update existing subscription
      console.log('📝 Updating existing BB8 Studio subscription record...');
      const { data: updatedSub, error: subError } = await supabase
        .from('subscriptions')
        .update({
          lemonsqueezy_subscription_id: '1447969', // Monthly subscription
          quantity: 6 // 6 seats
        })
        .eq('organization_id', 'a5b891a0-f314-498d-aa9d-fa9dcc13d0ce')
        .select();
        
      if (subError) {
        console.error('❌ Failed to update BB8 Studio subscription:', subError);
        return;
      }
      
      console.log('✅ Updated BB8 Studio subscription:', updatedSub[0]);
    } else {
      // Create new subscription record for BB8 Studio
      console.log('📝 Creating new subscription record for BB8 Studio...');
      
      // First get/create customer record
      let customerId;
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('organization_id', 'a5b891a0-f314-498d-aa9d-fa9dcc13d0ce')
        .single();
        
      if (existingCustomer) {
        customerId = existingCustomer.id;
        console.log('✅ Using existing customer record');
      } else {
        const { data: newCustomer, error: custError } = await supabase
          .from('customers')
          .insert({
            organization_id: 'a5b891a0-f314-498d-aa9d-fa9dcc13d0ce',
            lemonsqueezy_customer_id: '6631179', // Same customer in Lemon Squeezy
            email: 'sub@bb8.pl'
          })
          .select()
          .single();
          
        if (custError) {
          console.error('❌ Failed to create customer:', custError);
          return;
        }
        
        customerId = newCustomer.id;
        console.log('✅ Created new customer record');
      }
      
      // Create subscription record
      const { data: newSub, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          organization_id: 'a5b891a0-f314-498d-aa9d-fa9dcc13d0ce',
          customer_id: customerId,
          lemonsqueezy_subscription_id: '1447969', // Monthly subscription
          variant_id: null,
          status: 'active',
          quantity: 6,
          renews_at: '2025-09-29T11:52:08+00:00',
          ends_at: null,
          trial_ends_at: null
        })
        .select()
        .single();
        
      if (subError) {
        console.error('❌ Failed to create BB8 Studio subscription:', subError);
        return;
      }
      
      console.log('✅ Created BB8 Studio subscription:', newSub);
    }
    
    console.log('\n🎉 Both organizations updated correctly:');
    console.log('   Kontury: 8 seats (yearly) - subscription 1447723');
    console.log('   BB8 Studio: 6 seats (monthly) - subscription 1447969');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

updateBothSubscriptions();