/**
 * Seat calculation utilities for billing
 */

/**
 * Calculate seats and tier for a given user count
 * @param {number} userCount - Total number of users
 * @returns {Object} Seat calculation result
 */
export function calculateSeats(userCount) {
  if (typeof userCount !== 'number' || userCount < 1) {
    throw new Error('User count must be a positive number')
  }
  
  const totalSeats = userCount
  const freeSeats = Math.min(totalSeats, 3)
  const paidSeats = Math.max(0, totalSeats - 3)
  const tier = totalSeats <= 3 ? 'free' : 'paid'
  
  return {
    totalSeats,
    freeSeats,
    paidSeats,
    tier
  }
}

/**
 * Calculate pricing for a given user count and price variant
 * @param {number} userCount - Total number of users
 * @param {Object} priceVariant - Price variant object
 * @param {number} priceVariant.price - Price in cents
 * @param {number} priceVariant.quantity - Quantity of seats in variant
 * @param {string} priceVariant.interval - Billing interval ('month' or 'year')
 * @param {string} priceVariant.currency - Currency code
 * @returns {Object} Pricing calculation
 */
export function calculatePricing(userCount, priceVariant) {
  const seatInfo = calculateSeats(userCount)
  
  if (seatInfo.tier === 'free') {
    return {
      ...seatInfo,
      totalCost: 0,
      perSeatCost: 0,
      currency: priceVariant?.currency || 'EUR',
      interval: 'month',
      monthlyEquivalent: 0
    }
  }
  
  if (!priceVariant) {
    throw new Error('Price variant is required for paid tier')
  }
  
  // Calculate per-seat price from variant
  const perSeatPrice = priceVariant.price / priceVariant.quantity / 100 // Convert cents to euros
  const totalCost = seatInfo.paidSeats * perSeatPrice
  
  // Calculate monthly equivalent for annual plans
  const monthlyEquivalent = priceVariant.interval === 'year' ? totalCost / 12 : totalCost
  
  return {
    ...seatInfo,
    totalCost: Number(totalCost.toFixed(2)),
    perSeatCost: Number(perSeatPrice.toFixed(2)),
    currency: priceVariant.currency,
    interval: priceVariant.interval,
    monthlyEquivalent: Number(monthlyEquivalent.toFixed(2))
  }
}

/**
 * Find appropriate price variant for a given user count
 * @param {number} userCount - Total number of users
 * @param {Array} variants - Array of price variants
 * @param {string} preferredInterval - Preferred billing interval ('month' or 'year')
 * @returns {Object|null} Best matching variant or null
 */
export function findVariantForUserCount(userCount, variants, preferredInterval = 'year') {
  const seatInfo = calculateSeats(userCount)
  
  if (seatInfo.tier === 'free') {
    return null // No variant needed for free tier
  }
  
  // Filter variants by preferred interval
  const intervalVariants = variants.filter(v => v.interval === preferredInterval)
  
  // Find variant that can accommodate the required paid seats
  const suitableVariant = intervalVariants.find(variant => 
    variant.quantity >= seatInfo.paidSeats
  )
  
  // If no suitable variant for preferred interval, try the other interval
  if (!suitableVariant) {
    const otherInterval = preferredInterval === 'year' ? 'month' : 'year'
    const otherIntervalVariants = variants.filter(v => v.interval === otherInterval)
    return otherIntervalVariants.find(variant => variant.quantity >= seatInfo.paidSeats) || null
  }
  
  return suitableVariant
}

/**
 * Get pricing display text for UI
 * @param {number} userCount - Total number of users
 * @param {Object} priceVariant - Price variant object
 * @returns {Object} Display text and values
 */
export function getPricingDisplay(userCount, priceVariant) {
  const pricing = calculatePricing(userCount, priceVariant)
  
  if (pricing.tier === 'free') {
    return {
      title: 'Free',
      subtitle: `Up to ${pricing.totalSeats} users`,
      price: 'Free',
      interval: '',
      monthly: 'Free',
      total: 'Free'
    }
  }
  
  const perSeatMonthly = pricing.interval === 'year' 
    ? pricing.monthlyEquivalent / pricing.paidSeats 
    : pricing.perSeatCost
  
  const title = pricing.interval === 'year' ? 'Annual payment' : 'Monthly payment'
  const subtitle = `${perSeatMonthly.toFixed(1)} ${pricing.currency} / user / month`
  
  const total = pricing.interval === 'year'
    ? `${pricing.totalCost.toFixed(2)} ${pricing.currency} (billed annually)`
    : `${pricing.totalCost.toFixed(2)} ${pricing.currency} / month`
  
  return {
    title,
    subtitle,
    price: `${perSeatMonthly.toFixed(1)} ${pricing.currency}`,
    interval: pricing.interval === 'year' ? ' / user / month' : ' / user / month',
    monthly: `${pricing.monthlyEquivalent.toFixed(2)} ${pricing.currency}`,
    total
  }
}