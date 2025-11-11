/** @jest-environment node */

/**
 * @fileoverview Tests for cancel invitation API endpoint
 *
 * Tests cover:
 * - Authentication and authorization
 * - Soft-delete logic
 * - Invitation ownership validation
 * - Status updates
 * - Error handling
 */

import { NextRequest } from 'next/server'
import { DELETE } from '@/app/api/invitations/[invitationId]/route'
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

describe('DELETE /api/invitations/[invitationId]', () => {
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

      const request = new NextRequest('http://localhost:3000/api/invitations/inv-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { invitationId: 'inv-123' } })
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

    it('should return 404 if invitation does not exist', async () => {
      mockSupabaseAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/invitations/inv-999', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { invitationId: 'inv-999' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toMatch(/invitation not found/i)
    })

    it('should return 403 if user is not an admin of the organization', async () => {
      mockSupabaseAdminClient.from.mockImplementation((table: string) => {
        if (table === 'invitations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ id: 'inv-123', organization_id: 'org-123', status: 'pending' }],
                error: null
              })
            })
          }
        }
        return { select: jest.fn() }
      })

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

      const request = new NextRequest('http://localhost:3000/api/invitations/inv-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { invitationId: 'inv-123' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toMatch(/admin access required/i)
    })

    it('should allow admin to cancel invitation', async () => {
      mockSupabaseAdminClient.from.mockImplementation((table: string) => {
        if (table === 'invitations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ id: 'inv-123', organization_id: 'org-123', status: 'pending' }],
                error: null
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ id: 'inv-123', status: 'cancelled' }],
                error: null
              })
            })
          }
        }
        return { select: jest.fn() }
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

      const request = new NextRequest('http://localhost:3000/api/invitations/inv-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { invitationId: 'inv-123' } })

      expect(response.status).toBe(200)
    })
  })

  describe('Soft Delete Logic', () => {
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

    it('should update invitation status to cancelled', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 'inv-123', status: 'cancelled' }],
          error: null
        })
      })

      mockSupabaseAdminClient.from.mockImplementation((table: string) => {
        if (table === 'invitations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ id: 'inv-123', organization_id: 'org-123', status: 'pending' }],
                error: null
              })
            }),
            update: mockUpdate
          }
        }
        return { select: jest.fn() }
      })

      const request = new NextRequest('http://localhost:3000/api/invitations/inv-123', {
        method: 'DELETE'
      })

      await DELETE(request, { params: { invitationId: 'inv-123' } })

      expect(mockUpdate).toHaveBeenCalledWith({ status: 'cancelled' })
    })

    it('should not hard delete invitation record', async () => {
      const mockDelete = jest.fn()
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 'inv-123', status: 'cancelled' }],
          error: null
        })
      })

      mockSupabaseAdminClient.from.mockImplementation((table: string) => {
        if (table === 'invitations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ id: 'inv-123', organization_id: 'org-123', status: 'pending' }],
                error: null
              })
            }),
            update: mockUpdate,
            delete: mockDelete
          }
        }
        return { select: jest.fn() }
      })

      const request = new NextRequest('http://localhost:3000/api/invitations/inv-123', {
        method: 'DELETE'
      })

      await DELETE(request, { params: { invitationId: 'inv-123' } })

      expect(mockDelete).not.toHaveBeenCalled()
      expect(mockUpdate).toHaveBeenCalled()
    })

    it('should return 400 if invitation is already cancelled', async () => {
      mockSupabaseAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ id: 'inv-123', organization_id: 'org-123', status: 'cancelled' }],
            error: null
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/invitations/inv-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { invitationId: 'inv-123' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toMatch(/already cancelled/i)
    })

    it('should return 400 if invitation is already accepted', async () => {
      mockSupabaseAdminClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ id: 'inv-123', organization_id: 'org-123', status: 'accepted' }],
            error: null
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/invitations/inv-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { invitationId: 'inv-123' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toMatch(/cannot cancel/i)
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

    it('should return success message and updated invitation', async () => {
      mockSupabaseAdminClient.from.mockImplementation((table: string) => {
        if (table === 'invitations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ id: 'inv-123', organization_id: 'org-123', email: 'user@example.com', status: 'pending' }],
                error: null
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ id: 'inv-123', status: 'cancelled' }],
                error: null
              })
            })
          }
        }
        return { select: jest.fn() }
      })

      const request = new NextRequest('http://localhost:3000/api/invitations/inv-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { invitationId: 'inv-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toMatch(/cancelled successfully/i)
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

    it('should return 500 if update fails', async () => {
      mockSupabaseAdminClient.from.mockImplementation((table: string) => {
        if (table === 'invitations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ id: 'inv-123', organization_id: 'org-123', status: 'pending' }],
                error: null
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
              })
            })
          }
        }
        return { select: jest.fn() }
      })

      const request = new NextRequest('http://localhost:3000/api/invitations/inv-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { invitationId: 'inv-123' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toMatch(/failed to cancel/i)
    })
  })
})
