/**
 * Test both organizations' billing APIs
 */

const kontury = '6f13fe6e-9247-4bba-b195-8369ea608d59';
const bb8Studio = 'a5b891a0-f314-498d-aa9d-fa9dcc13d0ce';

async function testBillingAPIs() {
  console.log('🧪 Testing billing APIs for both organizations...\n');
  
  // Test Kontury (8 seats yearly)
  console.log('📋 Testing Kontury (should show 8 seats, yearly plan):');
  try {
    const response = await fetch(`http://localhost:3000/api/billing/subscription?organization_id=${kontury}&_t=${Date.now()}`);
    const data = await response.json();
    
    if (data.success && data.subscription) {
      console.log(`✅ Kontury subscription found:`);
      console.log(`   Plan: ${data.subscription.variant.name}`);
      console.log(`   Seats: ${data.subscription.quantity}`);
      console.log(`   Status: ${data.subscription.status_formatted}`);
      console.log(`   Renews: ${new Date(data.subscription.renews_at).toLocaleDateString('pl-PL')}`);
    } else {
      console.log('❌ Kontury: No subscription found');
      console.log(data);
    }
  } catch (error) {
    console.error('❌ Kontury API error:', error.message);
  }
  
  console.log('');
  
  // Test BB8 Studio (6 seats monthly)
  console.log('📋 Testing BB8 Studio (should show 6 seats, monthly plan):');
  try {
    const response = await fetch(`http://localhost:3000/api/billing/subscription?organization_id=${bb8Studio}&_t=${Date.now()}`);
    const data = await response.json();
    
    if (data.success && data.subscription) {
      console.log(`✅ BB8 Studio subscription found:`);
      console.log(`   Plan: ${data.subscription.variant.name}`);
      console.log(`   Seats: ${data.subscription.quantity}`);
      console.log(`   Status: ${data.subscription.status_formatted}`);
      console.log(`   Renews: ${new Date(data.subscription.renews_at).toLocaleDateString('pl-PL')}`);
    } else {
      console.log('❌ BB8 Studio: No subscription found');
      console.log(data);
    }
  } catch (error) {
    console.error('❌ BB8 Studio API error:', error.message);
  }
}

testBillingAPIs();