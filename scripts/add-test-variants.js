#!/usr/bin/env node
/**
 * Add Test Price Variants to Existing Product
 * 
 * Run with: node scripts/add-test-variants.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function main() {
  console.log('💰 Adding test price variants');
  console.log('============================\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Get existing product
    console.log('📦 Finding existing product...');
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('lemonsqueezy_product_id', 'test-product-1')
      .single();

    if (productError || !product) {
      console.error('❌ Product not found:', productError?.message);
      return;
    }

    console.log('✅ Found product:', product.name);

    // Delete existing variants first
    await supabase
      .from('price_variants')
      .delete()
      .eq('product_id', product.id);

    // Create test variants
    const variants = [
      {
        product_id: product.id,
        lemonsqueezy_variant_id: 'test-variant-1',
        name: '1 Seat - Monthly',
        price_cents: 300, // 3 EUR in cents
        quantity: 1,
        interval: 'month',
        interval_count: 1,
        currency: 'EUR'
      },
      {
        product_id: product.id,
        lemonsqueezy_variant_id: 'test-variant-2',
        name: '1 Seat - Annual',
        price_cents: 2880, // 2.4 EUR/month * 12 in cents
        quantity: 1,
        interval: 'year',
        interval_count: 1,
        currency: 'EUR'
      },
      {
        product_id: product.id,
        lemonsqueezy_variant_id: 'test-variant-5-monthly',
        name: '5 Seats - Monthly',
        price_cents: 1500, // 3 EUR * 5 in cents
        quantity: 5,
        interval: 'month',
        interval_count: 1,
        currency: 'EUR'
      },
      {
        product_id: product.id,
        lemonsqueezy_variant_id: 'test-variant-5-annual',
        name: '5 Seats - Annual',
        price_cents: 14400, // 2.4 EUR * 5 * 12 in cents
        quantity: 5,
        interval: 'year',
        interval_count: 1,
        currency: 'EUR'
      },
      {
        product_id: product.id,
        lemonsqueezy_variant_id: 'test-variant-10-monthly',
        name: '10 Seats - Monthly',
        price_cents: 3000, // 3 EUR * 10 in cents
        quantity: 10,
        interval: 'month',
        interval_count: 1,
        currency: 'EUR'
      },
      {
        product_id: product.id,
        lemonsqueezy_variant_id: 'test-variant-10-annual',
        name: '10 Seats - Annual',
        price_cents: 28800, // 2.4 EUR * 10 * 12 in cents
        quantity: 10,
        interval: 'year',
        interval_count: 1,
        currency: 'EUR'
      }
    ];

    console.log('\n💰 Creating price variants...');
    
    for (const variant of variants) {
      const { error: variantError } = await supabase
        .from('price_variants')
        .insert(variant);

      if (variantError) {
        console.error(`❌ Error creating variant ${variant.name}:`, variantError);
      } else {
        console.log(`✅ Created variant: ${variant.name} - ${(variant.price_cents/100).toFixed(2)} ${variant.currency}`);
      }
    }

    console.log('\n🎉 Test variants added successfully!');
    console.log('\nYou can now test the billing UI with these variants.');

  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});