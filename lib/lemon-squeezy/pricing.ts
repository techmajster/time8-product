/**
 * Lemon Squeezy Pricing Utilities
 * 
 * Fetches dynamic pricing from Lemon Squeezy API instead of using hardcoded values.
 * Ensures currency consistency and proper price display.
 */

// Conditional imports to handle module resolution issues
let lemonSqueezySetup: any
let getVariant: any

function initializeLemonSqueezy() {
  if (!lemonSqueezySetup && typeof window === 'undefined') {
    try {
      const lemonSqueezy = require('@lemonsqueezy/lemonsqueezy.js')
      lemonSqueezySetup = lemonSqueezy.lemonSqueezySetup
      getVariant = lemonSqueezy.getVariant
      
      // Setup Lemon Squeezy client
      lemonSqueezySetup({
        apiKey: process.env.LEMONSQUEEZY_API_KEY!,
        onError: (error: any) => console.error('Lemon Squeezy API Error:', error),
      })
    } catch (error) {
      console.warn('LemonSqueezy not available:', error)
    }
  }
}

export interface PricingInfo {
  monthlyPricePerSeat: number
  annualPricePerSeat: number
  currency: string
  monthlyVariantId: string
  yearlyVariantId: string
}

export interface PricingCalculation {
  isFree: boolean
  totalUsers: number
  paidSeats: number
  monthlyTotal: number
  annualTotal: number
  monthlyPerSeat: number
  annualPerSeat: number
  currency: string
}

const FREE_SEATS = 3

/**
 * Get detailed pricing for a specific variant
 * This is the single source of truth for fetching variant pricing from LemonSqueezy API
 * Uses REST API directly for reliability and correctly extracts graduated pricing tiers
 */
