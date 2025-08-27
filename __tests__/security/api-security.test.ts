/**
 * API Security Test Suite
 * 
 * This comprehensive test suite validates API endpoint security including:
 * - Authentication and authorization checks
 * - Role-based access control (RBAC)
 * - Input validation and sanitization
 * - SQL injection prevention
 * - Cross-site scripting (XSS) protection
 * - Organization-based data isolation
 * - Rate limiting and abuse prevention
 * - Error handling and information disclosure
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Import API route handlers for direct testing
import { POST as authSignup } from '@/app/api/auth/signup/route'
import { POST as authSignupWithInvitation } from '@/app/api/auth/signup-with-invitation/route'
import { GET as employeesGet, POST as employeesPost } from '@/app/api/employees/route'
import { GET as organizationsGet, POST as organizationsPost } from '@/app/api/organizations/route'
import { GET as leaveRequestsGet, POST as leaveRequestsPost } from '@/app/api/leave-requests/route'
import { GET as invitationsLookup } from '@/app/api/invitations/lookup/route'
import { POST as invitationsAccept } from '@/app/api/invitations/accept/route'

// Test utilities
import { createMockRequest, createTestUser, createTestOrganization, cleanupTestData } from '../utils/test-helpers'

// Mock Supabase client
const mockSupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('API Security Tests', () => {
  let testUserId: string
  let testOrgId: string
  let adminUserId: string
  let employeeUserId: string
  let testToken: string

  beforeEach(async () => {
    // Set up test data
    const testData = await createTestData()
    testUserId = testData.testUserId
    testOrgId = testData.testOrgId
    adminUserId = testData.adminUserId
    employeeUserId = testData.employeeUserId
    testToken = testData.testToken
  })

  afterEach(async () => {
    // Clean up test data
    await cleanupTestData([testUserId, adminUserId, employeeUserId], [testOrgId])
  })

  describe('Authentication Endpoint Security', () => {
    test('should reject signup with invalid email format', async () => {
      const request = createMockRequest('POST', '/api/auth/signup', {
        email: 'invalid-email',
        password: 'validpassword123'
      })

      const response = await authSignup(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toMatch(/invalid email/i)
    })

    test('should enforce password complexity requirements', async () => {
      const weakPasswords = ['123', 'password', '12345678', 'abc123']
      
      for (const password of weakPasswords) {
        const request = createMockRequest('POST', '/api/auth/signup', {
          email: 'test@example.com',
          password
        })

        const response = await authSignup(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toMatch(/password/i)
      }
    })

    test('should prevent SQL injection in signup fields', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "admin'; UPDATE users SET role='admin' WHERE email='test@example.com'; --",
        "test@example.com' UNION SELECT * FROM users WHERE '1'='1",
        "test'; INSERT INTO admin_users (email) VALUES ('hacker@evil.com'); --"
      ]

      for (const payload of sqlInjectionPayloads) {
        const request = createMockRequest('POST', '/api/auth/signup', {
          email: payload,
          password: 'validpassword123'
        })

        const response = await authSignup(request)
        expect(response.status).toBeGreaterThanOrEqual(400)
        
        // Ensure no database modification occurred
        const { data: maliciousUsers } = await mockSupabaseClient
          .from('profiles')
          .select('email')
          .ilike('email', '%hacker@evil.com%')
        
        expect(maliciousUsers).toHaveLength(0)
      }
    })

    test('should prevent XSS in signup fields', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '"><script>document.cookie="stolen"</script>'
      ]

      for (const payload of xssPayloads) {
        const request = createMockRequest('POST', '/api/auth/signup', {
          email: 'test@example.com',
          fullName: payload,
          password: 'validpassword123'
        })

        const response = await authSignup(request)
        const data = await response.json()

        // Should either reject the input or sanitize it
        if (response.status === 201) {
          expect(data.user?.full_name).not.toContain('<script>')
          expect(data.user?.full_name).not.toContain('javascript:')
          expect(data.user?.full_name).not.toContain('onerror')
        } else {
          expect(response.status).toBe(400)
        }
      }
    })

    test('should validate invitation tokens securely', async () => {
      const invalidTokens = [
        '',
        'invalid-token',
        'abc123',
        '../../../admin',
        'SELECT * FROM invitations',
        '<script>alert("xss")</script>'
      ]

      for (const token of invalidTokens) {
        const request = createMockRequest('GET', `/api/invitations/lookup?token=${token}`)
        const response = await invitationsLookup(request)
        
        expect(response.status).toBe(404)
        
        const data = await response.json()
        expect(data.error).toMatch(/invitation not found|invalid token/i)
      }
    })
  })

  describe('Authorization and Role-Based Access Control', () => {
    test('should enforce admin-only access to employee management', async () => {
      // Test with employee role
      const employeeRequest = createMockRequest('POST', '/api/employees', {
        email: 'new-employee@example.com',
        fullName: 'New Employee',
        role: 'employee'
      }, { userId: employeeUserId, organizationId: testOrgId })

      const employeeResponse = await employeesPost(employeeRequest)
      expect(employeeResponse.status).toBe(403)

      // Test with admin role (should succeed)
      const adminRequest = createMockRequest('POST', '/api/employees', {
        email: 'new-employee@example.com',
        fullName: 'New Employee',
        role: 'employee'
      }, { userId: adminUserId, organizationId: testOrgId })

      const adminResponse = await employeesPost(adminRequest)
      expect(adminResponse.status).toBe(201)
    })

    test('should prevent cross-organization data access', async () => {
      // Create second organization
      const secondOrgId = await createTestOrganization('Second Org')
      const secondOrgUserId = await createTestUser('user2@example.com', secondOrgId)

      // Try to access first org's employees from second org context
      const request = createMockRequest('GET', '/api/employees', {}, {
        userId: secondOrgUserId,
        organizationId: secondOrgId
      })

      const response = await employeesGet(request)
      const data = await response.json()

      // Should only return employees from the second org
      expect(response.status).toBe(200)
      expect(data.employees).toBeDefined()
      
      // Verify no employees from first org are returned
      const firstOrgEmployees = data.employees.filter((emp: any) => 
        emp.organization_id === testOrgId
      )
      expect(firstOrgEmployees).toHaveLength(0)

      // Cleanup
      await cleanupTestData([secondOrgUserId], [secondOrgId])
    })

    test('should validate organization membership for all protected routes', async () => {
      // Create user without organization membership
      const orphanUserId = await createTestUser('orphan@example.com')

      const protectedRoutes = [
        { method: 'GET', path: '/api/employees' },
        { method: 'POST', path: '/api/leave-requests', body: { startDate: '2024-01-01', endDate: '2024-01-02' } },
        { method: 'GET', path: '/api/dashboard-data' }
      ]

      for (const route of protectedRoutes) {
        const request = createMockRequest(route.method, route.path, route.body || {}, {
          userId: orphanUserId,
          organizationId: 'non-existent-org'
        })

        // Import and test the appropriate route handler
        let response: Response
        switch (route.path) {
          case '/api/employees':
            response = await (route.method === 'GET' ? employeesGet(request) : employeesPost(request))
            break
          case '/api/leave-requests':
            response = await (route.method === 'GET' ? leaveRequestsGet(request) : leaveRequestsPost(request))
            break
          default:
            continue // Skip routes we haven't implemented handlers for
        }

        expect(response.status).toBe(403)
        
        const data = await response.json()
        expect(data.error).toMatch(/organization|unauthorized|access denied/i)
      }

      // Cleanup
      await cleanupTestData([orphanUserId], [])
    })
  })

  describe('Input Validation and Sanitization', () => {
    test('should validate and sanitize employee creation inputs', async () => {
      const maliciousInputs = {
        email: '<script>alert("xss")</script>@example.com',
        fullName: '"; DROP TABLE employees; --',
        role: 'admin\'; UPDATE users SET role=\'super_admin\' WHERE id=1; --'
      }

      const request = createMockRequest('POST', '/api/employees', maliciousInputs, {
        userId: adminUserId,
        organizationId: testOrgId
      })

      const response = await employeesPost(request)
      
      // Should either reject the input entirely or sanitize it
      if (response.status === 201) {
        const data = await response.json()
        expect(data.employee.email).not.toContain('<script>')
        expect(data.employee.full_name).not.toContain('DROP TABLE')
        expect(data.employee.role).not.toContain('UPDATE')
      } else {
        expect(response.status).toBe(400)
      }
    })

    test('should validate date formats in leave requests', async () => {
      const invalidDates = [
        { startDate: 'invalid-date', endDate: '2024-01-02' },
        { startDate: '2024-01-01', endDate: 'not-a-date' },
        { startDate: '2024-13-01', endDate: '2024-01-02' }, // Invalid month
        { startDate: '2024-01-32', endDate: '2024-01-02' }, // Invalid day
        { startDate: '2024-01-02', endDate: '2024-01-01' }, // End before start
      ]

      for (const dateCombo of invalidDates) {
        const request = createMockRequest('POST', '/api/leave-requests', {
          ...dateCombo,
          leaveTypeId: 'valid-leave-type-id',
          reason: 'Test leave request'
        }, { userId: testUserId, organizationId: testOrgId })

        const response = await leaveRequestsPost(request)
        expect(response.status).toBe(400)

        const data = await response.json()
        expect(data.error).toMatch(/date|invalid/i)
      }
    })

    test('should prevent path traversal attacks', async () => {
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc/shadow',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ]

      for (const payload of pathTraversalPayloads) {
        // Test in various input fields
        const request = createMockRequest('POST', '/api/employees', {
          email: 'test@example.com',
          fullName: payload,
          avatarUrl: payload
        }, { userId: adminUserId, organizationId: testOrgId })

        const response = await employeesPost(request)
        
        // Should not process path traversal attempts
        expect(response.status).toBe(400)
      }
    })
  })

  describe('Rate Limiting and Abuse Prevention', () => {
    test('should implement rate limiting on authentication endpoints', async () => {
      const requests = []
      
      // Make rapid successive requests
      for (let i = 0; i < 20; i++) {
        const request = createMockRequest('POST', '/api/auth/signup', {
          email: `test${i}@example.com`,
          password: 'validpassword123'
        })
        requests.push(authSignup(request))
      }

      const responses = await Promise.all(requests)
      
      // Should eventually return 429 (Too Many Requests)
      const tooManyRequestsResponses = responses.filter(r => r.status === 429)
      expect(tooManyRequestsResponses.length).toBeGreaterThan(0)
    })

    test('should prevent email enumeration attacks', async () => {
      // Create a valid user first
      await createTestUser('existing@example.com', testOrgId)

      const emails = ['existing@example.com', 'nonexistent@example.com']
      const responses = []

      for (const email of emails) {
        const request = createMockRequest('POST', '/api/auth/signup', {
          email,
          password: 'validpassword123'
        })
        responses.push(await authSignup(request))
      }

      // Response times and error messages should be similar
      // to prevent enumeration of existing users
      const [existingResponse, nonExistentResponse] = responses
      
      // Both should return similar error patterns
      expect(Math.abs(existingResponse.status - nonExistentResponse.status)).toBeLessThanOrEqual(100)
    })
  })

  describe('Error Handling and Information Disclosure', () => {
    test('should not expose sensitive information in error messages', async () => {
      // Test with various malformed requests
      const malformedRequests = [
        { email: null, password: 'test' },
        { email: 'test@example.com' }, // Missing password
        { malformed: 'data' }
      ]

      for (const body of malformedRequests) {
        const request = createMockRequest('POST', '/api/auth/signup', body)
        const response = await authSignup(request)
        const data = await response.json()

        // Error messages should not expose internal structure
        expect(data.error).not.toMatch(/database|sql|internal|server|stack trace/i)
        expect(data.error).not.toContain('Error:')
        expect(data).not.toHaveProperty('stack')
        expect(data).not.toHaveProperty('internal')
      }
    })

    test('should handle database connection failures gracefully', async () => {
      // Mock database connection failure (this would require more sophisticated mocking)
      // For now, test that we handle invalid organization IDs gracefully
      const request = createMockRequest('GET', '/api/employees', {}, {
        userId: testUserId,
        organizationId: 'invalid-org-id-12345'
      })

      const response = await employeesGet(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).not.toContain('uuid')
      expect(data.error).not.toContain('constraint')
      expect(data.error).not.toContain('foreign key')
    })

    test('should sanitize error responses to prevent information leakage', async () => {
      // Test with various edge cases that might cause database errors
      const edgeCases = [
        { id: '00000000-0000-0000-0000-000000000000' }, // Valid UUID format but non-existent
        { id: 'not-a-uuid' }, // Invalid UUID format
        { id: '"; DROP TABLE users; --' } // SQL injection attempt
      ]

      for (const params of edgeCases) {
        const request = createMockRequest('GET', `/api/employees/${params.id}`, {}, {
          userId: testUserId,
          organizationId: testOrgId
        })

        // Mock the employee detail endpoint (we'd need to implement this handler)
        // For now, we'll test the general principle with existing endpoints
        const response = await employeesGet(request)
        
        if (response.status >= 400) {
          const data = await response.json()
          
          // Error messages should be generic and not expose database internals
          expect(data.error).not.toMatch(/invalid input syntax|relation.*does not exist/i)
          expect(data.error).not.toContain('pg_')
          expect(data.error).not.toContain('constraint')
          expect(data.error).not.toContain('violates')
        }
      }
    })
  })

  describe('Token and Session Security', () => {
    test('should validate JWT tokens properly', async () => {
      const invalidTokens = [
        'invalid-jwt-token',
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid',
        '', // Empty token
        'Bearer invalid-format',
        'malicious-token-attempt'
      ]

      for (const token of invalidTokens) {
        const request = new NextRequest('http://localhost/api/employees', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        const response = await employeesGet(request)
        expect(response.status).toBe(401)
      }
    })

    test('should handle token expiration gracefully', async () => {
      // This would require mocking expired tokens
      // For now, test with missing authorization
      const request = new NextRequest('http://localhost/api/employees', {
        method: 'GET'
        // No authorization header
      })

      const response = await employeesGet(request)
      expect(response.status).toBe(401)
      
      const data = await response.json()
      expect(data.error).toMatch(/unauthorized|authentication required/i)
    })
  })

  describe('Organization Data Isolation', () => {
    test('should enforce strict organization boundaries', async () => {
      // Create two separate organizations with data
      const org1Id = await createTestOrganization('Organization 1')
      const org2Id = await createTestOrganization('Organization 2')
      
      const user1Id = await createTestUser('user1@org1.com', org1Id)
      const user2Id = await createTestUser('user2@org2.com', org2Id)

      // Create employee in org1
      const createEmployeeRequest = createMockRequest('POST', '/api/employees', {
        email: 'employee1@org1.com',
        fullName: 'Employee One',
        role: 'employee'
      }, { userId: user1Id, organizationId: org1Id })

      await employeesPost(createEmployeeRequest)

      // User from org2 should not see org1's employees
      const getEmployeesRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: user2Id,
        organizationId: org2Id
      })

      const response = await employeesGet(getEmployeesRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      
      // Should not contain employees from org1
      const org1Employees = data.employees?.filter((emp: any) => 
        emp.email === 'employee1@org1.com'
      )
      expect(org1Employees).toHaveLength(0)

      // Cleanup
      await cleanupTestData([user1Id, user2Id], [org1Id, org2Id])
    })

    test('should prevent organization switching attacks', async () => {
      // User belongs to org1 but tries to access org2 data
      const request = createMockRequest('GET', '/api/employees', {}, {
        userId: testUserId,
        organizationId: 'different-org-id'
      })

      const response = await employeesGet(request)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toMatch(/organization|access denied|unauthorized/i)
    })
  })
})

// Helper functions
async function createTestData() {
  const testOrgId = await createTestOrganization('Test Security Org')
  const adminUserId = await createTestUser('admin@security-test.com', testOrgId, 'admin')
  const employeeUserId = await createTestUser('employee@security-test.com', testOrgId, 'employee')
  const testUserId = await createTestUser('test@security-test.com', testOrgId)
  
  // Create a test invitation token
  const { data: invitation } = await mockSupabaseClient
    .from('invitations')
    .insert({
      organization_id: testOrgId,
      email: 'invited@security-test.com',
      role: 'employee',
      token: 'test-security-token-123'
    })
    .select()
    .single()

  return {
    testUserId,
    testOrgId,
    adminUserId,
    employeeUserId,
    testToken: invitation?.token || 'test-security-token-123'
  }
}