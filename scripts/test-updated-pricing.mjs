#!/usr/bin/env node
/**
 * Test the updated getVariantPrice function to verify it extracts graduated pricing correctly
 */

import 'dotenv/config'

// Test by directly calling the API (reproducing the getVariantPrice logic)
async function getVariantPrice(variantId) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY

  if (!apiKey) {
    console.error('LEMONSQUEEZY_API_KEY not set')
    return null
  }

  try {
    // Fetch variant data
    const variantResponse = await fetch(`https://api.lemonsqueezy.com/v1/variants/${variantId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/vnd.api+json'
      }
    })

    if (!variantResponse.ok) {
      console.error(`Failed to fetch variant ${variantId}: ${variantResponse.status}`)
      return null
    }

    const variantData = await variantResponse.json()
    const variantAttrs = variantData.data.attributes

    // Fetch price-model to get graduated pricing tiers
    const priceModelResponse = await fetch(`https://api.lemonsqueezy.com/v1/variants/${variantId}/price-model`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/vnd.api+json'
      }
    })

    let price

    if (priceModelResponse.ok) {
      const priceModelData = await priceModelResponse.json()
      const tiers = priceModelData.data?.attributes?.tiers

      // Extract tier 4+ pricing (the last tier with last_unit: "inf")
      if (tiers && Array.isArray(tiers) && tiers.length > 1) {
        const paidTier = tiers.find(tier => tier.last_unit === 'inf' || tier.last_unit === Infinity)
        if (paidTier) {
          // Use unit_price_decimal (string) if available, fallback to unit_price (deprecated)
          const unitPrice = paidTier.unit_price_decimal || paidTier.unit_price || '0'
          price = parseFloat(unitPrice) / 100
          console.log(`   ✅ Extracted tier 4+ price: ${price} PLN from graduated pricing (unit_price_decimal: ${unitPrice})`)
        } else {
          price = parseFloat(variantAttrs.price || '0') / 100
          console.warn('   ⚠️ Could not find tier 4+ pricing, using base price')
        }
      } else {
        price = parseFloat(variantAttrs.price || '0') / 100
      }
    } else {
      console.warn('   ⚠️ Could not fetch price-model, using base variant price')
      price = parseFloat(variantAttrs.price || '0') / 100
    }

    const priceParts = variantAttrs.price_formatted?.split(' ') || []
    const currency = priceParts[priceParts.length - 1] || 'PLN'

    return {
      price,
      currency,
      interval: variantAttrs.interval || 'month',
      name: variantAttrs.name || 'Unknown'
    }
  } catch (error) {
    console.error('Error fetching variant pricing:', error)
    return null
  }
}

async function getDynamicPricing() {
  const monthlyVariantId = process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID
  const yearlyVariantId = process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID

  const [monthlyPricing, yearlyPricing] = await Promise.all([
    getVariantPrice(monthlyVariantId),
    getVariantPrice(yearlyVariantId)
  ])

  const fallbackPricing = {
    monthlyPricePerSeat: parseFloat(process.env.MONTHLY_PRICE_PER_SEAT || '10.00'),
    annualPricePerSeat: parseFloat(process.env.ANNUAL_PRICE_PER_SEAT || '8.00'),
    currency: 'PLN',
    monthlyVariantId,
    yearlyVariantId
  }

  if (!monthlyPricing || !yearlyPricing) {
    console.warn('⚠️ Using fallback pricing due to API error')
    return fallbackPricing
  }

  return {
    monthlyPricePerSeat: monthlyPricing.price,
    annualPricePerSeat: yearlyPricing.price / 12,
    currency: monthlyPricing.currency || 'PLN',
    monthlyVariantId,
    yearlyVariantId
  }
}

async function main() {
  console.log('🧪 Testing updated getVariantPrice() function\n')

  const monthlyVariantId = process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID || '972634'
  const yearlyVariantId = process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID || '972635'

  console.log('📊 Testing Monthly Variant...')
  const monthlyPrice = await getVariantPrice(monthlyVariantId)
  if (monthlyPrice) {
    console.log('✅ Monthly Variant Result:')
    console.log(`   Price: ${monthlyPrice.price} ${monthlyPrice.currency}`)
    console.log(`   Interval: ${monthlyPrice.interval}`)
    console.log(`   Name: ${monthlyPrice.name}`)
    console.log(`   Expected: 10.00 PLN`)
    console.log(`   Match: ${monthlyPrice.price === 10.00 ? '✅ PASS' : '❌ FAIL'}`)
  }

  console.log('\n📊 Testing Yearly Variant...')
  const yearlyPrice = await getVariantPrice(yearlyVariantId)
  if (yearlyPrice) {
    console.log('✅ Yearly Variant Result:')
    console.log(`   Price: ${yearlyPrice.price} ${yearlyPrice.currency}`)
    console.log(`   Interval: ${yearlyPrice.interval}`)
    console.log(`   Name: ${yearlyPrice.name}`)
    console.log(`   Expected: 96.00 PLN`)
    console.log(`   Match: ${yearlyPrice.price === 96.00 ? '✅ PASS' : '❌ FAIL'}`)
  }

  console.log('\n📊 Testing getDynamicPricing()...')
  const pricing = await getDynamicPricing()
  console.log('✅ Dynamic Pricing Result:')
  console.log(`   Monthly per seat: ${pricing.monthlyPricePerSeat} ${pricing.currency}`)
  console.log(`   Annual per seat (monthly equivalent): ${pricing.annualPricePerSeat} ${pricing.currency}`)
  console.log(`   Expected: 10.00 PLN monthly, 8.00 PLN monthly equivalent`)
  console.log(`   Monthly Match: ${pricing.monthlyPricePerSeat === 10.00 ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`   Annual Match: ${pricing.annualPricePerSeat === 8.00 ? '✅ PASS' : '❌ FAIL'}`)
}

main()
