#!/usr/bin/env node
/**
 * Fetch LemonSqueezy price-model to get graduated pricing tiers
 */

import 'dotenv/config'

async function fetchPriceModel(variantId) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY

  if (!apiKey) {
    console.error('❌ LEMONSQUEEZY_API_KEY not found in environment')
    process.exit(1)
  }

  try {
    const response = await fetch(`https://api.lemonsqueezy.com/v1/variants/${variantId}/price-model`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/vnd.api+json'
      }
    })

    if (!response.ok) {
      console.error(`❌ Failed to fetch price-model for variant ${variantId}: ${response.status}`)
      const error = await response.text()
      console.error('Error details:', error)
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`❌ Error fetching price-model:`, error.message)
    return null
  }
}

async function main() {
  const monthlyVariantId = process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID || '972634'
  const yearlyVariantId = process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID || '972635'

  console.log('📊 Fetching MONTHLY variant price model...\n')
  const monthlyPriceModel = await fetchPriceModel(monthlyVariantId)
  if (monthlyPriceModel) {
    console.log(JSON.stringify(monthlyPriceModel, null, 2))

    if (monthlyPriceModel.data?.attributes?.price_tiers) {
      console.log('\n🎯 MONTHLY Graduated Pricing Tiers:')
      monthlyPriceModel.data.attributes.price_tiers.forEach(tier => {
        console.log(`   Tier: ${tier.min_quantity || 1}-${tier.max_quantity || '∞'} units`)
        console.log(`   Price per unit: ${tier.unit_price} cents = ${tier.unit_price / 100} PLN`)
        console.log(`   Fixed fee: ${tier.fixed_fee || 0} cents`)
        console.log()
      })
    }
  }

  console.log('\n📊 Fetching YEARLY variant price model...\n')
  const yearlyPriceModel = await fetchPriceModel(yearlyVariantId)
  if (yearlyPriceModel) {
    console.log(JSON.stringify(yearlyPriceModel, null, 2))

    if (yearlyPriceModel.data?.attributes?.price_tiers) {
      console.log('\n🎯 YEARLY Graduated Pricing Tiers:')
      yearlyPriceModel.data.attributes.price_tiers.forEach(tier => {
        console.log(`   Tier: ${tier.min_quantity || 1}-${tier.max_quantity || '∞'} units`)
        console.log(`   Price per unit: ${tier.unit_price} cents = ${tier.unit_price / 100} PLN`)
        console.log(`   Fixed fee: ${tier.fixed_fee || 0} cents`)
        console.log()
      })
    }
  }
}

main()
