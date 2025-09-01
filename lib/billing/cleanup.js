/**
 * Cleanup utilities for abandoned checkout sessions
 */

/**
 * Identify abandoned checkout sessions
 * @param {Array} checkoutSessions - Array of checkout session objects
 * @param {number} hoursThreshold - Hours threshold for considering session abandoned (default: 24)
 * @returns {Array} Array of abandoned checkout sessions
 */
export function identifyAbandonedCheckouts(checkoutSessions, hoursThreshold = 24) {
  const cutoffTime = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000)
  
  return checkoutSessions.filter(session => {
    if (!session || !session.created_at) {
      return false
    }
    
    const createdAt = new Date(session.created_at)
    return createdAt < cutoffTime && session.status === 'pending'
  })
}

/**
 * Clean up abandoned sessions and related data
 * @param {Array} abandonedCheckouts - Array of abandoned checkout sessions
 * @returns {Promise<Object>} Cleanup result
 */
export async function cleanupAbandonedSessions(abandonedCheckouts) {
  if (!Array.isArray(abandonedCheckouts)) {
    throw new Error('abandonedCheckouts must be an array')
  }
  
  const results = {
    processed: 0,
    cleaned: 0,
    errors: 0,
    details: []
  }
  
  for (const checkout of abandonedCheckouts) {
    try {
      results.processed++
      
      if (!checkout || !checkout.id) {
        console.warn('Skipping invalid checkout session:', checkout)
        continue
      }
      
      // Mark checkout as abandoned in database
      const response = await fetch('/api/billing/cleanup-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          checkout_id: checkout.id,
          action: 'mark_abandoned'
        })
      })
      
      if (response && response.ok) {
        results.cleaned++
        results.details.push({
          checkout_id: checkout.id,
          status: 'cleaned',
          user_id: checkout.user_id
        })
      } else {
        results.errors++
        results.details.push({
          checkout_id: checkout.id,
          status: 'error',
          error: response ? await response.text() : 'No response received'
        })
      }
    } catch (error) {
      results.errors++
      results.details.push({
        checkout_id: checkout?.id || 'unknown',
        status: 'error',
        error: error.message
      })
      console.error('Error cleaning up checkout session:', error)
    }
  }
  
  return results
}

/**
 * Schedule cleanup task for abandoned checkouts
 * @returns {Promise<Object>} Cleanup job result
 */
export async function scheduleCleanupTask() {
  try {
    const response = await fetch('/api/billing/schedule-cleanup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        task_type: 'cleanup_abandoned_checkouts',
        schedule: 'daily',
        threshold_hours: 24
      })
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to schedule cleanup task')
    }
    
    return result
  } catch (error) {
    console.error('Failed to schedule cleanup task:', error)
    throw error
  }
}

/**
 * Get abandoned checkout statistics
 * @param {number} daysBack - Number of days to look back (default: 7)
 * @returns {Promise<Object>} Statistics object
 */
export async function getAbandonedCheckoutStats(daysBack = 7) {
  try {
    const response = await fetch(`/api/billing/abandoned-stats?days=${daysBack}`)
    const stats = await response.json()
    
    if (!response.ok) {
      throw new Error(stats.error || 'Failed to get abandoned checkout stats')
    }
    
    return {
      totalAbandoned: stats.total_abandoned || 0,
      totalValue: stats.total_value || 0,
      currency: stats.currency || 'EUR',
      averageValue: stats.average_value || 0,
      abandonmentRate: stats.abandonment_rate || 0,
      periodDays: daysBack
    }
  } catch (error) {
    console.error('Failed to get abandoned checkout stats:', error)
    return {
      totalAbandoned: 0,
      totalValue: 0,
      currency: 'EUR',
      averageValue: 0,
      abandonmentRate: 0,
      periodDays: daysBack,
      error: error.message
    }
  }
}

/**
 * Clean up specific checkout session by ID
 * @param {string} checkoutId - Checkout session ID to clean up
 * @returns {Promise<boolean>} True if successfully cleaned
 */
export async function cleanupSpecificCheckout(checkoutId) {
  if (!checkoutId) {
    throw new Error('Checkout ID is required')
  }
  
  try {
    const response = await fetch('/api/billing/cleanup-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        checkout_id: checkoutId,
        action: 'force_cleanup'
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to cleanup checkout')
    }
    
    return true
  } catch (error) {
    console.error(`Failed to cleanup checkout ${checkoutId}:`, error)
    throw error
  }
}