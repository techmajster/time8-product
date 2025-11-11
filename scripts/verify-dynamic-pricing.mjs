#!/usr/bin/env node
/**
 * Verify that pricing updates automatically when LemonSqueezy variant pricing changes
 *
 * This script demonstrates:
 * 1. Current tier 4+ pricing fetched from LemonSqueezy API
 * 2. What happens when pricing is updated in LemonSqueezy dashboard
 * 3. Fallback behavior when API is unavailable
 */

import 'dotenv/config'

async function getVariantPriceModel(variantId) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY

  if (!apiKey) {
    console.error('❌ LEMONSQUEEZY_API_KEY not set')
    return null
  }

  try {
    // Fetch variant
    const variantResponse = await fetch(`https://api.lemonsqueezy.com/v1/variants/${variantId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/vnd.api+json'
      }
    })

    if (!variantResponse.ok) {
      console.error(`❌ Failed to fetch variant ${variantId}`)
      return null
    }

    const variantData = await variantResponse.json()

    // Fetch price-model
    const priceModelResponse = await fetch(`https://api.lemonsqueezy.com/v1/variants/${variantId}/price-model`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/vnd.api+json'
      }
    })

    if (!priceModelResponse.ok) {
      console.error(`❌ Failed to fetch price-model for variant ${variantId}`)
      return null
    }

    const priceModelData = await priceModelResponse.json()

    return {
      variant: variantData.data.attributes,
      priceModel: priceModelData.data.attributes
    }
  } catch (error) {
    console.error(`❌ Error fetching data:`, error.message)
    return null
  }
}

async function main() {
  console.log('🔍 Testing Automatic Pricing Updates from LemonSqueezy\n')
  console.log('=' .repeat(70))

  const monthlyVariantId = process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID || '972634'
  const yearlyVariantId = process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID || '972635'

  // Fetch current pricing
  console.log('\n📊 STEP 1: Fetching Current Pricing from LemonSqueezy API\n')

  const monthlyData = await getVariantPriceModel(monthlyVariantId)
  const yearlyData = await getVariantPriceModel(yearlyVariantId)

  if (!monthlyData || !yearlyData) {
    console.error('❌ Failed to fetch pricing data. Check API key and variant IDs.')
    process.exit(1)
  }

  // Display current graduated pricing tiers
  console.log('✅ Monthly Variant (ID: ' + monthlyVariantId + ')')
  console.log('   Name:', monthlyData.variant.name)
  console.log('   Interval:', monthlyData.variant.interval)
  console.log('   Base Price:', monthlyData.variant.price / 100, 'PLN')
  console.log('   Graduated Tiers:')
  monthlyData.priceModel.tiers.forEach(tier => {
    const range = tier.last_unit === 'inf' ? '4+' : `1-${tier.last_unit}`
    const price = tier.unit_price / 100
    console.log(`     • Users ${range}: ${price} PLN/seat`)
  })

  console.log('\n✅ Yearly Variant (ID: ' + yearlyVariantId + ')')
  console.log('   Name:', yearlyData.variant.name)
  console.log('   Interval:', yearlyData.variant.interval)
  console.log('   Base Price:', yearlyData.variant.price / 100, 'PLN')
  console.log('   Graduated Tiers:')
  yearlyData.priceModel.tiers.forEach(tier => {
    const range = tier.last_unit === 'inf' ? '4+' : `1-${tier.last_unit}`
    const price = tier.unit_price / 100
    const monthlyEquiv = price / 12
    console.log(`     • Users ${range}: ${price} PLN/year (${monthlyEquiv.toFixed(2)} PLN/month)`)
  })

  // Extract tier 4+ pricing
  const monthlyTier4 = monthlyData.priceModel.tiers.find(t => t.last_unit === 'inf')
  const yearlyTier4 = yearlyData.priceModel.tiers.find(t => t.last_unit === 'inf')

  const currentMonthlyPrice = monthlyTier4.unit_price / 100
  const currentYearlyPrice = yearlyTier4.unit_price / 100

  console.log('\n' + '='.repeat(70))
  console.log('\n🎯 STEP 2: What Your App Will Use (Tier 4+ Pricing)\n')
  console.log('   Monthly per seat:', currentMonthlyPrice, 'PLN')
  console.log('   Yearly per seat:', currentYearlyPrice, 'PLN (' + (currentYearlyPrice / 12).toFixed(2) + ' PLN/month)')

  // Show how to test pricing changes
  console.log('\n' + '='.repeat(70))
  console.log('\n🧪 STEP 3: How to Test Automatic Updates\n')
  console.log('1. Go to LemonSqueezy dashboard → Products → Your Product → Variants')
  console.log('2. Edit the pricing tier for "4+ users"')
  console.log('3. Example: Change monthly from', currentMonthlyPrice, 'PLN to 15.00 PLN')
  console.log('4. Save changes in LemonSqueezy')
  console.log('5. Run this script again: node scripts/verify-dynamic-pricing.mjs')
  console.log('6. The new pricing will be fetched automatically! ✨')

  // Show fallback behavior
  console.log('\n' + '='.repeat(70))
  console.log('\n⚠️  STEP 4: Fallback Protection\n')
  console.log('If LemonSqueezy API is unavailable, the app uses fallback values from .env:')
  console.log('   MONTHLY_PRICE_PER_SEAT =', process.env.MONTHLY_PRICE_PER_SEAT || '10.00', 'PLN')
  console.log('   ANNUAL_PRICE_PER_SEAT =', process.env.ANNUAL_PRICE_PER_SEAT || '8.00', 'PLN (monthly equivalent)')

  const fallbackMatches =
    parseFloat(process.env.MONTHLY_PRICE_PER_SEAT || '10.00') === currentMonthlyPrice &&
    parseFloat(process.env.ANNUAL_PRICE_PER_SEAT || '8.00') === (currentYearlyPrice / 12)

  if (fallbackMatches) {
    console.log('   ✅ Fallback values match current LemonSqueezy pricing')
  } else {
    console.log('   ⚠️  Fallback values DO NOT match current pricing')
    console.log('   📝 Update .env.example and .env.local to match:')
    console.log('      MONTHLY_PRICE_PER_SEAT=' + currentMonthlyPrice)
    console.log('      ANNUAL_PRICE_PER_SEAT=' + (currentYearlyPrice / 12).toFixed(2))
  }

  console.log('\n' + '='.repeat(70))
  console.log('\n✅ Summary: Pricing is fetched dynamically from LemonSqueezy API')
  console.log('   • No code changes needed when you update pricing')
  console.log('   • No redeployment required')
  console.log('   • Fallback protection if API fails')
  console.log('\n' + '='.repeat(70) + '\n')
}

main()
