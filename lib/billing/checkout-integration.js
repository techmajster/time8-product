/**
 * Checkout integration utilities for deferred organization creation
 */

import { getStoredOrganizationData } from './session-storage.js'

/**
 * Create checkout session with organization data
 * @param {Object} params - Checkout parameters
 * @param {string} params.userId - User ID
 * @param {string} params.variantId - Price variant ID
 * @param {number} params.userCount - Number of users
 * @param {string} params.tier - Billing tier ('monthly' or 'annual')
 * @returns {Promise<Object>} Checkout session result
 */
export async function createCheckoutWithOrganization({ userId, variantId, userCount, tier }) {
  const organizationData = getStoredOrganizationData()
  if (!organizationData) {
    throw new Error('No organization data found in session')
  }
  
  const checkoutPayload = {
    variant_id: variantId,
    organization_data: organizationData,
    user_count: userCount,
    tier,
    return_url: `${window.location.origin}/onboarding/payment-success`,
    failure_url: `${window.location.origin}/onboarding/payment-failure`
  }
  
  try {
    const response = await fetch('/api/billing/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutPayload)
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create checkout session')
    }
    
    return {
      checkout_url: result.checkout_url,
      checkout_id: result.checkout_id || null,
      organization_data: organizationData,
      user_count: userCount,
      tier
    }
  } catch (error) {
    console.error('Checkout creation failed:', error)
    throw error
  }
}

/**
 * Validate checkout parameters
 * @param {Object} params - Parameters to validate
 * @throws {Error} If parameters are invalid
 */
export function validateCheckoutParams(params) {
  const { userId, variantId, userCount, tier } = params
  
  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid user ID is required')
  }
  
  if (!variantId || typeof variantId !== 'string') {
    throw new Error('Valid variant ID is required')
  }
  
  if (typeof userCount !== 'number' || userCount <= 3) {
    throw new Error('User count must be greater than 3 for paid checkout')
  }
  
  if (!tier || !['monthly', 'annual'].includes(tier)) {
    throw new Error('Tier must be either "monthly" or "annual"')
  }
}

/**
 * Build checkout URLs for success and failure scenarios
 * @param {Object} params - URL parameters
 * @param {string} params.baseUrl - Base URL of the application
 * @param {string} params.organizationId - Organization ID (optional)
 * @returns {Object} Success and failure URLs
 */
export function buildCheckoutUrls({ baseUrl, organizationId }) {
  const successUrl = organizationId 
    ? `${baseUrl}/onboarding/payment-success?org_id=${organizationId}`
    : `${baseUrl}/onboarding/payment-success`
    
  const failureUrl = organizationId
    ? `${baseUrl}/onboarding/payment-failure?org_id=${organizationId}`
    : `${baseUrl}/onboarding/payment-failure`
  
  return {
    return_url: successUrl,
    failure_url: failureUrl
  }
}