/**
 * Organization creation utilities for deferred billing flow
 */

import { getStoredOrganizationData, clearStoredOrganizationData } from './session-storage.js'

/**
 * Handle free tier flow - create organization immediately
 * @param {string} userId - User ID
 * @param {number} userCount - Number of users (should be ≤3)
 * @returns {Promise<Object>} Result object with organization and redirect info
 */
export async function handleFreeTierFlow(userId, userCount) {
  if (userCount > 3) {
    throw new Error('Free tier is only available for 3 users or less')
  }
  
  const organizationData = getStoredOrganizationData()
  if (!organizationData) {
    throw new Error('No organization data found in session')
  }
  
  try {
    // Create organization in database
    const response = await fetch('/api/organizations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...organizationData,
        user_id: userId
      })
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create organization')
    }
    
    // Clear session storage after successful creation
    clearStoredOrganizationData()
    
    return {
      shouldCreateOrganization: true,
      organization: result.organization,
      redirectTo: '/dashboard',
      tier: 'free',
      userCount
    }
  } catch (error) {
    console.error('Free tier organization creation failed:', error)
    throw error
  }
}

/**
 * Handle paid tier flow - defer organization creation until payment success
 * @param {string} userId - User ID
 * @param {number} userCount - Number of users (should be >3)
 * @param {string} tier - Billing tier ('monthly' or 'annual')
 * @param {string} variantId - Price variant ID
 * @returns {Promise<Object>} Result object with checkout info
 */
export async function handlePaidTierFlow(userId, userCount, tier, variantId) {
  if (userCount <= 3) {
    throw new Error('Paid tier is required for more than 3 users')
  }
  
  const organizationData = getStoredOrganizationData()
  if (!organizationData) {
    throw new Error('No organization data found in session')
  }
  
  return {
    shouldCreateOrganization: false,
    requiresPayment: true,
    organizationData,
    variantId,
    tier,
    userCount,
    userId
  }
}

/**
 * Create organization after successful payment
 * @param {Object} params - Parameters
 * @param {string} params.userId - User ID
 * @param {Object} params.organizationData - Organization data
 * @param {string} params.subscriptionId - Subscription ID from payment
 * @returns {Promise<Object>} Created organization
 */
export async function createOrganizationAfterPayment({ userId, organizationData, subscriptionId }) {
  try {
    const response = await fetch('/api/organizations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...organizationData,
        user_id: userId,
        subscription_id: subscriptionId
      })
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create organization')
    }
    
    // Clear session storage after successful creation
    clearStoredOrganizationData()
    
    return result.organization
  } catch (error) {
    console.error('Post-payment organization creation failed:', error)
    throw error
  }
}