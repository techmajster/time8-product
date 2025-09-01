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
 * Fetch variant pricing from Lemon Squeezy API
 */
async function fetchVariantPricing(variantId: string) {
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
 */
export async function getDynamicPricing(): Promise<PricingInfo> {
  const monthlyVariantId = process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID!
  const yearlyVariantId = process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID!

  // Fetch pricing for both variants
  const [monthlyPricing, yearlyPricing] = await Promise.all([
    fetchVariantPricing(monthlyVariantId),
    fetchVariantPricing(yearlyVariantId)
  ])

  // Fallback to environment variables or default values if API fails
  const fallbackPricing: PricingInfo = {
    monthlyPricePerSeat: parseFloat(process.env.MONTHLY_PRICE_PER_SEAT || '12.99'), // PLN
    annualPricePerSeat: parseFloat(process.env.ANNUAL_PRICE_PER_SEAT || '10.83'), // PLN (monthly equivalent of annual price)
    currency: 'PLN',
    monthlyVariantId,
    yearlyVariantId
  }

  if (!monthlyPricing || !yearlyPricing) {
    console.warn('Using fallback pricing due to API error')
    return fallbackPricing
  }

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
 */
export function calculatePricing(
  userCount: number, 
  pricingInfo: PricingInfo
): PricingCalculation {
  if (userCount <= FREE_SEATS) {
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

  const paidSeats = userCount - FREE_SEATS
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
    monthlyPricePerSeat: parseFloat(process.env.NEXT_PUBLIC_MONTHLY_PRICE_PER_SEAT || '12.99'),
    annualPricePerSeat: parseFloat(process.env.NEXT_PUBLIC_ANNUAL_PRICE_PER_SEAT || '10.83'),
    currency: process.env.NEXT_PUBLIC_CURRENCY || 'PLN',
    monthlyVariantId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_MONTHLY_VARIANT_ID || '972634',
    yearlyVariantId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_YEARLY_VARIANT_ID || '972635'
  }
}