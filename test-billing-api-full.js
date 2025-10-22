const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Same calculation function as the API
function calculateSeatInfo(paidSeats, currentEmployees) {
  const FREE_SEATS = 3;
  const totalSeats = paidSeats + FREE_SEATS;
  const seatsRemaining = totalSeats - currentEmployees;

  return {
    total_seats: totalSeats,
    paid_seats: paidSeats,
    free_seats: FREE_SEATS,
    current_employees: currentEmployees,
    seats_remaining: Math.max(0, seatsRemaining)
  };
}

async function simulateFullBillingAPI() {
  console.log('🧪 Full billing API simulation for Test BB8...\n');
  
  const organizationId = 'b01a2dba-e289-410d-af0e-50fda183a306';
  
  try {
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
    
    // Mock member count
    const currentMembers = 1; // Simulate 1 current member
    
    // Step 2: Check if free tier
    if (organization.subscription_tier === 'free' || organization.paid_seats === 0) {
      console.log('\n❌ Would return: Free tier response');
      const response = {
        success: true,
        subscription: null,
        organization_info: {
          id: organization.id,
          name: organization.name,
          seat_info: calculateSeatInfo(0, currentMembers)
        }
      };
      console.log('Response:', JSON.stringify(response, null, 2));
      return;
    }
    
    // Step 3: Get subscription record
    const { data: subscriptionRecord, error: subError } = await supabase
      .from('subscriptions')
      .select('lemonsqueezy_subscription_id')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single();

    if (subError || !subscriptionRecord) {
      console.error('❌ No subscription record found:', subError);
      console.log('❌ Would return: subscription = null');
      return;
    }
    
    console.log(`\n📋 Subscription record: ${subscriptionRecord.lemonsqueezy_subscription_id}`);
    
    // Step 4: Try Lemon Squeezy (will fail for fake ID)
    try {
      console.log('🔍 Attempting Lemon Squeezy fetch...');
      const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionRecord.lemonsqueezy_subscription_id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
          'Accept': 'application/vnd.api+json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API failed: ${response.status}`);
      }
      
      console.log('✅ Lemon Squeezy success (unexpected!)');
    } catch (lemonSqueezyError) {
      console.log('❌ Lemon Squeezy failed (expected)');
      console.log('🔄 Using fallback database data...');
      
      // Step 5: Fallback response (NEW LOGIC)
      const fallbackSubscriptionData = {
        id: subscriptionRecord.lemonsqueezy_subscription_id,
        status: 'active',
        status_formatted: 'Active',
        quantity: organization.paid_seats + 3, // Convert paid seats back to total users
        product: {
          name: 'Leave Management System',
          description: 'Database subscription (Lemon Squeezy unavailable)'
        },
        variant: {
          name: 'Monthly Plan',
          price: 1299, // Default monthly price in cents
          quantity: organization.paid_seats + 3
        },
        billing_info: {
          card_brand: null,
          card_last_four: null,
          customer_portal_url: null
        },
        test_mode: true,
        seat_info: calculateSeatInfo(organization.paid_seats, currentMembers)
      };

      const response = {
        success: true,
        subscription: fallbackSubscriptionData
      };
      
      console.log('\n✅ NEW API Response (with fallback):');
      console.log(`   Plan: ${response.subscription.variant.name}`);
      console.log(`   Total users: ${response.subscription.quantity}`);
      console.log(`   Paid seats: ${response.subscription.seat_info.paid_seats}`);
      console.log(`   Status: ${response.subscription.status_formatted}`);
      console.log(`   Price: ${response.subscription.variant.price / 100} PLN`);
      
      return response;
    }
    
  } catch (error) {
    console.error('💥 API simulation error:', error);
  }
}

simulateFullBillingAPI();