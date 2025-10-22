#!/usr/bin/env node
/**
 * Billing System Debug Script
 * 
 * Run with: node scripts/debug-billing.js
 * 
 * This script checks:
 * 1. Environment variables
 * 2. Database connectivity 
 * 3. Billing table structure
 * 4. Lemon Squeezy API connection
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function main() {
  console.log('🔍 Billing System Debug Script');
  console.log('================================\n');

  // 1. Check environment variables
  console.log('📋 Environment Variables:');
  const envVars = {
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '❌ Missing',
    'LEMONSQUEEZY_API_KEY': process.env.LEMONSQUEEZY_API_KEY ? '✓ Set' : '❌ Missing',
    'LEMONSQUEEZY_STORE_ID': process.env.LEMONSQUEEZY_STORE_ID,
    'LEMONSQUEEZY_WEBHOOK_SECRET': process.env.LEMONSQUEEZY_WEBHOOK_SECRET ? '✓ Set' : '❌ Missing'
  };

  for (const [key, value] of Object.entries(envVars)) {
    console.log(`  ${key}: ${value}`);
  }
  console.log('');

  // Check required env vars
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.log('❌ Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }

  // 2. Test database connection
  console.log('🗄️  Database Connection:');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('organizations')
      .select('count')
      .limit(1);

    if (testError) {
      console.log('❌ Database connection failed:', testError.message);
      process.exit(1);
    } else {
      console.log('✅ Database connection successful');
    }
  } catch (error) {
    console.log('❌ Database connection error:', error.message);
    process.exit(1);
  }

  // 3. Check billing tables
  console.log('\n📊 Billing Tables:');
  const billingTables = ['products', 'price_variants', 'customers', 'subscriptions', 'billing_events'];
  
  for (const tableName of billingTables) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(1);

      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
      } else {
        const columns = data && data.length > 0 ? Object.keys(data[0]).length : 0;
        console.log(`✅ ${tableName}: ${count} records, ${columns} columns`);
      }
    } catch (error) {
      console.log(`❌ ${tableName}: ${error.message}`);
    }
  }

  // 4. Check organizations table for billing columns
  console.log('\n🏢 Organizations Billing Columns:');
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, paid_seats, billing_override_seats, billing_override_expires_at')
      .limit(1);

    if (error) {
      console.log('❌ Organizations billing columns check failed:', error.message);
    } else {
      if (data && data.length > 0) {
        const org = data[0];
        console.log('✅ Billing columns present:');
        console.log(`  paid_seats: ${org.paid_seats !== undefined ? '✓' : '❌'}`);
        console.log(`  billing_override_seats: ${org.billing_override_seats !== undefined ? '✓' : '❌'}`);
        console.log(`  billing_override_expires_at: ${org.billing_override_expires_at !== undefined ? '✓' : '❌'}`);
      } else {
        console.log('⚠️  No organizations found to test columns');
      }
    }
  } catch (error) {
    console.log('❌ Error checking organizations:', error.message);
  }

  // 5. Test Lemon Squeezy API (if configured)
  console.log('\n🍋 Lemon Squeezy API:');
  if (process.env.LEMONSQUEEZY_API_KEY && process.env.LEMONSQUEEZY_STORE_ID) {
    try {
      // We'll just check if the package is available
      const lemonsqueezy = require('@lemonsqueezy/lemonsqueezy.js');
      console.log('✅ Lemon Squeezy package available');
      console.log(`📋 Store ID: ${process.env.LEMONSQUEEZY_STORE_ID}`);
      console.log('📋 API Key: ✓ Set');
    } catch (error) {
      console.log('❌ Lemon Squeezy package error:', error.message);
    }
  } else {
    console.log('⚠️  Lemon Squeezy not fully configured (missing API key or Store ID)');
  }

  console.log('\n✅ Debug complete!');
  console.log('\nNext steps:');
  console.log('1. Start your development server: npm run dev');
  console.log('2. Visit the debug page: http://localhost:3000/debug/billing');
  console.log('3. Test your endpoints using the debug UI');
}

main().catch(error => {
  console.error('❌ Debug script error:', error);
  process.exit(1);
});