export async function getVariantPrice(variantId: string): Promise<{
  price: number;
  currency: string;
  interval: string;
  name: string;
} | null> {
  try {
    if (!process.env.LEMONSQUEEZY_API_KEY) {
      console.error('LEMONSQUEEZY_API_KEY not set')
      return null
    }

    // Fetch variant data directly from LemonSqueezy REST API
    const variantResponse = await fetch(`https://api.lemonsqueezy.com/v1/variants/${variantId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
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
        'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        'Accept': 'application/vnd.api+json'
      }
    })

    let price: number

    if (priceModelResponse.ok) {
      const priceModelData = await priceModelResponse.json()
      const tiers = priceModelData.data?.attributes?.tiers

      // Extract tier 4+ pricing (the last tier with last_unit: "inf")
      if (tiers && Array.isArray(tiers) && tiers.length > 1) {
        // Find the tier for 4+ users (should be the tier with last_unit: "inf")
        const paidTier = tiers.find(tier => tier.last_unit === 'inf' || tier.last_unit === Infinity)
        if (paidTier) {
          price = parseFloat(paidTier.unit_price || '0') / 100
          console.log(`✅ Extracted tier 4+ price: ${price} PLN from graduated pricing`)
        } else {
          // Fallback to base variant price if tier not found
          price = parseFloat(variantAttrs.price || '0') / 100
          console.warn('⚠️ Could not find tier 4+ pricing, using base price')
        }
      } else {
        // No graduated tiers, use base price
        price = parseFloat(variantAttrs.price || '0') / 100
      }
    } else {
      // Fallback to base variant price if price-model fetch fails
      console.warn('⚠️ Could not fetch price-model, using base variant price')
      price = parseFloat(variantAttrs.price || '0') / 100
    }

    // Extract currency from formatted price (e.g., "10,00 PLN" → "PLN")
    const priceParts = variantAttrs.price_formatted?.split(' ') || []
    const currency = priceParts[priceParts.length - 1] || 'PLN'

    return {
      price, // Now correctly returns tier 4+ pricing (10.00 or 96.00)
      currency,
      interval: variantAttrs.interval || 'month', // 'month' or 'year'
      name: variantAttrs.name || 'Unknown'
    }
  } catch (error) {
    console.error('Error fetching variant pricing:', error)
    return null
  }
}

/**
 * Fetch variant pricing from Lemon Squeezy API
 * @deprecated Use getVariantPrice() for more detailed information. This function uses
 * the old SDK which doesn't properly fetch graduated pricing tiers.
 */
async function fetchVariantPricing(variantId: string) {
  console.warn('fetchVariantPricing() is deprecated. Use getVariantPrice() instead.')
  try {
    initializeLemonSqueezy()
    const variant = await getVariant(variantId)

    if (variant.error) {
      console.error('Failed to fetch variant:', variantId, variant.error)
      return null
    }

    const price = parseFloat(variant.data?.data.attributes.price || '0')
    const currency = variant.data?.data.attributes.price_formatted?.split(' ')[1] || 'PLN'

    return {
      price: price / 100, // Convert cents to currency unit
      currency
    }
  } catch (error) {
    console.error('Error fetching variant pricing:', error)
    return null
  }
}

/**
 * Get dynamic pricing information from Lemon Squeezy
 * Uses REST API directly to fetch graduated pricing tiers
 */
export async function getDynamicPricing(): Promise<PricingInfo> {
  const monthlyVariantId = process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID!
  const yearlyVariantId = process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID!

  console.log('🔄 Fetching pricing from LemonSqueezy API...')
  console.log('   Monthly variant:', monthlyVariantId)
  console.log('   Yearly variant:', yearlyVariantId)

  // Fetch pricing for both variants using REST API (correctly handles graduated pricing)
  const [monthlyPricing, yearlyPricing] = await Promise.all([
    getVariantPrice(monthlyVariantId),
    getVariantPrice(yearlyVariantId)
  ])

  console.log('📊 API Response:', {
    monthlyPricing,
    yearlyPricing
  })

  // Fallback to environment variables or default values if API fails
  const fallbackPricing: PricingInfo = {
    monthlyPricePerSeat: parseFloat(process.env.MONTHLY_PRICE_PER_SEAT || '10.00'), // PLN
    annualPricePerSeat: parseFloat(process.env.ANNUAL_PRICE_PER_SEAT || '8.00'), // PLN (monthly equivalent of annual price)
    currency: 'PLN',
    monthlyVariantId,
    yearlyVariantId
  }

  if (!monthlyPricing || !yearlyPricing) {
    console.warn('⚠️ Using fallback pricing due to API error')
    console.warn('   Fallback:', fallbackPricing)
    return fallbackPricing
  }

  console.log('✅ Using LemonSqueezy API pricing (graduated tier 4+ prices)')

  return {
    monthlyPricePerSeat: monthlyPricing.price,
    annualPricePerSeat: yearlyPricing.price / 12, // Convert annual price to monthly equivalent for display
    currency: monthlyPricing.currency || 'PLN',
    monthlyVariantId,
    yearlyVariantId
  }
}

/**
 * Calculate pricing for a given user count and tier
 * Business logic: Up to 3 users are free. 4+ users pay for ALL seats.
 */
export function calculatePricing(
  userCount: number,
  pricingInfo: PricingInfo
): PricingCalculation {
  const FREE_TIER_LIMIT = FREE_SEATS; // 3

  if (userCount <= FREE_TIER_LIMIT) {
    return {
      isFree: true,
      totalUsers: userCount,
      paidSeats: 0,
      monthlyTotal: 0,
      annualTotal: 0,
      monthlyPerSeat: 0,
      annualPerSeat: 0,
      currency: pricingInfo.currency
    }
  }

  // Business logic: If 4+ users, pay for ALL seats. Not (users - 3)!
  const paidSeats = userCount > FREE_TIER_LIMIT ? userCount : 0;
  const monthlyPerSeat = pricingInfo.monthlyPricePerSeat
  const annualPerSeat = pricingInfo.annualPricePerSeat // This is now monthly equivalent
  const monthlyTotal = paidSeats * monthlyPerSeat
  const annualTotal = paidSeats * annualPerSeat * 12 // Annual billing total

  return {
    isFree: false,
    totalUsers: userCount,
    paidSeats,
    monthlyTotal,
    annualTotal,
    monthlyPerSeat,
    annualPerSeat,
    currency: pricingInfo.currency
  }
}

/**
 * Get static pricing info for client-side use (from environment variables)
 * Used as fallback when API is not available on client-side
 */
export function getStaticPricingInfo(): PricingInfo {
  return {
    monthlyPricePerSeat: parseFloat(process.env.NEXT_PUBLIC_MONTHLY_PRICE_PER_SEAT || '10.00'),
    annualPricePerSeat: parseFloat(process.env.NEXT_PUBLIC_ANNUAL_PRICE_PER_SEAT || '8.00'),
    currency: process.env.NEXT_PUBLIC_CURRENCY || 'PLN',
    monthlyVariantId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_MONTHLY_VARIANT_ID || '972634',
    yearlyVariantId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_YEARLY_VARIANT_ID || '972635'
  }
}