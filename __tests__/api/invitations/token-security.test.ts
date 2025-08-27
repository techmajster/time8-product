/**
 * @fileoverview Tests for invitation token security and encryption
 * 
 * Tests cover:
 * - Token generation randomness and uniqueness
 * - Token length and character set validation
 * - Token entropy and cryptographic strength
 * - Token collision resistance
 * - Secure token storage and handling
 * - Token validation and verification
 * - Protection against timing attacks
 * - Token rotation and invalidation
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { createAdminClient } from '@/lib/supabase/server'
import crypto from 'crypto'

describe('Invitation Token Security', () => {
  let supabaseAdmin: ReturnType<typeof createAdminClient>
  let testOrganizationId: string
  let testTeamId: string
  let createdInvitationIds: string[] = []

  beforeAll(async () => {
    supabaseAdmin = createAdminClient()
    
    // Create test organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: 'Test Organization for Token Security',
        created_by: '00000000-0000-0000-0000-000000000001'
      })
      .select('id')
      .single()

    if (orgError || !org) {
      throw new Error('Failed to create test organization')
    }
    testOrganizationId = org.id

    // Create test team
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({
        name: 'Test Team for Token Security',
        organization_id: testOrganizationId
      })
      .select('id')
      .single()

    if (teamError || !team) {
      throw new Error('Failed to create test team')
    }
    testTeamId = team.id
  })

  afterAll(async () => {
    // Clean up test data
    if (createdInvitationIds.length > 0) {
      await supabaseAdmin
        .from('invitations')
        .delete()
        .in('id', createdInvitationIds)
    }

    await supabaseAdmin
      .from('teams')
      .delete()
      .eq('id', testTeamId)

    await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', testOrganizationId)
  })

  describe('Token Generation and Randomness', () => {
    it('should generate cryptographically secure tokens', async () => {
      const { data: invitation, error } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: 'crypto.secure@example.com',
          full_name: 'Crypto Secure User',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('token')
        .single()

      expect(error).toBeNull()
      expect(invitation?.token).toBeDefined()
      if (invitation) createdInvitationIds.push(invitation.token)

      const token = invitation!.token
      
      // Token should be non-empty and reasonably long
      expect(token).toBeTruthy()
      expect(token.length).toBeGreaterThan(20)
      
      // Token should not contain predictable patterns
      expect(token).not.toMatch(/^[0]+/)
      expect(token).not.toMatch(/^[a]+/)
      expect(token).not.toMatch(/123/)
      expect(token).not.toMatch(/abc/)
    })

    it('should generate unique tokens for each invitation', async () => {
      const invitations = []
      const tokens = new Set()

      // Create multiple invitations to test uniqueness
      for (let i = 0; i < 100; i++) {
        const { data: invitation, error } = await supabaseAdmin
          .from('invitations')
          .insert({
            email: `unique${i}@example.com`,
            full_name: `Unique User ${i}`,
            role: 'employee',
            organization_id: testOrganizationId,
            team_id: testTeamId,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          })
          .select('id, token')
          .single()

        expect(error).toBeNull()
        expect(invitation?.token).toBeDefined()

        if (invitation) {
          invitations.push(invitation)
          tokens.add(invitation.token)
          createdInvitationIds.push(invitation.id)
        }
      }

      // All tokens should be unique
      expect(tokens.size).toBe(invitations.length)
      expect(tokens.size).toBe(100)
    })

    it('should have sufficient entropy in generated tokens', async () => {
      const { data: invitation, error } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: 'entropy.test@example.com',
          full_name: 'Entropy Test User',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('id, token')
        .single()

      expect(error).toBeNull()
      if (invitation) createdInvitationIds.push(invitation.id)

      const token = invitation!.token
      
      // Calculate character distribution
      const charCounts = {}
      for (const char of token) {
        charCounts[char] = (charCounts[char] || 0) + 1
      }

      const uniqueChars = Object.keys(charCounts).length
      const totalChars = token.length

      // Should have reasonable character diversity
      expect(uniqueChars / totalChars).toBeGreaterThan(0.5)
      
      // No single character should dominate
      const maxCharCount = Math.max(...Object.values(charCounts))
      expect(maxCharCount / totalChars).toBeLessThan(0.3)
    })

    it('should resist prediction even with partial token knowledge', async () => {
      // Create multiple invitations and analyze token patterns
      const tokens = []
      
      for (let i = 0; i < 50; i++) {
        const { data: invitation, error } = await supabaseAdmin
          .from('invitations')
          .insert({
            email: `prediction${i}@example.com`,
            full_name: `Prediction Test User ${i}`,
            role: 'employee',
            organization_id: testOrganizationId,
            team_id: testTeamId,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          })
          .select('id, token')
          .single()

        if (invitation) {
          tokens.push(invitation.token)
          createdInvitationIds.push(invitation.id)
        }
      }

      // Test that tokens don't follow predictable patterns
      const prefixes = tokens.map(token => token.substring(0, 10))
      const uniquePrefixes = new Set(prefixes)
      
      // Prefixes should be highly diverse
      expect(uniquePrefixes.size / prefixes.length).toBeGreaterThan(0.9)
      
      // Test that tokens don't have sequential relationships
      for (let i = 1; i < tokens.length; i++) {
        const token1 = tokens[i - 1]
        const token2 = tokens[i]
        
        // Hamming distance should be high (most characters different)
        let differences = 0
        const minLength = Math.min(token1.length, token2.length)
        
        for (let j = 0; j < minLength; j++) {
          if (token1[j] !== token2[j]) {
            differences++
          }
        }
        
        const similarity = differences / minLength
        expect(similarity).toBeGreaterThan(0.7) // At least 70% different
      }
    })
  })

  describe('Token Format and Validation', () => {
    it('should validate token format and character set', async () => {
      const { data: invitation, error } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: 'format.validation@example.com',
          full_name: 'Format Validation User',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('id, token')
        .single()

      expect(error).toBeNull()
      if (invitation) createdInvitationIds.push(invitation.id)

      const token = invitation!.token
      
      // Token should only contain safe URL characters
      expect(token).toMatch(/^[A-Za-z0-9._~-]+$/)
      
      // Token should not contain potentially problematic characters
      expect(token).not.toContain(' ')
      expect(token).not.toContain('+')
      expect(token).not.toContain('/')
      expect(token).not.toContain('=')
      expect(token).not.toContain('&')
      expect(token).not.toContain('?')
    })

    it('should maintain consistent token length', async () => {
      const tokens = []
      
      for (let i = 0; i < 20; i++) {
        const { data: invitation, error } = await supabaseAdmin
          .from('invitations')
          .insert({
            email: `length${i}@example.com`,
            full_name: `Length Test User ${i}`,
            role: 'employee',
            organization_id: testOrganizationId,
            team_id: testTeamId,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          })
          .select('id, token')
          .single()

        if (invitation) {
          tokens.push(invitation.token)
          createdInvitationIds.push(invitation.id)
        }
      }

      // All tokens should have consistent length
      const lengths = tokens.map(token => token.length)
      const uniqueLengths = new Set(lengths)
      
      // Should have consistent length (or very few variations)
      expect(uniqueLengths.size).toBeLessThanOrEqual(2)
      
      // Tokens should be reasonably long for security
      lengths.forEach(length => {
        expect(length).toBeGreaterThan(20)
        expect(length).toBeLessThan(200) // Reasonable upper bound
      })
    })

    it('should handle token validation edge cases', async () => {
      const invalidTokens = [
        '',
        ' ',
        'abc',
        'x'.repeat(500), // Very long
        'token with spaces',
        'token+with+plus',
        'token/with/slash',
        'token=with=equals',
        null,
        undefined
      ]

      for (const invalidToken of invalidTokens) {
        // Test lookup with invalid token
        const { data: invitation, error } = await supabaseAdmin
          .from('invitations')
          .select('*')
          .eq('token', invalidToken)
          .eq('status', 'pending')
          .single()

        // Should not find invitation with invalid token
        expect(error).toBeDefined()
        expect(invitation).toBeNull()
      }
    })

    it('should resist token format manipulation attempts', async () => {
      // Create a valid invitation first
      const { data: validInvitation, error: validError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: 'manipulation.test@example.com',
          full_name: 'Manipulation Test User',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('id, token')
        .single()

      expect(validError).toBeNull()
      if (validInvitation) createdInvitationIds.push(validInvitation.id)

      const validToken = validInvitation!.token
      
      // Test various manipulation attempts
      const manipulatedTokens = [
        validToken.toUpperCase(),
        validToken.toLowerCase(),
        validToken + 'x',
        'x' + validToken,
        validToken.substring(1),
        validToken.substring(0, validToken.length - 1),
        validToken.split('').reverse().join(''),
        validToken.replace(/./g, 'x')
      ]

      for (const manipulatedToken of manipulatedTokens) {
        const { data: invitation, error } = await supabaseAdmin
          .from('invitations')
          .select('*')
          .eq('token', manipulatedToken)
          .eq('status', 'pending')
          .single()

        // Manipulated tokens should not match valid invitations
        if (manipulatedToken !== validToken) {
          expect(error).toBeDefined()
          expect(invitation).toBeNull()
        }
      }
    })
  })

  describe('Token Storage and Database Security', () => {
    it('should store tokens securely in database', async () => {
      const { data: invitation, error } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: 'storage.security@example.com',
          full_name: 'Storage Security User',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      expect(error).toBeNull()
      if (invitation) createdInvitationIds.push(invitation.id)

      const token = invitation!.token
      
      // Token should be stored as-is (not hashed, since it needs to be looked up)
      // But it should be sufficiently random that brute force is impractical
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      
      // Verify token can be retrieved for lookup
      const { data: lookupResult, error: lookupError } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('token', token)
        .single()

      expect(lookupError).toBeNull()
      expect(lookupResult?.id).toBe(invitation!.id)
    })

    it('should handle database indexing for token lookups efficiently', async () => {
      // Create invitation for performance test
      const { data: invitation, error } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: 'performance.test@example.com',
          full_name: 'Performance Test User',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      expect(error).toBeNull()
      if (invitation) createdInvitationIds.push(invitation.id)

      const token = invitation!.token
      
      // Test lookup performance
      const startTime = Date.now()
      
      const { data: lookupResult, error: lookupError } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single()

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(lookupError).toBeNull()
      expect(lookupResult).toBeDefined()
      expect(duration).toBeLessThan(1000) // Should be fast with proper indexing
    })

    it('should protect against SQL injection in token queries', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE invitations; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users; --",
        "'; SELECT * FROM profiles; --",
        "' OR 1=1; --"
      ]

      for (const maliciousToken of sqlInjectionAttempts) {
        const { data: invitation, error } = await supabaseAdmin
          .from('invitations')
          .select('*')
          .eq('token', maliciousToken)
          .eq('status', 'pending')
          .single()

        // Should safely handle malicious input without executing SQL
        expect(error).toBeDefined()
        expect(invitation).toBeNull()
      }

      // Verify that tables still exist after injection attempts
      const { data: testQuery, error: testError } = await supabaseAdmin
        .from('invitations')
        .select('id')
        .limit(1)

      expect(testError).toBeNull()
      expect(Array.isArray(testQuery)).toBe(true)
    })
  })

  describe('Timing Attack Protection', () => {
    it('should have consistent lookup times for valid and invalid tokens', async () => {
      // Create a valid invitation
      const { data: validInvitation, error: validError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: 'timing.test@example.com',
          full_name: 'Timing Test User',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      expect(validError).toBeNull()
      if (validInvitation) createdInvitationIds.push(validInvitation.id)

      const validToken = validInvitation!.token
      const invalidToken = 'invalid-token-' + crypto.randomBytes(16).toString('hex')

      // Measure timing for valid token lookup
      const validLookupTimes = []
      for (let i = 0; i < 10; i++) {
        const start = Date.now()
        
        const { data, error } = await supabaseAdmin
          .from('invitations')
          .select('*')
          .eq('token', validToken)
          .eq('status', 'pending')
          .single()
          
        const end = Date.now()
        validLookupTimes.push(end - start)
      }

      // Measure timing for invalid token lookup
      const invalidLookupTimes = []
      for (let i = 0; i < 10; i++) {
        const start = Date.now()
        
        const { data, error } = await supabaseAdmin
          .from('invitations')
          .select('*')
          .eq('token', invalidToken)
          .eq('status', 'pending')
          .single()
          
        const end = Date.now()
        invalidLookupTimes.push(end - start)
      }

      // Calculate average times
      const avgValidTime = validLookupTimes.reduce((a, b) => a + b) / validLookupTimes.length
      const avgInvalidTime = invalidLookupTimes.reduce((a, b) => a + b) / invalidLookupTimes.length

      // Times should be reasonably similar (within 50% of each other)
      const timeDifference = Math.abs(avgValidTime - avgInvalidTime)
      const avgTime = (avgValidTime + avgInvalidTime) / 2
      const percentDifference = (timeDifference / avgTime) * 100

      expect(percentDifference).toBeLessThan(50)
    })

    it('should not leak token information through error messages', async () => {
      const testTokens = [
        'completely-invalid-token',
        'almostvalidtoken123',
        'token-with-valid-format-but-not-in-db',
        ''
      ]

      for (const token of testTokens) {
        const { data: invitation, error } = await supabaseAdmin
          .from('invitations')
          .select('*')
          .eq('token', token)
          .eq('status', 'pending')
          .single()

        expect(error).toBeDefined()
        expect(invitation).toBeNull()
        
        // Error should not contain the attempted token
        expect(error.message).not.toContain(token)
        
        // Error should be generic
        expect(error.code).toBeDefined()
      }
    })
  })

  describe('Token Lifecycle and Invalidation', () => {
    it('should handle token invalidation when invitation status changes', async () => {
      // Create invitation
      const { data: invitation, error } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: 'invalidation.test@example.com',
          full_name: 'Invalidation Test User',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      expect(error).toBeNull()
      if (invitation) createdInvitationIds.push(invitation.id)

      const token = invitation!.token

      // Verify token is valid for pending invitation
      const { data: pendingLookup, error: pendingError } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single()

      expect(pendingError).toBeNull()
      expect(pendingLookup).toBeDefined()

      // Mark invitation as accepted
      await supabaseAdmin
        .from('invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invitation!.id)

      // Token should no longer be valid for pending invitations
      const { data: acceptedLookup, error: acceptedError } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single()

      expect(acceptedError).toBeDefined()
      expect(acceptedLookup).toBeNull()
    })

    it('should handle expired token access attempts', async () => {
      // Create expired invitation
      const { data: expiredInvitation, error: expiredError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: 'expired.token@example.com',
          full_name: 'Expired Token User',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 24 hours ago
        })
        .select('*')
        .single()

      expect(expiredError).toBeNull()
      if (expiredInvitation) createdInvitationIds.push(expiredInvitation.id)

      const token = expiredInvitation!.token

      // Token exists in database but invitation is expired
      const { data: tokenLookup, error: tokenError } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('token', token)
        .single()

      expect(tokenError).toBeNull()
      expect(tokenLookup).toBeDefined()
      expect(new Date(tokenLookup!.expires_at) < new Date()).toBe(true)
    })

    it('should maintain token security during bulk operations', async () => {
      // Create multiple invitations for bulk test
      const batchSize = 50
      const invitations = []
      
      for (let i = 0; i < batchSize; i++) {
        const { data: invitation, error } = await supabaseAdmin
          .from('invitations')
          .insert({
            email: `bulk${i}@example.com`,
            full_name: `Bulk User ${i}`,
            role: 'employee',
            organization_id: testOrganizationId,
            team_id: testTeamId,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          })
          .select('*')
          .single()

        if (invitation) {
          invitations.push(invitation)
          createdInvitationIds.push(invitation.id)
        }
      }

      expect(invitations.length).toBe(batchSize)

      // Verify all tokens are unique
      const tokens = invitations.map(inv => inv.token)
      const uniqueTokens = new Set(tokens)
      expect(uniqueTokens.size).toBe(tokens.length)

      // Verify all tokens maintain security properties
      tokens.forEach(token => {
        expect(token.length).toBeGreaterThan(20)
        expect(token).toMatch(/^[A-Za-z0-9._~-]+$/)
      })

      // Test bulk invalidation
      await supabaseAdmin
        .from('invitations')
        .update({ status: 'expired' })
        .in('id', invitations.map(inv => inv.id))

      // Verify tokens are no longer valid for pending lookups
      for (const token of tokens.slice(0, 5)) { // Test subset for performance
        const { data: lookup, error } = await supabaseAdmin
          .from('invitations')
          .select('*')
          .eq('token', token)
          .eq('status', 'pending')
          .single()

        expect(error).toBeDefined()
        expect(lookup).toBeNull()
      }
    })
  })

  describe('Token Collision Resistance', () => {
    it('should have extremely low probability of token collisions', async () => {
      // This test demonstrates the mathematical properties
      // rather than actually testing for collisions (which would be impractical)
      
      const { data: invitation1, error: error1 } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: 'collision1@example.com',
          full_name: 'Collision Test 1',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      const { data: invitation2, error: error2 } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: 'collision2@example.com',
          full_name: 'Collision Test 2',
          role: 'employee',
          organization_id: testOrganizationId,
          team_id: testTeamId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*')
        .single()

      expect(error1).toBeNull()
      expect(error2).toBeNull()
      
      if (invitation1) createdInvitationIds.push(invitation1.id)
      if (invitation2) createdInvitationIds.push(invitation2.id)

      // Tokens should be different
      expect(invitation1!.token).not.toBe(invitation2!.token)

      // Calculate theoretical collision probability
      const tokenLength = invitation1!.token.length
      const charsetSize = 64 // Assuming base64-like charset
      const keyspace = Math.pow(charsetSize, tokenLength)
      
      // For cryptographically secure tokens, collision probability should be negligible
      expect(keyspace).toBeGreaterThan(Math.pow(2, 128)) // At least 128 bits of entropy
    })

    it('should handle collision detection if implemented', async () => {
      // Test that the system can handle the theoretical case of a collision
      // (even though it should never happen with proper random generation)
      
      const testTokens = []
      
      // Generate multiple tokens and check they're all different
      for (let i = 0; i < 20; i++) {
        const { data: invitation, error } = await supabaseAdmin
          .from('invitations')
          .insert({
            email: `collision-test-${i}@example.com`,
            full_name: `Collision Test ${i}`,
            role: 'employee',
            organization_id: testOrganizationId,
            team_id: testTeamId,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          })
          .select('*')
          .single()

        if (invitation) {
          testTokens.push(invitation.token)
          createdInvitationIds.push(invitation.id)
        }
      }

      // Verify no duplicates in our test set
      const uniqueTokens = new Set(testTokens)
      expect(uniqueTokens.size).toBe(testTokens.length)
    })
  })
})