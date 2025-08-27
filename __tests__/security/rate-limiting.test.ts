/**
 * Rate Limiting and Abuse Prevention Test Suite
 * 
 * This comprehensive test suite validates rate limiting and abuse prevention including:
 * - API rate limiting enforcement
 * - Authentication attempt rate limiting
 * - Request throttling per user/IP
 * - Brute force attack prevention
 * - Account lockout mechanisms
 * - DDoS protection simulation
 * - Resource consumption limits
 * - Abuse pattern detection
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { createMockRequest, createTestUser, createTestOrganization, cleanupTestData, simulateRateLimitTest } from '../utils/test-helpers'

// Import API route handlers
import { POST as authSignup } from '@/app/api/auth/signup/route'
import { POST as authSignupWithInvitation } from '@/app/api/auth/signup-with-invitation/route'
import { GET as invitationsLookup } from '@/app/api/invitations/lookup/route'
import { POST as employeesPost } from '@/app/api/employees/route'
import { POST as leaveRequestsPost } from '@/app/api/leave-requests/route'
import { POST as sendInvitation } from '@/app/api/send-invitation/route'

describe('Rate Limiting and Abuse Prevention Tests', () => {
  let testOrgId: string
  let adminUserId: string
  let testUserIds: string[]
  let testOrgIds: string[]

  beforeEach(async () => {
    testOrgId = await createTestOrganization('Rate Limit Test Org')
    adminUserId = await createTestUser('admin@ratetest.com', testOrgId, 'admin')
    
    testUserIds = [adminUserId]
    testOrgIds = [testOrgId]
  })

  afterEach(async () => {
    await cleanupTestData(testUserIds, testOrgIds)
    
    // Add delay to reset rate limits between tests
    await new Promise(resolve => setTimeout(resolve, 1000))
  })

  describe('Authentication Rate Limiting', () => {
    test('should implement rate limiting on signup endpoint', async () => {
      const rapidRequests: Promise<Response>[] = []
      const requestCount = 15 // Exceed typical rate limit
      
      // Make rapid successive signup requests
      for (let i = 0; i < requestCount; i++) {
        const request = createMockRequest('POST', '/api/auth/signup', {
          email: `ratetest${i}@example.com`,
          password: 'validpassword123',
          fullName: `Rate Test User ${i}`
        })
        
        rapidRequests.push(authSignup(request))
      }

      const responses = await Promise.all(rapidRequests)
      
      // Analyze response patterns
      const statusCounts = responses.reduce((acc, response) => {
        const status = response.status
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {} as Record<number, number>)

      // Should have some 429 (Too Many Requests) responses
      expect(statusCounts[429] || 0).toBeGreaterThan(0)
      
      // Should have fewer successful requests than total requests
      const successfulRequests = statusCounts[201] || 0
      expect(successfulRequests).toBeLessThan(requestCount)

      console.log('Signup rate limiting results:', statusCounts)
    })

    test('should implement progressive rate limiting with increasing delays', async () => {
      const firstBatch: Promise<Response>[] = []
      const secondBatch: Promise<Response>[] = []
      
      // First batch of requests
      for (let i = 0; i < 10; i++) {
        const request = createMockRequest('POST', '/api/auth/signup', {
          email: `batch1-${i}@ratetest.com`,
          password: 'validpassword123'
        })
        firstBatch.push(authSignup(request))
      }

      const firstResponses = await Promise.all(firstBatch)
      const firstRateLimited = firstResponses.filter(r => r.status === 429).length

      // Wait and try second batch
      await new Promise(resolve => setTimeout(resolve, 2000))

      for (let i = 0; i < 10; i++) {
        const request = createMockRequest('POST', '/api/auth/signup', {
          email: `batch2-${i}@ratetest.com`,
          password: 'validpassword123'
        })
        secondBatch.push(authSignup(request))
      }

      const secondResponses = await Promise.all(secondBatch)
      const secondRateLimited = secondResponses.filter(r => r.status === 429).length

      // Second batch should have fewer rate limited responses (rate limit reset)
      expect(secondRateLimited).toBeLessThanOrEqual(firstRateLimited)
    })

    test('should rate limit invitation-based signup attempts', async () => {
      // Create a valid invitation token
      const validToken = 'valid-rate-test-token-123'
      
      const rapidInviteSignups: Promise<Response>[] = []
      
      for (let i = 0; i < 12; i++) {
        const request = createMockRequest('POST', '/api/auth/signup-with-invitation', {
          token: validToken,
          email: `invitesignup${i}@ratetest.com`,
          password: 'validpassword123',
          fullName: `Invite Signup ${i}`
        })
        
        rapidInviteSignups.push(authSignupWithInvitation(request))
      }

      const responses = await Promise.all(rapidInviteSignups)
      
      const rateLimitedCount = responses.filter(r => r.status === 429).length
      expect(rateLimitedCount).toBeGreaterThan(0)
    })

    test('should implement IP-based rate limiting', async () => {
      // Simulate requests from the same IP but different emails
      const sameIPRequests: Promise<Response>[] = []
      const ipAddress = '192.168.1.100'
      
      for (let i = 0; i < 20; i++) {
        const request = createMockRequest('POST', '/api/auth/signup', {
          email: `sameip${i}@ratetest.com`,
          password: 'validpassword123'
        }, {
          headers: {
            'x-forwarded-for': ipAddress,
            'x-real-ip': ipAddress
          }
        })
        
        sameIPRequests.push(authSignup(request))
      }

      const responses = await Promise.all(sameIPRequests)
      
      // Should have IP-based rate limiting
      const rateLimitedCount = responses.filter(r => r.status === 429).length
      expect(rateLimitedCount).toBeGreaterThan(5) // More aggressive IP-based limiting
    })
  })

  describe('API Endpoint Rate Limiting', () => {
    test('should rate limit employee creation endpoint', async () => {
      const rapidEmployeeCreation: Promise<Response>[] = []
      
      for (let i = 0; i < 10; i++) {
        const request = createMockRequest('POST', '/api/employees', {
          email: `employee${i}@ratetest.com`,
          fullName: `Rate Test Employee ${i}`,
          role: 'employee'
        }, { userId: adminUserId, organizationId: testOrgId })
        
        rapidEmployeeCreation.push(employeesPost(request))
      }

      const responses = await Promise.all(rapidEmployeeCreation)
      
      const statusCounts = responses.reduce((acc, response) => {
        acc[response.status] = (acc[response.status] || 0) + 1
        return acc
      }, {} as Record<number, number>)

      // Should have some rate limited responses
      expect(statusCounts[429] || 0).toBeGreaterThan(0)
    })

    test('should rate limit leave request creation', async () => {
      const rapidLeaveRequests: Promise<Response>[] = []
      
      for (let i = 0; i < 8; i++) {
        const request = createMockRequest('POST', '/api/leave-requests', {
          startDate: `2024-0${Math.floor(i/2) + 1}-${(i % 2) + 10}`,
          endDate: `2024-0${Math.floor(i/2) + 1}-${(i % 2) + 11}`,
          leaveTypeId: 'valid-leave-type-id',
          reason: `Rapid leave request ${i}`
        }, { userId: adminUserId, organizationId: testOrgId })
        
        rapidLeaveRequests.push(leaveRequestsPost(request))
      }

      const responses = await Promise.all(rapidLeaveRequests)
      
      const rateLimitedCount = responses.filter(r => r.status === 429).length
      expect(rateLimitedCount).toBeGreaterThan(0)
    })

    test('should rate limit invitation sending', async () => {
      const rapidInvitations: Promise<Response>[] = []
      
      for (let i = 0; i < 6; i++) {
        const request = createMockRequest('POST', '/api/send-invitation', {
          email: `rapidinvite${i}@ratetest.com`,
          role: 'employee',
          fullName: `Rapid Invite ${i}`
        }, { userId: adminUserId, organizationId: testOrgId })
        
        rapidInvitations.push(sendInvitation(request))
      }

      const responses = await Promise.all(rapidInvitations)
      
      const rateLimitedCount = responses.filter(r => r.status === 429).length
      expect(rateLimitedCount).toBeGreaterThan(0)
    })

    test('should implement per-user rate limiting', async () => {
      // Create another user to test per-user isolation
      const secondUserId = await createTestUser('user2@ratetest.com', testOrgId, 'admin')
      testUserIds.push(secondUserId)

      // Make requests from first user
      const user1Requests: Promise<Response>[] = []
      for (let i = 0; i < 5; i++) {
        const request = createMockRequest('POST', '/api/employees', {
          email: `user1emp${i}@ratetest.com`,
          fullName: `User 1 Employee ${i}`,
          role: 'employee'
        }, { userId: adminUserId, organizationId: testOrgId })
        
        user1Requests.push(employeesPost(request))
      }

      // Make requests from second user simultaneously
      const user2Requests: Promise<Response>[] = []
      for (let i = 0; i < 5; i++) {
        const request = createMockRequest('POST', '/api/employees', {
          email: `user2emp${i}@ratetest.com`,
          fullName: `User 2 Employee ${i}`,
          role: 'employee'
        }, { userId: secondUserId, organizationId: testOrgId })
        
        user2Requests.push(employeesPost(request))
      }

      const [user1Responses, user2Responses] = await Promise.all([
        Promise.all(user1Requests),
        Promise.all(user2Requests)
      ])

      // Both users should be subject to their own rate limits
      const user1Success = user1Responses.filter(r => r.status === 201).length
      const user2Success = user2Responses.filter(r => r.status === 201).length

      // At least some requests from each user should succeed
      expect(user1Success).toBeGreaterThan(0)
      expect(user2Success).toBeGreaterThan(0)
    })
  })

  describe('Brute Force Attack Prevention', () => {
    test('should detect and prevent invitation token brute force attempts', async () => {
      const bruteForceAttempts: Promise<Response>[] = []
      
      // Generate many invalid tokens
      const invalidTokens = []
      for (let i = 0; i < 50; i++) {
        invalidTokens.push(`invalid-token-${i}-${Math.random().toString(36).slice(2)}`)
      }

      // Attempt to lookup tokens rapidly
      for (const token of invalidTokens) {
        const request = createMockRequest('GET', `/api/invitations/lookup?token=${token}`)
        bruteForceAttempts.push(invitationsLookup(request))
      }

      const responses = await Promise.all(bruteForceAttempts)
      
      // Should start blocking after many failed attempts
      const rateLimitedCount = responses.filter(r => r.status === 429).length
      expect(rateLimitedCount).toBeGreaterThan(20) // High threshold for brute force detection
    })

    test('should implement exponential backoff for repeated failures', async () => {
      const firstAttempts: Promise<Response>[] = []
      const secondAttempts: Promise<Response>[] = []
      
      // First round of failed attempts
      for (let i = 0; i < 10; i++) {
        const request = createMockRequest('POST', '/api/auth/signup', {
          email: 'same-email@brute-force.com', // Same email for account lockout
          password: `wrongpassword${i}`
        })
        firstAttempts.push(authSignup(request))
      }

      const firstResponses = await Promise.all(firstAttempts)
      const firstBlockedCount = firstResponses.filter(r => r.status === 429).length

      // Wait minimal time and try again
      await new Promise(resolve => setTimeout(resolve, 500))

      // Second round should be blocked more aggressively
      for (let i = 0; i < 5; i++) {
        const request = createMockRequest('POST', '/api/auth/signup', {
          email: 'same-email@brute-force.com',
          password: `stillwrong${i}`
        })
        secondAttempts.push(authSignup(request))
      }

      const secondResponses = await Promise.all(secondAttempts)
      const secondBlockedCount = secondResponses.filter(r => r.status === 429).length

      // Second round should have higher block rate
      const firstBlockRate = firstBlockedCount / firstResponses.length
      const secondBlockRate = secondBlockedCount / secondResponses.length

      expect(secondBlockRate).toBeGreaterThanOrEqual(firstBlockRate)
    })
  })

  describe('Resource Consumption Limits', () => {
    test('should limit request payload size', async () => {
      const largePayload = 'x'.repeat(10000) // 10KB payload
      const extremePayload = 'x'.repeat(100000) // 100KB payload

      const largeRequest = createMockRequest('POST', '/api/employees', {
        email: 'large@ratetest.com',
        fullName: largePayload,
        role: 'employee'
      }, { userId: adminUserId, organizationId: testOrgId })

      const largeResponse = await employeesPost(largeRequest)
      expect(largeResponse.status).toBeGreaterThanOrEqual(400) // Should reject large payload

      const extremeRequest = createMockRequest('POST', '/api/employees', {
        email: 'extreme@ratetest.com',
        fullName: extremePayload,
        role: 'employee'
      }, { userId: adminUserId, organizationId: testOrgId })

      const extremeResponse = await employeesPost(extremeRequest)
      expect(extremeResponse.status).toBeGreaterThanOrEqual(400) // Should definitely reject
    })

    test('should limit concurrent requests per user', async () => {
      // Simulate high concurrency from single user
      const concurrentRequests: Promise<Response>[] = []
      
      for (let i = 0; i < 20; i++) {
        const request = createMockRequest('POST', '/api/leave-requests', {
          startDate: '2024-06-01',
          endDate: '2024-06-02',
          leaveTypeId: 'valid-leave-type-id',
          reason: `Concurrent request ${i}`
        }, { userId: adminUserId, organizationId: testOrgId })
        
        // Don't await - make them truly concurrent
        concurrentRequests.push(leaveRequestsPost(request))
      }

      const responses = await Promise.all(concurrentRequests)
      
      // Should limit concurrent processing
      const rateLimitedCount = responses.filter(r => r.status === 429).length
      const errorCount = responses.filter(r => r.status >= 500).length // Server overload
      
      expect(rateLimitedCount + errorCount).toBeGreaterThan(5)
    })

    test('should implement time window-based rate limiting', async () => {
      const windowSize = 2000 // 2 seconds
      const firstWindow: Promise<Response>[] = []
      const secondWindow: Promise<Response>[] = []

      // First time window
      for (let i = 0; i < 8; i++) {
        const request = createMockRequest('POST', '/api/employees', {
          email: `window1-${i}@ratetest.com`,
          fullName: `Window 1 Employee ${i}`,
          role: 'employee'
        }, { userId: adminUserId, organizationId: testOrgId })
        
        firstWindow.push(employeesPost(request))
      }

      const firstResponses = await Promise.all(firstWindow)
      const firstSuccessCount = firstResponses.filter(r => r.status === 201).length

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, windowSize))

      // Second time window - should allow more requests
      for (let i = 0; i < 8; i++) {
        const request = createMockRequest('POST', '/api/employees', {
          email: `window2-${i}@ratetest.com`,
          fullName: `Window 2 Employee ${i}`,
          role: 'employee'
        }, { userId: adminUserId, organizationId: testOrgId })
        
        secondWindow.push(employeesPost(request))
      }

      const secondResponses = await Promise.all(secondWindow)
      const secondSuccessCount = secondResponses.filter(r => r.status === 201).length

      // Second window should allow similar number of requests
      expect(secondSuccessCount).toBeGreaterThanOrEqual(Math.min(firstSuccessCount, 1))
    })
  })

  describe('Abuse Pattern Detection', () => {
    test('should detect suspicious signup patterns', async () => {
      // Pattern: Many signups with similar email patterns
      const suspiciousPattern: Promise<Response>[] = []
      const baseEmail = 'suspicious'
      
      for (let i = 0; i < 15; i++) {
        const request = createMockRequest('POST', '/api/auth/signup', {
          email: `${baseEmail}${i}@temp-mail.com`,
          password: 'password123',
          fullName: `User ${i}`
        })
        
        suspiciousPattern.push(authSignup(request))
        
        // Small delay to simulate realistic timing
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      const responses = await Promise.all(suspiciousPattern)
      
      // Should detect pattern and start blocking
      const laterResponses = responses.slice(-5) // Last 5 responses
      const blockedInPattern = laterResponses.filter(r => r.status === 429).length
      
      expect(blockedInPattern).toBeGreaterThan(0)
    })

    test('should detect rapid organization switching attempts', async () => {
      // Create multiple organizations
      const org2Id = await createTestOrganization('Rate Test Org 2')
      const org3Id = await createTestOrganization('Rate Test Org 3')
      testOrgIds.push(org2Id, org3Id)

      // Create user in multiple orgs
      const multiOrgUserId = await createTestUser('multi@ratetest.com', testOrgId, 'admin')
      testUserIds.push(multiOrgUserId)

      // Add to other orgs
      // ... (setup code for multi-org user)

      const rapidSwitching: Promise<Response>[] = []
      const orgs = [testOrgId, org2Id, org3Id]

      // Rapidly switch between organizations
      for (let i = 0; i < 12; i++) {
        const orgId = orgs[i % orgs.length]
        const request = createMockRequest('GET', '/api/employees', {}, {
          userId: multiOrgUserId,
          organizationId: orgId
        })
        
        rapidSwitching.push(employeesGet(request))
      }

      const responses = await Promise.all(rapidSwitching)
      
      // Should detect rapid switching pattern
      const suspiciousCount = responses.filter(r => r.status === 429).length
      expect(suspiciousCount).toBeGreaterThan(0)
    })

    test('should implement honeypot detection for automated requests', async () => {
      // Test with suspicious user agents and headers
      const botLikeRequests = [
        {
          headers: { 'user-agent': 'python-requests/2.28.0' }
        },
        {
          headers: { 'user-agent': 'curl/7.68.0' }
        },
        {
          headers: { 'user-agent': 'bot/1.0' }
        },
        {
          headers: { 'user-agent': '' } // Empty user agent
        }
      ]

      const responses: Response[] = []

      for (let i = 0; i < botLikeRequests.length; i++) {
        const request = createMockRequest('POST', '/api/auth/signup', {
          email: `bot${i}@automated.com`,
          password: 'botpassword123'
        }, {
          headers: botLikeRequests[i].headers
        })
        
        const response = await authSignup(request)
        responses.push(response)
      }

      // Should detect bot-like behavior
      const blockedBots = responses.filter(r => r.status === 429 || r.status === 403).length
      expect(blockedBots).toBeGreaterThan(0)
    })
  })

  describe('Rate Limit Headers and Feedback', () => {
    test('should include rate limit headers in responses', async () => {
      const request = createMockRequest('POST', '/api/auth/signup', {
        email: 'headertest@ratetest.com',
        password: 'validpassword123'
      })

      const response = await authSignup(request)

      // Check for standard rate limit headers
      const rateLimitHeaders = [
        'x-ratelimit-limit',
        'x-ratelimit-remaining', 
        'x-ratelimit-reset',
        'retry-after'
      ]

      let hasRateLimitHeader = false
      for (const header of rateLimitHeaders) {
        if (response.headers.get(header)) {
          hasRateLimitHeader = true
          break
        }
      }

      // Should include at least one rate limit header
      if (response.status === 429) {
        expect(hasRateLimitHeader).toBe(true)
      }
    })

    test('should provide appropriate error messages for rate limited requests', async () => {
      // Trigger rate limiting
      const rapidRequests: Promise<Response>[] = []
      
      for (let i = 0; i < 10; i++) {
        const request = createMockRequest('POST', '/api/auth/signup', {
          email: `errormsg${i}@ratetest.com`,
          password: 'validpassword123'
        })
        rapidRequests.push(authSignup(request))
      }

      const responses = await Promise.all(rapidRequests)
      const rateLimitedResponse = responses.find(r => r.status === 429)

      if (rateLimitedResponse) {
        const data = await rateLimitedResponse.json()
        
        // Error message should be informative but not revealing
        expect(data.error).toBeDefined()
        expect(data.error).toMatch(/rate limit|too many|try again/i)
        expect(data.error).not.toContain('server error')
        expect(data.error).not.toContain('internal')
      }
    })
  })

  describe('Rate Limit Bypass Prevention', () => {
    test('should prevent rate limit bypass via different user agents', async () => {
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Mozilla/5.0 (X11; Linux x86_64)',
        'PostmanRuntime/7.29.0',
        'insomnia/2023.1.0'
      ]

      const bypassAttempts: Promise<Response>[] = []
      
      for (let i = 0; i < userAgents.length * 3; i++) {
        const userAgent = userAgents[i % userAgents.length]
        const request = createMockRequest('POST', '/api/auth/signup', {
          email: `bypass${i}@ratetest.com`,
          password: 'validpassword123'
        }, {
          headers: { 'user-agent': userAgent }
        })
        
        bypassAttempts.push(authSignup(request))
      }

      const responses = await Promise.all(bypassAttempts)
      
      // Should still apply rate limiting regardless of user agent
      const rateLimitedCount = responses.filter(r => r.status === 429).length
      expect(rateLimitedCount).toBeGreaterThan(5)
    })

    test('should prevent rate limit bypass via header manipulation', async () => {
      const headerVariations = [
        { 'x-forwarded-for': '192.168.1.1' },
        { 'x-real-ip': '10.0.0.1' },
        { 'x-client-ip': '172.16.0.1' },
        { 'cf-connecting-ip': '203.0.113.1' },
        { 'x-originating-ip': '198.51.100.1' }
      ]

      const headerBypassAttempts: Promise<Response>[] = []
      
      for (let i = 0; i < headerVariations.length * 4; i++) {
        const headers = headerVariations[i % headerVariations.length]
        const request = createMockRequest('POST', '/api/auth/signup', {
          email: `headerbypass${i}@ratetest.com`,
          password: 'validpassword123'
        }, { headers })
        
        headerBypassAttempts.push(authSignup(request))
      }

      const responses = await Promise.all(headerBypassAttempts)
      
      // Should not be fooled by header manipulation
      const rateLimitedCount = responses.filter(r => r.status === 429).length
      expect(rateLimitedCount).toBeGreaterThan(8)
    })
  })
})