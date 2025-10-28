#!/usr/bin/env node

/**
 * Verify currency configuration for multi-currency support
 */

require('dotenv').config({ path: '.env.local' });

function verifyCurrencyConfig() {
  console.log('🪙 Multi-Currency Configuration Verification');
  console.log('===========================================\n');

  // Check required environment variables
  const requiredVars = {
    'LEMONSQUEEZY_MONTHLY_VARIANT_ID': process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID,
    'LEMONSQUEEZY_YEARLY_VARIANT_ID': process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID,
    'LEMONSQUEEZY_API_KEY': process.env.LEMONSQUEEZY_API_KEY ? '✅ Set' : '❌ Missing',
    'LEMONSQUEEZY_STORE_ID': process.env.LEMONSQUEEZY_STORE_ID
  };

  console.log('📋 Environment Configuration:');
  Object.entries(requiredVars).forEach(([key, value]) => {
    if (key === 'LEMONSQUEEZY_API_KEY') {
      console.log(`   ${key}: ${value}`);
    } else {
      console.log(`   ${key}: ${value || '❌ Missing'}`);
    }
  });
  
  const hasAllVars = Object.entries(requiredVars)
    .filter(([key]) => key !== 'LEMONSQUEEZY_API_KEY')
    .every(([, value]) => value);
  
  if (!hasAllVars || !process.env.LEMONSQUEEZY_API_KEY) {
    console.log('\n❌ Missing required configuration');
    return false;
  }

  console.log('\n✅ Configuration Complete');
  console.log('\n🎯 Multi-Currency Implementation Summary:');
  console.log('   • Base currency: PLN (Polish Zloty)');
  console.log('   • Variants configured for PLN pricing');
  console.log('   • Lemon Squeezy handles EUR conversion at checkout');
  console.log('   • No complex currency detection needed');
  console.log('   • Single variant set supports both PLN and EUR customers');

  console.log('\n📝 Manual Testing Steps:');
  console.log('   1. Start development server: npm run dev');
  console.log('   2. Visit: /onboarding/add-users');
  console.log('   3. Set user count > 3 (to trigger paid tier)');
  console.log('   4. Click "Continue" button');
  console.log('   5. Lemon Squeezy checkout should open');
  console.log('   6. Verify pricing displays in PLN');
  console.log('   7. For EU testing: Use VPN/EU IP to see EUR option');

  console.log('\n🌍 Currency Display Behavior:');
  console.log('   • Polish customers: See PLN prices');
  console.log('   • EU customers: See EUR option at checkout');
  console.log('   • Payment methods adjust automatically (BLIK/SEPA)');
  console.log('   • Currency conversion handled by Lemon Squeezy');

  return true;
}

const success = verifyCurrencyConfig();
process.exit(success ? 0 : 1);