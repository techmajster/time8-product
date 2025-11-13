#!/usr/bin/env node

/**
 * Check if LemonSqueezy variants are configured for usage-based billing
 */

const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY;
const MONTHLY_VARIANT_ID = 972634;
const ANNUAL_VARIANT_ID = 972635;

if (!LEMONSQUEEZY_API_KEY) {
  console.error('❌ Missing LEMONSQUEEZY_API_KEY');
  process.exit(1);
}

async function checkVariant(variantId, name) {
  console.log(`\n🔍 Checking ${name} Variant (ID: ${variantId})`);
  console.log('='.repeat(60));

  try {
    const response = await fetch(
      `https://api.lemonsqueezy.com/v1/variants/${variantId}`,
      {
        headers: {
          'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`,
          'Accept': 'application/vnd.api+json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ API Error: ${response.status} - ${error}`);
      return;
    }

    const data = await response.json();
    const attrs = data.data.attributes;

    console.log(`Status: ${attrs.status}`);
    console.log(`Name: ${attrs.name}`);
    console.log(`Description: ${attrs.description}`);
    console.log(`\n💰 Pricing:`);
    console.log(`  Price: ${attrs.price} ${attrs.price_currency}`);
    console.log(`  Interval: ${attrs.interval} ${attrs.interval_count}`);

    console.log(`\n📊 Usage-Based Billing:`);
    console.log(`  Is Metered: ${attrs.is_usage_based ? '✅ YES' : '❌ NO'}`);

    if (attrs.is_usage_based) {
      console.log(`  Usage Aggregation: ${attrs.usage_aggregation || 'N/A'}`);
      console.log(`  Per Unit Price: ${attrs.per_unit_price || 'N/A'}`);
    }

    console.log(`\n🔧 Configuration:`);
    console.log(`  Product ID: ${attrs.product_id}`);
    console.log(`  Sort Order: ${attrs.sort}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  console.log('🚀 LemonSqueezy Variant Usage-Based Billing Check\n');

  await checkVariant(MONTHLY_VARIANT_ID, 'Monthly');
  await checkVariant(ANNUAL_VARIANT_ID, 'Annual');

  console.log('\n' + '='.repeat(60));
  console.log('✅ Check Complete');
  console.log('='.repeat(60));
}

main().catch(console.error);
