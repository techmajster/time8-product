/**
 * Error Handling and Information Disclosure Prevention Test Suite
 * 
 * This comprehensive test suite validates secure error handling including:
 * - Information disclosure prevention in error messages
 * - Database error sanitization
 * - Stack trace filtering
 * - Generic error responses for security-sensitive operations
 * - Error logging without data leakage
 * - Consistent error response formats
 * - Timing attack prevention
 * - Debug information filtering in production
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { createMockRequest, createTestUser, createTestOrganization, cleanupTestData, validateSecureResponse } from '../utils/test-helpers'

// Import API route handlers
import { POST as authSignup } from '@/app/api/auth/signup/route'
import { POST as authSignupWithInvitation } from '@/app/api/auth/signup-with-invitation/route'
import { GET as invitationsLookup } from '@/app/api/invitations/lookup/route'
import { POST as employeesPost, GET as employeesGet } from '@/app/api/employees/route'
import { POST as leaveRequestsPost } from '@/app/api/leave-requests/route'
import { POST as organizationsPost } from '@/app/api/organizations/route'
import { GET as organizationMembersGet } from '@/app/api/organization/members/route'

describe('Error Handling and Information Disclosure Prevention Tests', () => {
  let testOrgId: string
  let adminUserId: string
  let employeeUserId: string
  let testUserIds: string[]
  let testOrgIds: string[]

  beforeEach(async () => {
    testOrgId = await createTestOrganization('Error Handling Test Org')
    adminUserId = await createTestUser('admin@errortest.com', testOrgId, 'admin')
    employeeUserId = await createTestUser('employee@errortest.com', testOrgId, 'employee')
    
    testUserIds = [adminUserId, employeeUserId]
    testOrgIds = [testOrgId]
  })

  afterEach(async () => {
    await cleanupTestData(testUserIds, testOrgIds)
  })

  describe('Database Error Information Disclosure Prevention', () => {
    test('should not expose database schema information in error messages', async () => {
      // Test with invalid UUID format that might cause database errors
      const request = createMockRequest('POST', '/api/leave-requests', {
        startDate: '2024-01-15',
        endDate: '2024-01-16',
        leaveTypeId: 'invalid-uuid-format-should-cause-db-error',
        reason: 'Test leave request'
      }, { userId: adminUserId, organizationId: testOrgId })

      const response = await leaveRequestsPost(request)
      const data = await response.json()

      expect(response.status).toBeGreaterThanOrEqual(400)

      // Should not contain database-specific error information
      const sensitivePatterns = [
        /invalid input syntax for.*uuid/i,
        /relation.*does not exist/i,
        /constraint.*violat/i,
        /foreign key constraint/i,
        /pg_/i,
        /postgresql/i,
        /table.*doesn.*exist/i,
        /column.*does not exist/i,
        /syntax error at or near/i
      ]

      for (const pattern of sensitivePatterns) {
        expect(data.error || '').not.toMatch(pattern)
        expect(JSON.stringify(data)).not.toMatch(pattern)
      }

      // Should provide generic error message
      expect(data.error).toMatch(/invalid|error|failed|not found/i)
      expect(data.error.length).toBeLessThan(200) // Reasonably short
    })

    test('should sanitize SQL constraint violation errors', async () => {
      // Try to create employee with duplicate email (should cause constraint violation)
      const duplicateEmailRequest = createMockRequest('POST', '/api/employees', {
        email: 'admin@errortest.com', // This email already exists
        fullName: 'Duplicate User',
        role: 'employee'
      }, { userId: adminUserId, organizationId: testOrgId })

      const response = await employeesPost(duplicateEmailRequest)
      const data = await response.json()

      expect(response.status).toBeGreaterThanOrEqual(400)

      // Should not expose constraint names or table structures
      const constraintPatterns = [
        /unique_violation/i,
        /duplicate key value violates unique constraint/i,
        /profiles_email_key/i,
        /constraint.*profiles/i,
        /DETAIL:/i,
        /Key.*already exists/i
      ]

      for (const pattern of constraintPatterns) {
        expect(data.error || '').not.toMatch(pattern)
        expect(JSON.stringify(data)).not.toMatch(pattern)
      }

      // Should provide user-friendly error
      expect(data.error).toMatch(/email.*already.*exist|duplicate.*email|user.*already.*exist/i)
    })

    test('should handle foreign key constraint errors securely', async () => {
      // Try to create leave request with non-existent organization
      const request = createMockRequest('POST', '/api/leave-requests', {
        startDate: '2024-01-15',
        endDate: '2024-01-16',
        leaveTypeId: '12345678-1234-1234-1234-123456789012', // Valid UUID format but non-existent
        reason: 'Foreign key test'
      }, { userId: adminUserId, organizationId: testOrgId })

      const response = await leaveRequestsPost(request)
      const data = await response.json()

      expect(response.status).toBeGreaterThanOrEqual(400)

      // Should not expose foreign key information
      const fkPatterns = [
        /foreign key constraint.*fails/i,
        /violates foreign key constraint/i,
        /references.*table/i,
        /fk_.*_.*_id/i,
        /constraint.*fkey/i
      ]

      for (const pattern of fkPatterns) {
        expect(data.error || '').not.toMatch(pattern)
      }
    })

    test('should handle database connection errors gracefully', async () => {
      // This test simulates what happens when database is unavailable
      // In real scenarios, this would require mocking the database connection

      const request = createMockRequest('GET', '/api/employees', {}, {
        userId: adminUserId,
        organizationId: 'invalid-org-id-that-might-cause-connection-issues'
      })

      const response = await employeesGet(request)
      const data = await response.json()

      // Should not expose connection details
      const connectionPatterns = [
        /connection.*refused/i,
        /timeout.*expired/i,
        /host.*not found/i,
        /database.*not.*exist/i,
        /authentication.*failed/i,
        /could not connect to server/i,
        /connection string/i,
        /supabase/i,
        /postgres/i
      ]

      for (const pattern of connectionPatterns) {
        expect(data.error || '').not.toMatch(pattern)
      }

      expect(response.status).toBe(403) // Should be handled as access denied
      expect(data.error).toMatch(/access denied|unauthorized|organization/i)
    })
  })

  describe('Authentication Error Information Disclosure', () => {
    test('should not reveal whether user exists during signup', async () => {
      // Test with existing user email
      const existingEmailRequest = createMockRequest('POST', '/api/auth/signup', {
        email: 'admin@errortest.com', // Existing email
        password: 'newpassword123',
        fullName: 'New User'
      })

      const existingEmailResponse = await authSignup(existingEmailRequest)
      const existingEmailData = await existingEmailResponse.json()

      // Test with non-existing user email  
      const newEmailRequest = createMockRequest('POST', '/api/auth/signup', {
        email: 'newuser@errortest.com', // New email
        password: 'newpassword123',
        fullName: 'New User'
      })

      const newEmailResponse = await authSignup(newEmailRequest)
      const newEmailData = await newEmailResponse.json()

      // Response patterns should be similar to prevent user enumeration
      if (existingEmailResponse.status >= 400) {
        // Error messages should not distinguish between existing/non-existing users
        expect(existingEmailData.error).not.toMatch(/user.*already.*exists/i)
        expect(existingEmailData.error).not.toMatch(/email.*taken/i)
        expect(existingEmailData.error).not.toMatch(/account.*already.*exists/i)

        // Should provide generic error message
        expect(existingEmailData.error).toMatch(/unable to.*create|signup.*failed|invalid.*request/i)
      }

      // Response times should be similar (timing attack prevention)
      // This would require more sophisticated timing analysis in real tests
    })

    test('should handle invalid invitation tokens securely', async () => {
      const invalidTokens = [
        'invalid-token-123',
        '12345678-1234-1234-1234-123456789012', // Valid UUID but invalid token
        '', // Empty token
        'a'.repeat(100), // Very long token
        'special-chars-!@#$%^&*()',
        null,
        undefined
      ]

      for (const token of invalidTokens) {
        const lookupRequest = createMockRequest('GET', `/api/invitations/lookup?token=${token || ''}`)
        const lookupResponse = await invitationsLookup(lookupRequest)
        const lookupData = await lookupResponse.json()

        expect(lookupResponse.status).toBe(404)
        
        // Should provide consistent error message
        expect(lookupData.error).toMatch(/invitation.*not found|invalid.*token/i)
        
        // Should not reveal token format requirements or processing details
        expect(lookupData.error).not.toMatch(/token.*must be.*uuid/i)
        expect(lookupData.error).not.toMatch(/invalid.*format/i)
        expect(lookupData.error).not.toMatch(/expired/i) // Don't distinguish between invalid and expired
        
        // Should not contain debugging information
        expect(lookupData.error).not.toContain('Error:')
        expect(lookupData).not.toHaveProperty('stack')
        expect(lookupData).not.toHaveProperty('details')
      }

      // Test invitation-based signup with invalid tokens
      const signupRequest = createMockRequest('POST', '/api/auth/signup-with-invitation', {
        token: 'definitely-invalid-token',
        email: 'test@errortest.com',
        password: 'validpassword123',
        fullName: 'Test User'
      })

      const signupResponse = await authSignupWithInvitation(signupRequest)
      const signupData = await signupResponse.json()

      expect(signupResponse.status).toBe(404)
      expect(signupData.error).toMatch(/invitation.*not found|invalid.*invitation/i)
      expect(signupData.error).not.toContain('token')
      expect(signupData.error).not.toContain('UUID')
    })
  })

  describe('Authorization Error Information Disclosure', () => {
    test('should not reveal resource existence in authorization failures', async () => {
      // Test accessing non-existent resource with unauthorized user
      const nonExistentResourceRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: employeeUserId,
        organizationId: 'non-existent-org-id-12345'
      })

      const nonExistentResponse = await employeesGet(nonExistentResourceRequest)
      const nonExistentData = await nonExistentResponse.json()

      // Test accessing existing resource with unauthorized user
      const unauthorizedResourceRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: employeeUserId,
        organizationId: testOrgId // Employee might not have access to all employee data
      })

      const unauthorizedResponse = await employeesGet(unauthorizedResourceRequest)

      // Both should return similar authorization errors
      expect(nonExistentResponse.status).toBe(403)
      expect(nonExistentData.error).toMatch(/access denied|unauthorized|permission/i)
      
      // Should not reveal whether resource exists
      expect(nonExistentData.error).not.toMatch(/not found|does not exist/i)
      expect(nonExistentData.error).not.toMatch(/organization.*invalid/i)
      expect(nonExistentData.error).not.toMatch(/resource.*missing/i)
    })

    test('should provide consistent error messages for different authorization failures', async () => {
      const authorizationTests = [
        {
          description: 'wrong organization',
          request: createMockRequest('GET', '/api/employees', {}, {
            userId: employeeUserId,
            organizationId: 'wrong-org-id'
          })
        },
        {
          description: 'missing organization context',
          request: createMockRequest('GET', '/api/employees', {}, {
            userId: employeeUserId
            // Missing organizationId
          })
        },
        {
          description: 'invalid user context',
          request: createMockRequest('GET', '/api/employees', {}, {
            userId: 'invalid-user-id',
            organizationId: testOrgId
          })
        }
      ]

      const responses = []
      for (const test of authorizationTests) {
        const response = await employeesGet(test.request)
        const data = await response.json()
        
        responses.push({
          description: test.description,
          status: response.status,
          error: data.error
        })
      }

      // All should return 400 or 403 status codes
      for (const response of responses) {
        expect(response.status).toBeGreaterThanOrEqual(400)
        expect(response.status).toBeLessThan(500)
      }

      // Error messages should be generic and consistent
      for (const response of responses) {
        expect(response.error).toMatch(/access denied|unauthorized|invalid|missing/i)
        expect(response.error.length).toBeLessThan(150) // Keep messages concise
      }
    })
  })

  describe('Input Validation Error Information Disclosure', () => {
    test('should provide helpful but non-revealing validation error messages', async () => {
      const invalidInputTests = [
        {
          input: { email: 'invalid-email', password: 'valid123', fullName: 'Test' },
          expectedPattern: /email.*invalid|invalid.*email/i
        },
        {
          input: { email: 'test@example.com', password: '123', fullName: 'Test' },
          expectedPattern: /password.*too.*short|invalid.*password/i
        },
        {
          input: { email: 'test@example.com', password: 'valid123', fullName: '' },
          expectedPattern: /name.*required|invalid.*name/i
        },
        {
          input: { email: 'test@example.com', password: 'valid123', fullName: 'x'.repeat(1000) },
          expectedPattern: /name.*too.*long|invalid.*length/i
        }
      ]

      for (const test of invalidInputTests) {
        const request = createMockRequest('POST', '/api/auth/signup', test.input)
        const response = await authSignup(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toMatch(test.expectedPattern)
        
        // Should not contain field validation internals
        expect(data.error).not.toMatch(/zod|joi|yup|validation.*failed/i)
        expect(data.error).not.toContain('TypeError')
        expect(data.error).not.toContain('ValidationError')
        expect(data).not.toHaveProperty('errors') // Don't expose detailed validation errors
        expect(data).not.toHaveProperty('details')
      }
    })

    test('should handle malformed JSON gracefully', async () => {
      // This would require more sophisticated testing setup to send malformed JSON
      // For now, test with edge case data types

      const malformedRequests = [
        { email: null, password: 'test123', fullName: 'Test' },
        { email: 123, password: 'test123', fullName: 'Test' },
        { email: ['array'], password: 'test123', fullName: 'Test' },
        { email: { nested: 'object' }, password: 'test123', fullName: 'Test' }
      ]

      for (const malformedInput of malformedRequests) {
        const request = createMockRequest('POST', '/api/auth/signup', malformedInput)
        const response = await authSignup(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toMatch(/invalid.*input|invalid.*request|bad.*request/i)
        
        // Should not expose type information
        expect(data.error).not.toContain('typeof')
        expect(data.error).not.toContain('instanceof')
        expect(data.error).not.toMatch(/expected.*string.*got.*number/i)
      }
    })
  })

  describe('System Error Information Disclosure', () => {
    test('should handle unexpected server errors gracefully', async () => {
      // Test with inputs that might cause unexpected errors
      const problematicInputs = [
        {
          description: 'extremely nested object',
          data: { email: 'test@example.com', nested: { level1: { level2: { level3: 'deep' } } } }
        },
        {
          description: 'circular reference attempt',
          data: { email: 'test@example.com', password: 'valid123', selfRef: 'self' }
        },
        {
          description: 'unicode edge cases',
          data: { email: 'test@example.com', password: 'valid123', fullName: '🔥💀👻🎯' }
        }
      ]

      for (const test of problematicInputs) {
        const request = createMockRequest('POST', '/api/auth/signup', test.data)
        const response = await authSignup(request)
        
        if (response.status >= 500) {
          const data = await response.json()
          
          // Should not expose internal error details
          expect(data.error).not.toContain('Error:')
          expect(data.error).not.toMatch(/internal.*server.*error/i)
          expect(data).not.toHaveProperty('stack')
          expect(data).not.toHaveProperty('trace')
          expect(data).not.toHaveProperty('filename')
          expect(data).not.toHaveProperty('line')
          
          // Should provide generic error message
          expect(data.error).toMatch(/server.*error|something.*went.*wrong|try.*again/i)
        }
      }
    })

    test('should not expose file paths or system information', async () => {
      // Test various endpoints to ensure no file paths are exposed
      const endpoints = [
        { method: 'POST', path: '/api/auth/signup', body: { email: 'test@example.com' } },
        { method: 'POST', path: '/api/employees', body: { email: 'test@example.com' }, auth: true },
        { method: 'GET', path: '/api/invitations/lookup?token=invalid' }
      ]

      for (const endpoint of endpoints) {
        const request = createMockRequest(
          endpoint.method, 
          endpoint.path, 
          endpoint.body || {},
          endpoint.auth ? { userId: adminUserId, organizationId: testOrgId } : {}
        )

        let response: Response
        switch (endpoint.path.split('?')[0]) {
          case '/api/auth/signup':
            response = await authSignup(request)
            break
          case '/api/employees':
            response = await employeesPost(request)
            break
          case '/api/invitations/lookup':
            response = await invitationsLookup(request)
            break
          default:
            continue
        }

        const data = await response.json()
        const responseText = JSON.stringify(data)

        // Should not contain file paths
        const pathPatterns = [
          /\/home\/.*\//,
          /\/var\/.*\//,
          /\/usr\/.*\//,
          /C:\\.*\\/,
          /\\node_modules\\/,
          /\.js:\d+/,
          /\.ts:\d+/,
          /src\/.*\.js/,
          /app\/.*\.ts/
        ]

        for (const pattern of pathPatterns) {
          expect(responseText).not.toMatch(pattern)
        }

        // Should not contain system information
        const systemPatterns = [
          /node\.js/i,
          /nextjs/i,
          /supabase.*url/i,
          /localhost:\d+/,
          /127\.0\.0\.1/,
          /process\.env/i
        ]

        for (const pattern of systemPatterns) {
          expect(responseText).not.toMatch(pattern)
        }
      }
    })
  })

  describe('Error Response Consistency', () => {
    test('should maintain consistent error response structure', async () => {
      const errorScenarios = [
        {
          request: createMockRequest('POST', '/api/auth/signup', { email: 'invalid' }),
          expectedStatus: 400
        },
        {
          request: createMockRequest('GET', '/api/employees', {}, { userId: 'invalid' }),
          expectedStatus: [401, 403]
        },
        {
          request: createMockRequest('GET', '/api/invitations/lookup?token=invalid'),
          expectedStatus: 404
        }
      ]

      const errorResponses = []
      
      for (const scenario of errorScenarios) {
        let response: Response
        
        const path = scenario.request.url.split('?')[0].split('/').slice(-1)[0]
        switch (path) {
          case 'signup':
            response = await authSignup(scenario.request)
            break
          case 'employees':
            response = await employeesGet(scenario.request)
            break
          case 'lookup':
            response = await invitationsLookup(scenario.request)
            break
          default:
            continue
        }

        const data = await response.json()
        errorResponses.push({ status: response.status, data })
      }

      // All error responses should have consistent structure
      for (const errorResponse of errorResponses) {
        expect(errorResponse.data).toHaveProperty('error')
        expect(typeof errorResponse.data.error).toBe('string')
        expect(errorResponse.data.error.length).toBeGreaterThan(0)
        
        // Should not have extra debugging properties
        expect(errorResponse.data).not.toHaveProperty('stack')
        expect(errorResponse.data).not.toHaveProperty('details')
        expect(errorResponse.data).not.toHaveProperty('debug')
        expect(errorResponse.data).not.toHaveProperty('internal')
      }
    })

    test('should use appropriate HTTP status codes for different error types', async () => {
      const statusCodeTests = [
        {
          test: 'invalid input',
          request: createMockRequest('POST', '/api/auth/signup', { email: 'invalid' }),
          expectedStatus: 400,
          handler: authSignup
        },
        {
          test: 'unauthorized access',
          request: createMockRequest('GET', '/api/employees'),
          expectedStatus: 401,
          handler: employeesGet
        },
        {
          test: 'forbidden resource',
          request: createMockRequest('POST', '/api/employees', {
            email: 'test@example.com',
            fullName: 'Test',
            role: 'employee'
          }, { userId: employeeUserId, organizationId: testOrgId }),
          expectedStatus: 403,
          handler: employeesPost
        },
        {
          test: 'not found',
          request: createMockRequest('GET', '/api/invitations/lookup?token=not-found'),
          expectedStatus: 404,
          handler: invitationsLookup
        }
      ]

      for (const test of statusCodeTests) {
        const response = await test.handler(test.request)
        
        if (Array.isArray(test.expectedStatus)) {
          expect(test.expectedStatus).toContain(response.status)
        } else {
          expect(response.status).toBe(test.expectedStatus)
        }
        
        const data = await response.json()
        expect(data.error).toBeDefined()
      }
    })
  })

  describe('Timing Attack Prevention', () => {
    test('should have consistent response times for authentication operations', async () => {
      const timingTests = [
        {
          description: 'existing vs non-existing email',
          request1: createMockRequest('POST', '/api/auth/signup', {
            email: 'admin@errortest.com', // Existing
            password: 'test123'
          }),
          request2: createMockRequest('POST', '/api/auth/signup', {
            email: 'nonexistent@errortest.com', // Non-existing
            password: 'test123'
          })
        }
      ]

      for (const test of timingTests) {
        const start1 = performance.now()
        await authSignup(test.request1)
        const time1 = performance.now() - start1

        const start2 = performance.now()
        await authSignup(test.request2)
        const time2 = performance.now() - start2

        // Response times should be within reasonable range of each other
        const timeDifference = Math.abs(time1 - time2)
        const averageTime = (time1 + time2) / 2
        const percentageDifference = (timeDifference / averageTime) * 100

        // Allow up to 50% difference in response times (timing attacks typically look for much larger differences)
        expect(percentageDifference).toBeLessThan(50)
      }
    })
  })
})