/**
 * Session storage utilities for deferred organization creation
 */

const ORGANIZATION_STORAGE_KEY = 'pending_organization'

/**
 * Store organization data in session storage
 * @param {Object} organizationData - Organization data to store
 * @param {string} organizationData.name - Organization name
 * @param {string} organizationData.slug - Organization slug
 * @param {string} organizationData.country_code - Country code
 */
export function storeOrganizationData(organizationData) {
  validateOrganizationData(organizationData)
  
  // Check for both browser and test environments
  const storage = (typeof window !== 'undefined' && window.sessionStorage) || 
                  (typeof global !== 'undefined' && global.sessionStorage)
  
  if (storage) {
    storage.setItem(ORGANIZATION_STORAGE_KEY, JSON.stringify(organizationData))
  }
}

/**
 * Retrieve organization data from session storage
 * @returns {Object|null} Organization data or null if not found
 */
export function getStoredOrganizationData() {
  // Check for both browser and test environments
  const storage = (typeof window !== 'undefined' && window.sessionStorage) || 
                  (typeof global !== 'undefined' && global.sessionStorage)
  
  if (storage) {
    const stored = storage.getItem(ORGANIZATION_STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (error) {
        console.error('Failed to parse stored organization data:', error)
        clearStoredOrganizationData()
        return null
      }
    }
  }
  return null
}

/**
 * Clear stored organization data from session storage
 */
export function clearStoredOrganizationData() {
  // Check for both browser and test environments
  const storage = (typeof window !== 'undefined' && window.sessionStorage) || 
                  (typeof global !== 'undefined' && global.sessionStorage)
  
  if (storage) {
    storage.removeItem(ORGANIZATION_STORAGE_KEY)
  }
}

/**
 * Validate organization data
 * @param {Object} organizationData - Organization data to validate
 * @throws {Error} If data is invalid
 */
export function validateOrganizationData(organizationData) {
  if (!organizationData) {
    throw new Error('Organization data is required')
  }
  
  if (!organizationData.name || typeof organizationData.name !== 'string' || !organizationData.name.trim()) {
    throw new Error('Organization name is required')
  }
  
  if (!organizationData.slug || typeof organizationData.slug !== 'string' || !organizationData.slug.trim()) {
    throw new Error('Organization slug is required')
  }
  
  if (!organizationData.country_code || typeof organizationData.country_code !== 'string' || !organizationData.country_code.trim()) {
    throw new Error('Organization country code is required')
  }
  
  // Validate slug format
  const slugRegex = /^[a-z0-9-]+$/
  if (!slugRegex.test(organizationData.slug)) {
    throw new Error('Organization slug must contain only lowercase letters, numbers, and hyphens')
  }
  
  // Validate country code format (ISO 3166-1 alpha-2)
  const countryCodeRegex = /^[A-Z]{2}$/
  if (!countryCodeRegex.test(organizationData.country_code)) {
    throw new Error('Country code must be a valid ISO 3166-1 alpha-2 code')
  }
}

/**
 * Check if organization data exists in session storage
 * @returns {boolean} True if data exists
 */
export function hasStoredOrganizationData() {
  return getStoredOrganizationData() !== null
}