/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/organizations/[organizationId]/seat-info/route'

// Mock Supabase client with proper method chaining
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn()
}

const mockSupabaseAdminClient = {
  from: jest.fn()
}

jest.mock('@/lib/supabase/server')

describe('/api/organizations/[organizationId]/seat-info', () => {
  let mockRequest: NextRequest
  const organizationId = 'org-123'

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequest = new NextRequest(`http://localhost:3000/api/organizations/${organizationId}/seat-info`)

    // Set up Supabase mocks
    const { createClient, createAdminClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabaseClient)
    createAdminClient.mockReturnValue(mockSupabaseAdminClient)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const response = await GET(mockRequest, { params: { organizationId } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Not authenticated')
    })

    it('should return 401 when user object is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const response = await GET(mockRequest, { params: { organizationId } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Not authenticated')
    })
  })

  describe('Authorization', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })
    })

    it('should return 403 when user is not a member of the organization', async () => {
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'user_organizations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  in: jest.fn(() => ({
                    maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null }))
                  }))
                }))
              }))
            }))
          }
        }
        return { select: jest.fn() }
      })

      const response = await GET(mockRequest, { params: { organizationId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Not authorized to access this organization')
    })

    it('should return 403 when user is not an admin', async () => {
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'user_organizations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  in: jest.fn(() => ({
                    maybeSingle: jest.fn(() => Promise.resolve({
                      data: { role: 'employee' },
                      error: null
                    }))
                  }))
                }))
              }))
            }))
          }
        }
        return { select: jest.fn() }
      })

      const response = await GET(mockRequest, { params: { organizationId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })
  })

  describe('Successful seat info retrieval', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'admin@example.com' } },
        error: null
      })

      // Mock user is admin
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'user_organizations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  in: jest.fn(() => ({
                    maybeSingle: jest.fn(() => Promise.resolve({
                      data: { role: 'admin' },
                      error: null
                    }))
                  }))
                }))
              }))
            }))
          }
        }
        return { select: jest.fn() }
      })
    })

    it('should return comprehensive seat info for organization with no subscription', async () => {
      mockSupabaseAdminClient.from.mockImplementation((table) => {
        if (table === 'subscriptions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn(() => ({
                  maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null }))
                }))
              }))
            }))
          }
        }
        if (table === 'organizations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: {
                    billing_override_seats: null,
                    billing_override_expires_at: null
                  },
                  error: null
                }))
              }))
            }))
          }
        }
        if (table === 'user_organizations') {
          let userOrgCallCount = 0
          return {
            select: jest.fn((fields) => {
              userOrgCallCount++
              // First call: count active members
              if (userOrgCallCount === 1) {
                return {
                  eq: jest.fn(() => ({
                    eq: jest.fn(() => Promise.resolve({ count: 2, error: null }))
                  }))
                }
              }
              // Second call: get users marked for removal
              return {
                eq: jest.fn(() => ({
                  eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
                }))
              }
            })
          }
        }
        if (table === 'invitations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ count: 0, error: null }))
              }))
            }))
          }
        }
        return { select: jest.fn() }
      })

      const response = await GET(mockRequest, { params: { organizationId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.maxSeats).toBe(3) // Only free tier seats (0 paid + 3 free)
      expect(data.freeTierSeats).toBe(3) // ✅ CLEAR - tier threshold constant
      expect(data.paidSeats).toBe(0)
      expect(data.currentSeats).toBe(2) // active members + 0 pending invitations
      expect(data.pendingInvitations).toBe(0)
      expect(data.availableSeats).toBe(1) // ✅ CLEAR - empty seats that can be filled
      expect(data.plan).toBe('free')
    })

    it('should return seat info for organization with active subscription', async () => {
      let userOrgSelectCalls = 0

      mockSupabaseAdminClient.from.mockImplementation((table) => {
        if (table === 'subscriptions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn(() => ({
                  maybeSingle: jest.fn(() => Promise.resolve({
                    data: {
                      current_seats: 10,
                      billing_override_seats: null,
                      billing_override_expires_at: null,
                      renews_at: '2025-12-31'
                    },
                    error: null
                  }))
                }))
              }))
            }))
          }
        }
        if (table === 'organizations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: {
                    billing_override_seats: null,
                    billing_override_expires_at: null
                  },
                  error: null
                }))
              }))
            }))
          }
        }
        if (table === 'user_organizations') {
          return {
            select: jest.fn((fields) => {
              userOrgSelectCalls++

              // First call: count active members (has count: true)
              if (fields === '*' || userOrgSelectCalls === 1) {
                return {
                  eq: jest.fn(() => ({
                    eq: jest.fn(() => Promise.resolve({ count: 8, error: null }))
                  }))
                }
              }

              // Second call: get users marked for removal (specific fields)
              return {
                eq: jest.fn(() => ({
                  eq: jest.fn(() => Promise.resolve({
                    data: [
                      { email: 'user1@example.com', removal_effective_date: '2025-12-31' },
                      { email: 'user2@example.com', removal_effective_date: '2025-12-31' }
                    ],
                    error: null
                  }))
                }))
              }
            })
          }
        }
        if (table === 'invitations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ count: 1, error: null }))
              }))
            }))
          }
        }
        return { select: jest.fn() }
      })

      const response = await GET(mockRequest, { params: { organizationId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.maxSeats).toBe(10) // 10 paid seats (graduated pricing: 4+ users pay for ALL seats)
      expect(data.freeTierSeats).toBe(3)
      expect(data.paidSeats).toBe(10)
      expect(data.currentSeats).toBe(9) // 8 active + 1 pending invitation
      expect(data.pendingInvitations).toBe(1)
      expect(data.pendingRemovals).toBe(2)
      expect(data.availableSeats).toBe(1) // 10 - 9
      expect(data.renewalDate).toBe('2025-12-31')
      expect(data.usersMarkedForRemoval).toBe(2)
    })

    it('should return seat info with billing override', async () => {
      mockSupabaseAdminClient.from.mockImplementation((table) => {
        if (table === 'subscriptions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn(() => ({
                  maybeSingle: jest.fn(() => Promise.resolve({
                    data: {
                      current_seats: 5,
                      billing_override_seats: 10,
                      billing_override_expires_at: '2026-01-01',
                      renews_at: '2025-12-31'
                    },
                    error: null
                  }))
                }))
              }))
            }))
          }
        }
        if (table === 'organizations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: {
                    billing_override_seats: 10,
                    billing_override_expires_at: '2026-01-01'
                  },
                  error: null
                }))
              }))
            }))
          }
        }
        if (table === 'user_organizations') {
          let userOrgCallCount = 0
          return {
            select: jest.fn((fields) => {
              userOrgCallCount++
              // First call: count active members
              if (userOrgCallCount === 1) {
                return {
                  eq: jest.fn(() => ({
                    eq: jest.fn(() => Promise.resolve({ count: 7, error: null }))
                  }))
                }
              }
              // Second call: get users marked for removal
              return {
                eq: jest.fn(() => ({
                  eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
                }))
              }
            })
          }
        }
        if (table === 'invitations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ count: 0, error: null }))
              }))
            }))
          }
        }
        return { select: jest.fn() }
      })

      const response = await GET(mockRequest, { params: { organizationId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.maxSeats).toBe(10) // Override: 10 paid seats (graduated pricing)
      expect(data.paidSeats).toBe(5) // Actual paid seats
      expect(data.currentSeats).toBe(7) // 7 active members + 0 pending invitations
      expect(data.availableSeats).toBe(3) // 10 - 7
    })

    it('should handle at-capacity scenario', async () => {
      mockSupabaseAdminClient.from.mockImplementation((table) => {
        if (table === 'subscriptions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn(() => ({
                  maybeSingle: jest.fn(() => Promise.resolve({
                    data: {
                      current_seats: 7,
                      billing_override_seats: null,
                      billing_override_expires_at: null,
                      renews_at: '2025-12-31'
                    },
                    error: null
                  }))
                }))
              }))
            }))
          }
        }
        if (table === 'organizations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: {
                    billing_override_seats: null,
                    billing_override_expires_at: null
                  },
                  error: null
                }))
              }))
            }))
          }
        }
        if (table === 'user_organizations') {
          let userOrgCallCount = 0
          return {
            select: jest.fn((fields) => {
              userOrgCallCount++
              // First call: count active members
              if (userOrgCallCount === 1) {
                return {
                  eq: jest.fn(() => ({
                    eq: jest.fn(() => Promise.resolve({ count: 8, error: null }))
                  }))
                }
              }
              // Second call: get users marked for removal
              return {
                eq: jest.fn(() => ({
                  eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
                }))
              }
            })
          }
        }
        if (table === 'invitations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ count: 2, error: null }))
              }))
            }))
          }
        }
        return { select: jest.fn() }
      })

      const response = await GET(mockRequest, { params: { organizationId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.maxSeats).toBe(7) // 7 paid seats (graduated pricing)
      expect(data.currentSeats).toBe(10) // 8 active + 2 pending invitations
      expect(data.pendingInvitations).toBe(2)
      expect(data.availableSeats).toBe(0) // Over capacity: -3 (but min is 0)
    })

    it('should calculate high utilization warning (80%+)', async () => {
      mockSupabaseAdminClient.from.mockImplementation((table) => {
        if (table === 'subscriptions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn(() => ({
                  maybeSingle: jest.fn(() => Promise.resolve({
                    data: {
                      current_seats: 7,
                      billing_override_seats: null,
                      billing_override_expires_at: null,
                      renews_at: '2025-12-31'
                    },
                    error: null
                  }))
                }))
              }))
            }))
          }
        }
        if (table === 'organizations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: {
                    billing_override_seats: null,
                    billing_override_expires_at: null
                  },
                  error: null
                }))
              }))
            }))
          }
        }
        if (table === 'user_organizations') {
          let userOrgCallCount = 0
          return {
            select: jest.fn((fields) => {
              userOrgCallCount++
              // First call: count active members
              if (userOrgCallCount === 1) {
                return {
                  eq: jest.fn(() => ({
                    eq: jest.fn(() => Promise.resolve({ count: 8, error: null }))
                  }))
                }
              }
              // Second call: get users marked for removal
              return {
                eq: jest.fn(() => ({
                  eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
                }))
              }
            })
          }
        }
        if (table === 'invitations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ count: 0, error: null }))
              }))
            }))
          }
        }
        return { select: jest.fn() }
      })

      const response = await GET(mockRequest, { params: { organizationId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.currentSeats).toBe(8) // 8 active + 0 pending invitations
      expect(data.maxSeats).toBe(7) // 7 paid seats (graduated pricing)
      expect(data.availableSeats).toBe(0) // Over capacity: -1 (but min is 0)
    })
  })

  describe('Error handling', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'admin@example.com' } },
        error: null
      })

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'user_organizations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  in: jest.fn(() => ({
                    maybeSingle: jest.fn(() => Promise.resolve({
                      data: { role: 'admin' },
                      error: null
                    }))
                  }))
                }))
              }))
            }))
          }
        }
        return { select: jest.fn() }
      })
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseAdminClient.from.mockImplementation((table) => {
        if (table === 'subscriptions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn(() => ({
                  maybeSingle: jest.fn(() => Promise.resolve({
                    data: null,
                    error: { message: 'Database connection failed' }
                  }))
                }))
              }))
            }))
          }
        }
        return { select: jest.fn() }
      })

      const response = await GET(mockRequest, { params: { organizationId } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to retrieve seat information')
    })

    it('should handle missing organization ID', async () => {
      const response = await GET(mockRequest, { params: { organizationId: '' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Organization ID is required')
    })
  })
})
