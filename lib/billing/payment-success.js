/**
 * Payment success handler utilities
 */

import { createOrganizationAfterPayment } from './organization-creation.js'
import { clearStoredOrganizationData } from './session-storage.js'

/**
 * Handle payment success and organization creation
 * @param {Object} params - Payment success parameters
 * @param {string} params.userId - User ID
 * @param {Object} params.organizationData - Organization data
 * @param {string} params.subscriptionId - Subscription ID from payment
 * @returns {Promise<Object>} Success result with organization and redirect info
 */
export async function handlePaymentSuccess({ userId, organizationData, subscriptionId }) {
  if (!userId) {
    throw new Error('User ID is required')
  }
  
  if (!organizationData) {
    throw new Error('Organization data is required')
  }
  
  if (!subscriptionId) {
    throw new Error('Subscription ID is required')
  }
  
  try {
    // Create organization with subscription data
    const organization = await createOrganizationAfterPayment({
      userId,
      organizationData,
      subscriptionId
    })
    
    return {
      success: true,
      organization,
      redirectTo: '/dashboard',
      subscriptionId
    }
  } catch (error) {
    console.error('Payment success handling failed:', error)
    throw error
  }
}

/**
 * Process payment webhook and create organization if needed
 * @param {Object} webhookData - Webhook payload from payment provider
 * @returns {Promise<Object>} Processing result
 */
export async function processPaymentWebhook(webhookData) {
  const { subscription, custom_data } = webhookData
  
  if (!subscription || !custom_data) {
    throw new Error('Invalid webhook data')
  }
  
  const { organization_data, user_id } = custom_data
  
  if (!organization_data || !user_id) {
    console.log('No organization creation needed for this webhook')
    return { organizationCreated: false }
  }
  
  try {
    const organization = await createOrganizationAfterPayment({
      userId: user_id,
      organizationData: organization_data,
      subscriptionId: subscription.id
    })
    
    return {
      organizationCreated: true,
      organization,
      subscriptionId: subscription.id
    }
  } catch (error) {
    console.error('Webhook organization creation failed:', error)
    throw error
  }
}

/**
 * Handle payment failure cleanup
 * @param {Object} params - Failure parameters
 * @param {string} params.userId - User ID
 * @param {string} params.checkoutId - Checkout session ID
 * @returns {Promise<void>}
 */
export async function handlePaymentFailure({ userId, checkoutId }) {
  console.log(`Payment failed for user ${userId}, checkout ${checkoutId}`)
  
  // Keep organization data in session storage for retry
  // Don't clear it automatically on failure
  
  // Log the failure for analytics/debugging
  try {
    await fetch('/api/billing/log-payment-failure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        checkout_id: checkoutId,
        timestamp: new Date().toISOString()
      })
    })
  } catch (error) {
    console.error('Failed to log payment failure:', error)
  }
}

/**
 * Validate payment webhook signature
 * @param {string} payload - Raw webhook payload
 * @param {string} signature - Webhook signature
 * @param {string} secret - Webhook secret
 * @returns {boolean} True if signature is valid
 */
export function validateWebhookSignature(payload, signature, secret) {
  if (!payload || !signature || !secret) {
    return false
  }
  
  try {
    const crypto = require('crypto')
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('Webhook signature validation failed:', error)
    return false
  }
}