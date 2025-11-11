#!/usr/bin/env node
/**
 * Fetch LemonSqueezy variant pricing to verify graduated pricing tiers
 */

import 'dotenv/config'

async function fetchVariantPrice(variantId) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY

  if (!apiKey) {
    console.error('❌ LEMONSQUEEZY_API_KEY not found in environment')
    process.exit(1)
  }

  try {
    const response = await fetch(`https://api.lemonsqueezy.com/v1/variants/${variantId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/vnd.api+json'
      }
    })

    if (!response.ok) {
      console.error(`❌ Failed to fetch variant ${variantId}: ${response.status}`)
      const error = await response.text()
      console.error('Error details:', error)
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`❌ Error fetching variant ${variantId}:`, error.message)
    return null
  }
}

async function main() {
  console.log('🔍 Fetching LemonSqueezy variant pricing...\n')

  const monthlyVariantId = process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID || '972634'
  const yearlyVariantId = process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID || '972635'

  console.log(`📋 Monthly Variant ID: ${monthlyVariantId}`)
  const monthlyData = await fetchVariantPrice(monthlyVariantId)

  if (monthlyData) {
    const attrs = monthlyData.data.attributes
    console.log(`✅ Monthly Variant:`)
    console.log(`   Name: ${attrs.name}`)
    console.log(`   Price: ${attrs.price} cents = ${parseFloat(attrs.price) / 100} PLN`)
    console.log(`   Formatted: ${attrs.price_formatted}`)
    console.log(`   Interval: ${attrs.interval}`)
    console.log(`   Description: ${attrs.description}`)
    console.log()
  }

  console.log(`📋 Yearly Variant ID: ${yearlyVariantId}`)
  const yearlyData = await fetchVariantPrice(yearlyVariantId)

  if (yearlyData) {
    const attrs = yearlyData.data.attributes
    console.log(`✅ Yearly Variant:`)
    console.log(`   Name: ${attrs.name}`)
    console.log(`   Price: ${attrs.price} cents = ${parseFloat(attrs.price) / 100} PLN`)
    console.log(`   Formatted: ${attrs.price_formatted}`)
    console.log(`   Interval: ${attrs.interval}`)
    console.log(`   Description: ${attrs.description}`)
    const monthlyEquivalent = parseFloat(attrs.price) / 100 / 12
    console.log(`   Monthly Equivalent: ${monthlyEquivalent.toFixed(2)} PLN/month`)
  }
}

main()
