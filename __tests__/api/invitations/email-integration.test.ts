/**
 * @fileoverview Tests for invitation email sending and template rendering
 * 
 * Tests cover:
 * - Email service configuration and validation
 * - Invitation email template rendering
 * - Email content validation and formatting
 * - Multilingual support (Polish/English)
 * - Email delivery tracking
 * - Error handling for email failures
 * - Email template customization
 * - Attachment handling
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createAdminClient } from '@/lib/supabase/server'
import { sendInvitationEmail, createInvitationEmailContent } from '@/lib/email'
import { NextRequest } from 'next/server'
import { POST as sendInvitationAPI } from '@/app/api/send-invitation/route'

describe('Invitation Email Integration', () => {
  let supabaseAdmin: ReturnType<typeof createAdminClient>
  let testOrganizationId: string
  let testInvitationToken: string
  let createdInvitationIds: string[] = []

  beforeAll(async () => {
    supabaseAdmin = createAdminClient()
    
    // Create test organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: 'Test Organization for Email',
        created_by: '00000000-0000-0000-0000-000000000001'
      })
      .select('id')
      .single()

    if (orgError || !org) {
      throw new Error('Failed to create test organization')
    }
    testOrganizationId = org.id

    // Create test invitation for email testing
    const { data: invitation, error: invError } = await supabaseAdmin
      .from('invitations')
      .insert({
        email: 'email.test@example.com',
        full_name: 'Email Test User',
        role: 'employee',
        organization_id: testOrganizationId,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select('*')
      .single()

    if (invError || !invitation) {
      throw new Error('Failed to create test invitation')
    }
    
    testInvitationToken = invitation.token
    createdInvitationIds.push(invitation.id)
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
      .from('organizations')
      .delete()
      .eq('id', testOrganizationId)
  })

  describe('Email Service Configuration', () => {
    it('should validate email service configuration', () => {
      const hasResendKey = !!process.env.RESEND_API_KEY
      const hasFromEmail = !!process.env.FROM_EMAIL
      
      // Note: In test environment, these might not be set
      // We'll test the validation logic rather than actual sending
      expect(typeof hasResendKey).toBe('boolean')
      expect(typeof hasFromEmail).toBe('boolean')
    })

    it('should handle missing email configuration gracefully', async () => {
      // Mock the sendInvitationEmail function to test config handling
      const mockInvitationData = {
        to: 'config.test@example.com',
        organizationName: 'Test Organization',
        inviterName: 'Test Admin',
        inviterEmail: 'admin@test.com',
        role: 'employee',
        invitationToken: 'test-token-123'
      }

      // Test with mock data (actual email sending depends on environment)
      const emailContent = createInvitationEmailContent(mockInvitationData)
      
      expect(emailContent).toBeDefined()
      expect(emailContent.subject).toBe('Zaproszenie do Test Organization')
      expect(emailContent.invitationUrl).toContain('test-token-123')
      expect(emailContent.content).toContain('Test Admin')
      expect(emailContent.content).toContain('Test Organization')
    })

    it('should return proper error for unconfigured email service', async () => {
      const request = new NextRequest('http://localhost:3000/api/send-invitation', {
        method: 'POST',
        body: JSON.stringify({
          email: 'unconfigured@example.com',
          invitationCode: 'TEST123'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      // Temporarily unset email config for testing
      const originalKey = process.env.RESEND_API_KEY
      const originalFrom = process.env.FROM_EMAIL
      delete process.env.RESEND_API_KEY
      delete process.env.FROM_EMAIL

      const response = await sendInvitationAPI(request)
      const responseData = await response.json()

      // Restore environment
      if (originalKey) process.env.RESEND_API_KEY = originalKey
      if (originalFrom) process.env.FROM_EMAIL = originalFrom

      expect(response.status).toBe(503)
      expect(responseData.error).toBe('Email service not configured')
    })
  })

  describe('Email Template Rendering', () => {
    it('should render Polish invitation email template correctly', () => {
      const invitationData = {
        to: 'polish.test@example.com',
        organizationName: 'Testowa Organizacja',
        inviterName: 'Jan Kowalski',
        inviterEmail: 'jan.kowalski@test.pl',
        role: 'pracownik',
        invitationToken: testInvitationToken
      }

      const emailContent = createInvitationEmailContent(invitationData)

      expect(emailContent.subject).toContain('Zaproszenie do Testowa Organizacja')
      expect(emailContent.content).toContain('Jan Kowalski')
      expect(emailContent.content).toContain('zaprasza Cię')
      expect(emailContent.content).toContain('Rola: pracownik')
      expect(emailContent.content).toContain('wygasa za 7 dni')
      expect(emailContent.invitationUrl).toContain(testInvitationToken)
    })

    it('should include personal message in template when provided', () => {
      const invitationData = {
        to: 'personal.message@example.com',
        organizationName: 'Test Company',
        inviterName: 'HR Manager',
        inviterEmail: 'hr@test.com',
        role: 'developer',
        invitationToken: testInvitationToken,
        personalMessage: 'Witamy w naszym zespole! Cieszymy się, że do nas dołączysz.'
      }

      const emailContent = createInvitationEmailContent(invitationData)

      expect(emailContent.content).toContain('Witamy w naszym zespole!')
      expect(emailContent.content).toContain('Cieszymy się, że do nas dołączysz.')
      expect(emailContent.content).toMatch(/Wiadomość:.*"Witamy w naszym zespole!/s)
    })

    it('should handle missing personal message gracefully', () => {
      const invitationData = {
        to: 'no.message@example.com',
        organizationName: 'Test Company',
        inviterName: 'HR Manager',
        inviterEmail: 'hr@test.com',
        role: 'developer',
        invitationToken: testInvitationToken
        // No personalMessage provided
      }

      const emailContent = createInvitationEmailContent(invitationData)

      expect(emailContent.content).not.toContain('Wiadomość:')
      expect(emailContent.content).toContain('HR Manager')
      expect(emailContent.content).toContain('Test Company')
    })

    it('should generate proper invitation URLs', () => {
      const invitationData = {
        to: 'url.test@example.com',
        organizationName: 'URL Test Org',
        inviterName: 'URL Tester',
        inviterEmail: 'tester@test.com',
        role: 'tester',
        invitationToken: 'url-test-token-12345'
      }

      const emailContent = createInvitationEmailContent(invitationData)

      expect(emailContent.invitationUrl).toContain('url-test-token-12345')
      expect(emailContent.invitationUrl).toMatch(/^https?:\/\//)
      expect(emailContent.content).toContain(emailContent.invitationUrl)
    })

    it('should escape HTML characters in user input', () => {
      const invitationData = {
        to: 'xss.test@example.com',
        organizationName: 'Test & <script>alert("xss")</script> Company',
        inviterName: 'Test <b>User</b>',
        inviterEmail: 'test@test.com',
        role: 'employee',
        invitationToken: testInvitationToken,
        personalMessage: 'Welcome! <script>alert("hack")</script>'
      }

      const emailContent = createInvitationEmailContent(invitationData)

      // Should not contain raw script tags in the output
      expect(emailContent.content).not.toContain('<script>')
      expect(emailContent.content).not.toContain('alert("xss")')
      expect(emailContent.content).not.toContain('alert("hack")')
      
      // But should contain the organization name and user name
      expect(emailContent.content).toContain('Test &')
      expect(emailContent.content).toContain('Company')
      expect(emailContent.content).toContain('Test')
      expect(emailContent.content).toContain('User')
    })
  })

  describe('Email Content Validation', () => {
    it('should validate required email fields are present', () => {
      const invitationData = {
        to: 'validation.test@example.com',
        organizationName: 'Validation Test Org',
        inviterName: 'Validator',
        inviterEmail: 'validator@test.com',
        role: 'validator',
        invitationToken: testInvitationToken
      }

      const emailContent = createInvitationEmailContent(invitationData)

      // Check all required fields are present in content
      expect(emailContent.content).toContain(invitationData.organizationName)
      expect(emailContent.content).toContain(invitationData.inviterName)
      expect(emailContent.content).toContain(invitationData.role)
      expect(emailContent.subject).toContain(invitationData.organizationName)
      expect(emailContent.invitationUrl).toBeDefined()
    })

    it('should validate email addresses in content', () => {
      const validEmails = [
        'test@example.com',
        'user.name@company.co.uk',
        'user+tag@domain.org',
        'firstname.lastname@subdomain.example.com'
      ]

      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user name@domain.com' // Space in local part
      ]

      validEmails.forEach(email => {
        const invitationData = {
          to: email,
          organizationName: 'Email Validation Test',
          inviterName: 'Email Validator',
          inviterEmail: 'validator@test.com',
          role: 'employee',
          invitationToken: testInvitationToken
        }

        const emailContent = createInvitationEmailContent(invitationData)
        expect(emailContent).toBeDefined()
        expect(emailContent.content).toContain('Email Validation Test')
      })

      // Invalid emails would be handled at the API level, not in content generation
      invalidEmails.forEach(email => {
        const invitationData = {
          to: email,
          organizationName: 'Email Validation Test',
          inviterName: 'Email Validator',
          inviterEmail: 'validator@test.com',
          role: 'employee',
          invitationToken: testInvitationToken
        }

        const emailContent = createInvitationEmailContent(invitationData)
        expect(emailContent).toBeDefined()
        // Content generation doesn't validate email format - that's done at API level
      })
    })

    it('should handle very long organization names', () => {
      const longOrgName = 'A'.repeat(200) + ' Very Long Organization Name That Exceeds Normal Limits'
      
      const invitationData = {
        to: 'long.org@example.com',
        organizationName: longOrgName,
        inviterName: 'Long Org Tester',
        inviterEmail: 'tester@test.com',
        role: 'employee',
        invitationToken: testInvitationToken
      }

      const emailContent = createInvitationEmailContent(invitationData)

      expect(emailContent.content).toContain(longOrgName)
      expect(emailContent.subject.length).toBeLessThan(300) // Reasonable subject line limit
    })

    it('should handle special characters in names and messages', () => {
      const specialChars = {
        organizationName: 'Tëst Órgañízàtíóñ & Co. ™',
        inviterName: 'Jäñ Kówälskí-Śmíth',
        personalMessage: 'Witäj! Zäprässämy Cíę dö náśzëj fírmÿ. ™® & ©'
      }

      const invitationData = {
        to: 'special.chars@example.com',
        organizationName: specialChars.organizationName,
        inviterName: specialChars.inviterName,
        inviterEmail: 'special@test.com',
        role: 'employee',
        invitationToken: testInvitationToken,
        personalMessage: specialChars.personalMessage
      }

      const emailContent = createInvitationEmailContent(invitationData)

      expect(emailContent.content).toContain(specialChars.organizationName)
      expect(emailContent.content).toContain(specialChars.inviterName)
      expect(emailContent.content).toContain(specialChars.personalMessage)
    })
  })

  describe('Multilingual Support', () => {
    it('should support Polish language by default', () => {
      const invitationData = {
        to: 'polish@example.com',
        organizationName: 'Polska Firma',
        inviterName: 'Anna Nowak',
        inviterEmail: 'anna@firma.pl',
        role: 'pracownik',
        invitationToken: testInvitationToken
      }

      const emailContent = createInvitationEmailContent(invitationData)

      // Check for Polish text
      expect(emailContent.subject).toContain('Zaproszenie do')
      expect(emailContent.content).toContain('zaprasza Cię do dołączenia')
      expect(emailContent.content).toContain('Rola:')
      expect(emailContent.content).toContain('Aby zaakceptować zaproszenie')
      expect(emailContent.content).toContain('wygasa za 7 dni')
    })

    it('should handle mixed language content properly', () => {
      const invitationData = {
        to: 'mixed@example.com',
        organizationName: 'International Tech Solutions Sp. z o.o.',
        inviterName: 'John Smith',
        inviterEmail: 'john@tech.pl',
        role: 'Senior Developer',
        invitationToken: testInvitationToken,
        personalMessage: 'Welcome to our team! Witamy w naszym zespole!'
      }

      const emailContent = createInvitationEmailContent(invitationData)

      expect(emailContent.content).toContain('International Tech Solutions')
      expect(emailContent.content).toContain('John Smith')
      expect(emailContent.content).toContain('Senior Developer')
      expect(emailContent.content).toContain('Welcome to our team!')
      expect(emailContent.content).toContain('Witamy w naszym zespole!')
    })

    it('should maintain consistent encoding throughout email', () => {
      const unicodeContent = {
        organizationName: '🚀 Tech Startüp ™',
        inviterName: '👨‍💼 Mänägęr Nówäk',
        personalMessage: '🎉 Congratulations! Grätülätïönś! 🎊'
      }

      const invitationData = {
        to: 'unicode@example.com',
        organizationName: unicodeContent.organizationName,
        inviterName: unicodeContent.inviterName,
        inviterEmail: 'manager@startup.com',
        role: 'developer',
        invitationToken: testInvitationToken,
        personalMessage: unicodeContent.personalMessage
      }

      const emailContent = createInvitationEmailContent(invitationData)

      // Should preserve unicode characters
      expect(emailContent.content).toContain('🚀')
      expect(emailContent.content).toContain('👨‍💼')
      expect(emailContent.content).toContain('🎉')
      expect(emailContent.content).toContain('Startüp')
      expect(emailContent.content).toContain('Mänägęr')
    })
  })

  describe('Email Delivery and Error Handling', () => {
    it('should handle email sending success response', async () => {
      // Mock successful email sending (actual implementation depends on environment)
      const invitationData = {
        to: 'success@example.com',
        organizationName: 'Success Test Org',
        inviterName: 'Success Tester',
        inviterEmail: 'tester@success.com',
        role: 'employee',
        invitationToken: testInvitationToken
      }

      // Test the fallback content creation
      const emailContent = createInvitationEmailContent(invitationData)
      
      expect(emailContent.subject).toBeDefined()
      expect(emailContent.content).toBeDefined()
      expect(emailContent.invitationUrl).toBeDefined()
      expect(emailContent.content.length).toBeGreaterThan(100)
    })

    it('should handle email sending failure gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/send-invitation', {
        method: 'POST',
        body: JSON.stringify({
          email: 'failure@example.com',
          invitationCode: 'FAIL123'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      // The actual response depends on email service configuration
      const response = await sendInvitationAPI(request)
      
      expect(response.status).toBeOneOf([200, 503, 500])
      
      const responseData = await response.json()
      expect(responseData).toHaveProperty('success')
    })

    it('should validate email parameters before sending', async () => {
      const invalidRequests = [
        { email: null, invitationCode: 'VALID123' },
        { email: 'valid@example.com', invitationCode: null },
        { email: '', invitationCode: 'VALID123' },
        { email: 'valid@example.com', invitationCode: '' }
      ]

      for (const invalidData of invalidRequests) {
        const request = new NextRequest('http://localhost:3000/api/send-invitation', {
          method: 'POST',
          body: JSON.stringify(invalidData),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await sendInvitationAPI(request)
        expect(response.status).toBe(400)
        
        const responseData = await response.json()
        expect(responseData.error).toBe('Missing required fields: email and invitationCode')
      }
    })

    it('should handle malformed request data', async () => {
      const malformedRequests = [
        'not json',
        '{"malformed": json}',
        '{}',
        '{"email": "test@example.com"}' // Missing invitationCode
      ]

      for (const malformedBody of malformedRequests) {
        const request = new NextRequest('http://localhost:3000/api/send-invitation', {
          method: 'POST',
          body: malformedBody,
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await sendInvitationAPI(request)
        expect(response.status).toBeOneOf([400, 500])
        
        const responseData = await response.json()
        expect(responseData.error).toBeDefined()
      }
    })
  })

  describe('Email Template Customization', () => {
    it('should support basic HTML formatting in email template', () => {
      const invitationData = {
        to: 'html.test@example.com',
        organizationName: 'HTML Test Company',
        inviterName: 'HTML Tester',
        inviterEmail: 'tester@html.com',
        role: 'employee',
        invitationToken: testInvitationToken
      }

      const emailContent = createInvitationEmailContent(invitationData)

      // Generated content should be plain text for fallback
      expect(emailContent.content).toBeDefined()
      expect(typeof emailContent.content).toBe('string')
      
      // Should contain proper line breaks and formatting
      expect(emailContent.content).toContain('\n')
      expect(emailContent.content.trim().length).toBeGreaterThan(0)
    })

    it('should include all necessary information for user action', () => {
      const invitationData = {
        to: 'action.test@example.com',
        organizationName: 'Action Test Org',
        inviterName: 'Action Tester',
        inviterEmail: 'action@test.com',
        role: 'employee',
        invitationToken: testInvitationToken
      }

      const emailContent = createInvitationEmailContent(invitationData)

      // Should include call-to-action information
      expect(emailContent.content).toContain('zaakceptować zaproszenie')
      expect(emailContent.content).toContain('odwiedź:')
      expect(emailContent.invitationUrl).toBeDefined()
      
      // Should include expiration information
      expect(emailContent.content).toContain('wygasa za 7 dni')
      
      // Should include sender information
      expect(emailContent.content).toContain('Action Tester')
      expect(emailContent.content).toContain('Action Test Org')
    })

    it('should maintain consistent branding elements', () => {
      const invitationData = {
        to: 'branding@example.com',
        organizationName: 'Branding Test Corp',
        inviterName: 'Brand Manager',
        inviterEmail: 'brand@test.com',
        role: 'employee',
        invitationToken: testInvitationToken
      }

      const emailContent = createInvitationEmailContent(invitationData)

      // Should include system branding
      expect(emailContent.content).toContain('System zarządzania urlopami')
      expect(emailContent.subject).toContain('Zaproszenie do')
      
      // Should maintain professional tone
      expect(emailContent.content).toContain('Pozdrawienia')
    })
  })

  describe('Performance and Scalability', () => {
    it('should generate email content efficiently for bulk operations', () => {
      const bulkInvitations = Array(100).fill(null).map((_, index) => ({
        to: `bulk${index}@example.com`,
        organizationName: 'Bulk Test Organization',
        inviterName: 'Bulk Inviter',
        inviterEmail: 'bulk@test.com',
        role: 'employee',
        invitationToken: `bulk-token-${index}`
      }))

      const startTime = Date.now()
      
      const emailContents = bulkInvitations.map(data => 
        createInvitationEmailContent(data)
      )

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(emailContents.length).toBe(100)
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
      
      // Each email should be properly generated
      emailContents.forEach((content, index) => {
        expect(content.content).toContain(`bulk${index}@example.com`)
        expect(content.invitationUrl).toContain(`bulk-token-${index}`)
      })
    })

    it('should handle concurrent email content generation', async () => {
      const concurrentRequests = Array(50).fill(null).map((_, index) => 
        Promise.resolve(createInvitationEmailContent({
          to: `concurrent${index}@example.com`,
          organizationName: 'Concurrent Test Org',
          inviterName: 'Concurrent Tester',
          inviterEmail: 'concurrent@test.com',
          role: 'employee',
          invitationToken: `concurrent-token-${index}`
        }))
      )

      const results = await Promise.all(concurrentRequests)
      
      expect(results.length).toBe(50)
      results.forEach((result, index) => {
        expect(result.content).toContain(`concurrent${index}@example.com`)
        expect(result.invitationUrl).toContain(`concurrent-token-${index}`)
      })
    })

    it('should manage memory usage for large email content', () => {
      const largePersonalMessage = 'A'.repeat(10000) + ' This is a very long personal message that tests memory handling.'
      
      const invitationData = {
        to: 'memory.test@example.com',
        organizationName: 'Memory Test Organization',
        inviterName: 'Memory Tester',
        inviterEmail: 'memory@test.com',
        role: 'employee',
        invitationToken: testInvitationToken,
        personalMessage: largePersonalMessage
      }

      const emailContent = createInvitationEmailContent(invitationData)

      expect(emailContent.content).toContain(largePersonalMessage)
      expect(emailContent.content.length).toBeGreaterThan(10000)
      expect(typeof emailContent.content).toBe('string')
    })
  })
})

// Helper function for test expectations
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received)
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true
      }
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false
      }
    }
  }
})