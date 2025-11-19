/**
 * Billing Pricing API
 * 
 * Provides dynamic pricing information from Lemon Squeezy for the frontend.
 * This replaces hardcoded pricing values in the add-users component.
 */

import { NextResponse } from 'next/server'
import { getDynamicPricing } from '@/lib/lemon-squeezy/pricing'

/**
 * GET /api/billing/pricing
 * 
 * Returns current pricing information from Lemon Squeezy
 */
export async function GET() {
  try {
    console.log('📞 API /api/billing/pricing called')

    // Fetch dynamic pricing from Lemon Squeezy API
    const pricingInfo = await getDynamicPricing()

    console.log('✅ Returning pricing to client:', pricingInfo)

    return NextResponse.json({
      success: true,
      pricing: pricingInfo,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Failed to fetch pricing:', error)

    // Return fallback pricing if API fails
    const fallbackPricing = {
      monthlyPricePerSeat: parseFloat(process.env.MONTHLY_PRICE_PER_SEAT || '10.00'),
      annualPricePerSeat: parseFloat(process.env.ANNUAL_PRICE_PER_SEAT || '8.00'),
      currency: 'PLN',
      monthlyVariantId: (process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID || '972634').trim(),
      yearlyVariantId: (process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID || '972635').trim()
    }

    console.warn('⚠️ Using fallback pricing:', fallbackPricing)

    return NextResponse.json({
      success: true,
      pricing: fallbackPricing,
      fallback: true,
      lastUpdated: new Date().toISOString()
    })
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export const PUT = POST
export const DELETE = POST
export const PATCH = POST