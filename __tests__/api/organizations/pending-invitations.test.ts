/** @jest-environment node */

/**
 * @fileoverview Tests for pending invitations API endpoint
 *
 * Tests cover:
 * - Authentication and authorization
 * - Pagination support
 * - Filtering by status
 * - Data format validation
 * - Error handling
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/organizations/[organizationId]/pending-invitations/route'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Mock Supabase
jest.mock('@/lib/supabase/server')

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn()
}

const mockSupabaseAdminClient = {
  from: jest.fn()
}

describe('GET /api/organizations/[organizationId]/pending-invitations', () => {
  beforeEach(() => {
    jest.clearAllMocks()

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

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/pending-invitations')

      const response = await GET(request, { params: { organizationId: 'org-123' } })
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

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/pending-invitations')

      const response = await GET(request, { params: { organizationId: 'org-123' } })
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

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/pending-invitations')

      const response = await GET(request, { params: { organizationId: 'org-123' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toMatch(/admin access required/i)
    })

    it('should allow admin to view pending invitations', async () => {
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

      mockSupabaseAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                  count: 0
                })
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/pending-invitations')

      const response = await GET(request, { params: { organizationId: 'org-123' } })

      expect(response.status).toBe(200)
    })
  })

  describe('Pagination', () => {
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

    it('should use default pagination if not specified', async () => {
      const mockRange = jest.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0
      })

      mockSupabaseAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: mockRange
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/pending-invitations')

      await GET(request, { params: { organizationId: 'org-123' } })

      expect(mockRange).toHaveBeenCalledWith(0, 19) // Default: page 1, limit 20
    })

    it('should respect custom page and limit parameters', async () => {
      const mockRange = jest.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0
      })

      mockSupabaseAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: mockRange
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/pending-invitations?page=2&limit=10')

      await GET(request, { params: { organizationId: 'org-123' } })

      expect(mockRange).toHaveBeenCalledWith(10, 19) // Page 2, limit 10: (2-1)*10 to (2*10)-1
    })

    it('should enforce maximum limit of 50', async () => {
      const mockRange = jest.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0
      })

      mockSupabaseAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: mockRange
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/pending-invitations?limit=100')

      await GET(request, { params: { organizationId: 'org-123' } })

      expect(mockRange).toHaveBeenCalledWith(0, 49) // Capped at 50
    })
  })

  describe('Status Filtering', () => {
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

    it('should filter by pending status by default', async () => {
      const mockStatusEq = jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 0
          })
        })
      })

      mockSupabaseAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: mockStatusEq
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/pending-invitations')

      await GET(request, { params: { organizationId: 'org-123' } })

      expect(mockStatusEq).toHaveBeenCalledWith('status', 'pending')
    })

    it('should allow filtering by expired status', async () => {
      const mockStatusEq = jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 0
          })
        })
      })

      mockSupabaseAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: mockStatusEq
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/pending-invitations?status=expired')

      await GET(request, { params: { organizationId: 'org-123' } })

      expect(mockStatusEq).toHaveBeenCalledWith('status', 'expired')
    })
  })

  describe('Response Format', () => {
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

    it('should return invitations with pagination metadata', async () => {
      const mockInvitations = [
        {
          id: 'inv-1',
          email: 'user1@example.com',
          role: 'employee',
          status: 'pending',
          created_at: '2025-01-01T00:00:00Z',
          expires_at: '2025-01-08T00:00:00Z'
        },
        {
          id: 'inv-2',
          email: 'user2@example.com',
          role: 'manager',
          status: 'pending',
          created_at: '2025-01-02T00:00:00Z',
          expires_at: '2025-01-09T00:00:00Z'
        }
      ]

      mockSupabaseAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: mockInvitations,
                  error: null,
                  count: 15
                })
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/pending-invitations?page=1&limit=2')

      const response = await GET(request, { params: { organizationId: 'org-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.invitations).toHaveLength(2)
      expect(data.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 15,
        totalPages: 8
      })
    })

    it('should return empty array when no invitations found', async () => {
      mockSupabaseAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                  count: 0
                })
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/pending-invitations')

      const response = await GET(request, { params: { organizationId: 'org-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.invitations).toEqual([])
      expect(data.pagination.total).toBe(0)
    })
  })

  describe('Error Handling', () => {
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

    it('should return 500 if database query fails', async () => {
      mockSupabaseAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' }
                })
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/organizations/org-123/pending-invitations')

      const response = await GET(request, { params: { organizationId: 'org-123' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toMatch(/failed to fetch/i)
    })
  })
})
