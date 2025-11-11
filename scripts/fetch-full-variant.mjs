#!/usr/bin/env node
/**
 * Fetch full LemonSqueezy variant details including pricing tiers
 */

import 'dotenv/config'
import { writeFileSync } from 'fs'

async function fetchVariantFull(variantId) {
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
  const monthlyVariantId = process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID || '972634'
  const yearlyVariantId = process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID || '972635'

  console.log('📦 Fetching MONTHLY variant full data...\n')
  const monthlyData = await fetchVariantFull(monthlyVariantId)
  if (monthlyData) {
    writeFileSync('monthly-variant.json', JSON.stringify(monthlyData, null, 2))
    console.log('✅ Saved to monthly-variant.json')
    console.log(JSON.stringify(monthlyData, null, 2))
  }

  console.log('\n📦 Fetching YEARLY variant full data...\n')
  const yearlyData = await fetchVariantFull(yearlyVariantId)
  if (yearlyData) {
    writeFileSync('yearly-variant.json', JSON.stringify(yearlyData, null, 2))
    console.log('✅ Saved to yearly-variant.json')
    console.log(JSON.stringify(yearlyData, null, 2))
  }
}

main()
