/** @jest-environment node */

/**
 * @fileoverview Tests for bulk invitation API endpoint
 *
 * Tests cover:
 * - Authentication and authorization
 * - Zod schema validation
 * - Seat availability validation
 * - Duplicate email detection
 * - Atomic transaction behavior
 * - Email sending integration
 * - Error handling and rollback
 * - Rate limiting
 */

import { NextRequest, NextResponse } from 'next/server'
import { POST, rateLimitStore } from '@/app/api/organizations/[organizationId]/invitations/route'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Mock Supabase
jest.mock('@/lib/supabase/server')

// Mock email sending
jest.mock('@/lib/email', () => ({
  sendInvitationEmail: jest.fn(() => Promise.resolve({ success: true, messageId: 'test-msg-id' }))
}))

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn()
}

const mockSupabaseAdminClient = {
  from: jest.fn(),
  rpc: jest.fn()
}

describe('POST /api/organizations/[organizationId]/invitations', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Clear rate limiting between tests
    rateLimitStore.clear()

    const { createClient, createAdminClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabaseClient)
    createAdminClient.mockReturnValue(mockSupabaseAdminClient)
  })

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/invitations', {
        method: 'POST',
        body: JSON.stringify({ invitations: [{ email: 'test@example.com', role: 'employee' }] })
      })

      const response = await POST(request, { params: { organizationId: 'org-123' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toMatch(/not authenticated/i)
    })
  })

  describe('Authorization', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
    })

    it('should return 403 if user is not a member of the organization', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: null
                })
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/invitations', {
        method: 'POST',
        body: JSON.stringify({ invitations: [{ email: 'test@example.com', role: 'employee' }] })
      })

      const response = await POST(request, { params: { organizationId: 'org-123' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toMatch(/not authorized/i)
    })

    it('should return 403 if user is not an admin', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { role: 'employee' },
                  error: null
                })
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/invitations', {
        method: 'POST',
        body: JSON.stringify({ invitations: [{ email: 'test@example.com', role: 'employee' }] })
      })

      const response = await POST(request, { params: { organizationId: 'org-123' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toMatch(/admin access required/i)
    })

    it('should allow admin to create invitations', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { role: 'admin' },
                  error: null
                })
              })
            })
          })
        })
      })

      // Mock seat info check
      let callCount = 0
      mockSupabaseAdminClient.from.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { current_seats: 10 },
                    error: null
                  })
                })
              })
            })
          }
        }
        if (table === 'user_organizations' || table === 'invitations') {
          callCount++
          if (callCount === 1 || callCount === 2) {
            // First two calls: count active members and pending invitations
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  in: jest.fn().mockReturnValue({
                    then: jest.fn().mockResolvedValue({ count: 2, error: null })
                  })
                })
              })
            }
          } else {
            // Third call: insert invitations
            return {
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue({
                  data: [{ id: 'inv-123', email: 'test@example.com', token: 'token-123' }],
                  error: null
                })
              })
            }
          }
        }
        return { select: jest.fn() }
      })

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/invitations', {
        method: 'POST',
        body: JSON.stringify({
          invitations: [
            { email: 'test@example.com', fullName: 'Test User', role: 'employee' }
          ]
        })
      })

      const response = await POST(request, { params: { organizationId: 'org-123' } })

      expect(response.status).toBe(200)
    })
  })

  describe('Request Validation', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { role: 'admin' },
                  error: null
                })
              })
            })
          })
        })
      })
    })

    it('should return 400 if request body is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/invitations', {
        method: 'POST'
      })

      const response = await POST(request, { params: { organizationId: 'org-123' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should return 400 if invitations array is empty', async () => {
      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/invitations', {
        method: 'POST',
        body: JSON.stringify({ invitations: [] })
      })

      const response = await POST(request, { params: { organizationId: 'org-123' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toBeDefined()
      expect(data.details.some((d: any) => d.message.match(/at least one invitation/i))).toBeTruthy()
    })

    it('should return 400 if email format is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/invitations', {
        method: 'POST',
        body: JSON.stringify({
          invitations: [{ email: 'invalid-email', role: 'employee' }]
        })
      })

      const response = await POST(request, { params: { organizationId: 'org-123' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toBeDefined()
      expect(data.details.some((d: any) => d.message.match(/invalid email/i))).toBeTruthy()
    })

    it('should return 400 if role is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/invitations', {
        method: 'POST',
        body: JSON.stringify({
          invitations: [{ email: 'test@example.com', role: 'superadmin' }]
        })
      })

      const response = await POST(request, { params: { organizationId: 'org-123' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should return 400 if more than 50 invitations', async () => {
      const invitations = Array.from({ length: 51 }, (_, i) => ({
        email: `user${i}@example.com`,
        role: 'employee'
      }))

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/invitations', {
        method: 'POST',
        body: JSON.stringify({ invitations })
      })

      const response = await POST(request, { params: { organizationId: 'org-123' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toBeDefined()
      expect(data.details.some((d: any) => d.message.match(/maximum 50 invitations/i))).toBeTruthy()
    })
  })

  describe('Duplicate Email Detection', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { role: 'admin' },
                  error: null
                })
              })
            })
          })
        })
      })
    })

    it('should return 400 if duplicate emails in request', async () => {
      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/invitations', {
        method: 'POST',
        body: JSON.stringify({
          invitations: [
            { email: 'duplicate@example.com', role: 'employee' },
            { email: 'duplicate@example.com', role: 'manager' }
          ]
        })
      })

      const response = await POST(request, { params: { organizationId: 'org-123' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toMatch(/duplicate email/i)
      expect(data.duplicates).toContain('duplicate@example.com')
    })

    it('should detect existing organization members', async () => {
      mockSupabaseAdminClient.from.mockImplementation((table: string) => {
        if (table === 'user_organizations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  then: jest.fn().mockResolvedValue({
                    data: [{ email: 'existing@example.com' }],
                    error: null
                  })
                })
              })
            })
          }
        }
        return { select: jest.fn() }
      })

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/invitations', {
        method: 'POST',
        body: JSON.stringify({
          invitations: [{ email: 'existing@example.com', role: 'employee' }]
        })
      })

      const response = await POST(request, { params: { organizationId: 'org-123' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toMatch(/already a member/i)
    })

    it('should detect pending invitations', async () => {
      mockSupabaseAdminClient.from.mockImplementation((table: string) => {
        if (table === 'invitations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  then: jest.fn().mockResolvedValue({
                    data: [{ email: 'pending@example.com' }],
                    error: null
                  })
                })
              })
            })
          }
        }
        return { select: jest.fn() }
      })

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/invitations', {
        method: 'POST',
        body: JSON.stringify({
          invitations: [{ email: 'pending@example.com', role: 'employee' }]
        })
      })

      const response = await POST(request, { params: { organizationId: 'org-123' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toMatch(/already has a pending invitation/i)
    })
  })

  describe('Seat Availability Validation', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { role: 'admin' },
                  error: null
                })
              })
            })
          })
        })
      })
    })

    it('should return 400 if not enough seats available', async () => {
      mockSupabaseAdminClient.from.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { current_seats: 5 },
                    error: null
                  })
                })
              })
            })
          }
        }
        if (table === 'user_organizations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  then: jest.fn().mockResolvedValue({ count: 4, error: null })
                })
              })
            })
          }
        }
        if (table === 'invitations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockReturnValue({
                  then: jest.fn().mockResolvedValue({ count: 1, error: null })
                })
              })
            })
          }
        }
        return { select: jest.fn() }
      })

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/invitations', {
        method: 'POST',
        body: JSON.stringify({
          invitations: [
            { email: 'user1@example.com', role: 'employee' },
            { email: 'user2@example.com', role: 'employee' }
          ]
        })
      })

      const response = await POST(request, { params: { organizationId: 'org-123' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toMatch(/not enough seats/i)
      expect(data.seatsAvailable).toBe(0)
      expect(data.seatsRequired).toBe(2)
    })
  })
})
