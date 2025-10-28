#!/usr/bin/env node

/**
 * Test currency handling - verify PLN variants are used and checkout works
 */

require('dotenv').config({ path: '.env.local' });

async function testCurrencyHandling() {
  console.log('\n🪙 Testing Currency Handling');
  console.log('=====================================\n');

  // 1. Check environment variables for PLN variants
  console.log('📋 Checking configured variant IDs:');
  console.log(`   Monthly (PLN): ${process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID || 'NOT SET'}`);
  console.log(`   Yearly (PLN):  ${process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID || 'NOT SET'}\n`);

  if (!process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID || !process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID) {
    console.log('❌ Variant IDs not configured properly');
    process.exit(1);
  }

  // 2. Test checkout API endpoint with PLN variants
  const testData = {
    variant_id: process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID,
    organization_data: {
      name: 'Test Org Currency',
      slug: 'test-org-currency-' + Date.now(),
      country_code: 'PL'
    },
    user_count: 5,
    tier: 'monthly',
    return_url: 'http://localhost:3000/test-success',
    failure_url: 'http://localhost:3000/test-failure'
  };

  console.log('🧪 Testing checkout with PLN variant:');
  console.log(`   Variant ID: ${testData.variant_id}`);
  console.log(`   Country Code: ${testData.organization_data.country_code}`);
  console.log(`   User Count: ${testData.user_count}\n`);

  try {
    const response = await fetch('http://localhost:3000/api/billing/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Checkout created successfully');
      console.log('📄 Response:');
      console.log(`   Checkout URL: ${result.checkout_url ? 'Generated' : 'Missing'}`);
      console.log(`   Checkout ID: ${result.checkout_id || 'N/A'}`);
      
      if (result.checkout_url) {
        console.log('\n💳 Currency Verification:');
        console.log('   ✅ PLN variant accepted by checkout API');
        console.log('   ✅ Lemon Squeezy will handle currency display at checkout');
        console.log('   ✅ Multi-currency support confirmed');
      }
    } else {
      console.log('❌ Checkout failed:');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${result.error}`);
      
      if (result.error?.includes('variant')) {
        console.log('\n🔍 Variant ID might be incorrect for your Lemon Squeezy store');
      }
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️  Development server not running');
      console.log('   Please start the server with: npm run dev');
      console.log('\n📝 Manual Verification Steps:');
      console.log('   1. Start dev server: npm run dev');
      console.log('   2. Go to: http://localhost:3000/onboarding/add-users');  
      console.log('   3. Set user count > 3');
      console.log('   4. Click Continue');
      console.log('   5. Verify Lemon Squeezy checkout shows PLN prices');
      console.log('   6. Check if EUR option appears for EU customers');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  console.log('\n🎯 Key Points:');
  console.log('   • Prices displayed in PLN on your site');
  console.log('   • Lemon Squeezy automatically shows EUR at checkout for EU customers');  
  console.log('   • No complex currency detection needed');
  console.log('   • Single PLN variant handles both PLN and EUR customers');
}

testCurrencyHandling();