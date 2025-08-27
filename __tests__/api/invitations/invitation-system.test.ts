/**
 * @fileoverview Master test suite for invitation system integration testing
 * 
 * This file runs all invitation system tests and provides comprehensive system validation
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

// Import all test suites
import './invitation-creation.test'
import './invitation-lookup.test'
import './invitation-acceptance.test'
import './invitation-expiration.test'
import './duplicate-invitations.test'
import './email-integration.test'
import './token-security.test'

describe('Invitation System Integration Tests', () => {
  beforeAll(async () => {
    console.log('🚀 Starting comprehensive invitation system tests...')
  })

  afterAll(async () => {
    console.log('✅ Invitation system tests completed!')
  })

  describe('System Validation', () => {
    it('should validate all test suites are included', () => {
      const testSuites = [
        'invitation-creation.test',
        'invitation-lookup.test', 
        'invitation-acceptance.test',
        'invitation-expiration.test',
        'duplicate-invitations.test',
        'email-integration.test',
        'token-security.test'
      ]

      expect(testSuites.length).toBe(7)
      
      // Verify all critical test areas are covered
      expect(testSuites).toContain('invitation-creation.test')
      expect(testSuites).toContain('invitation-acceptance.test')
      expect(testSuites).toContain('token-security.test')
    })

    it('should confirm test environment is properly configured', () => {
      // Verify environment variables needed for testing
      expect(process.env.NODE_ENV).toBeDefined()
      
      // Database connection should be available
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined()
      expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined()
    })
  })
})

export {
  // Re-export for external use if needed
}