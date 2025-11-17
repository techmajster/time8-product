import { NextRequest } from 'next/server'
import { GET } from '@/app/api/user/organization-status/route'

// Mock Supabase client with proper method chaining
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn()
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient
}))

describe('/api/user/organization-status', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequest = new NextRequest('http://localhost:3000/api/user/organization-status')
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

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Not authenticated')
    })

    it('should return 401 when user object is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Not authenticated')
    })
  })

  describe('Scenario 1: Welcome Screen (No Workspaces, No Invitations)', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })
    })

    it('should return welcome scenario when user has no organizations and no invitations', async () => {
      // Mock no user organizations
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'user_organizations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }
        }
        if (table === 'invitations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          }
        }
        return { select: jest.fn() }
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.scenario).toBe('welcome')
      expect(data.userWorkspaces).toEqual([])
      expect(data.pendingInvitations).toEqual([])
      expect(data.canCreateWorkspace).toBe(true)
    })
  })

  describe('Scenario 2: Choice Screen (No Workspaces, Single Invitation)', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })
    })

    it('should return choice scenario for user with single pending invitation', async () => {
      // Mock no organizations but one invitation
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'user_organizations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }
        }
        if (table === 'invitations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: jest.fn(() => Promise.resolve({
                  data: [{
                    id: 'inv-1',
                    organization_id: 'org-1',
                    role: 'employee',
                    team_id: null,
                    organizations: { name: 'Test Company' },
                    teams: null,
                    invited_by_profiles: {
                      full_name: 'John Doe',
                      email: 'john@test.com'
                    }
                  }],
                  error: null
                }))
              }))
            }))
          }
        }
        return { select: jest.fn() }
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.scenario).toBe('choice')
      expect(data.userWorkspaces).toEqual([])
      expect(data.pendingInvitations).toHaveLength(1)
      expect(data.pendingInvitations[0]).toEqual({
        id: 'inv-1',
        organizationName: 'Test Company',
        organizationInitials: 'TC',
        inviterName: 'John Doe',
        inviterEmail: 'john@test.com',
        token: expect.any(String)
      })
      expect(data.canCreateWorkspace).toBe(true)
    })
  })

  describe('Scenario 3: Multi-Option Screen (Has Workspaces or Multiple Invitations)', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })
    })

    it('should return multi-option scenario when user has workspaces', async () => {
      // Mock user organizations
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'user_organizations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({
                data: [{
                  organization_id: 'org-1',
                  role: 'admin',
                  is_default: true,
                  is_active: true,
                  organizations: {
                    name: 'My Company',
                    member_count: 5
                  }
                }],
                error: null
              }))
            }))
          }
        }
        if (table === 'invitations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: jest.fn(() => Promise.resolve({
                  data: [{
                    id: 'inv-1',
                    organization_id: 'org-2',
                    role: 'employee',
                    team_id: null,
                    organizations: { name: 'Another Company' },
                    teams: null,
                    invited_by_profiles: {
                      full_name: 'Jane Smith',
                      email: 'jane@another.com'
                    }
                  }],
                  error: null
                }))
              }))
            }))
          }
        }
        return { select: jest.fn() }
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.scenario).toBe('multi-option')
      expect(data.userWorkspaces).toHaveLength(1)
      expect(data.userWorkspaces[0]).toEqual({
        id: 'org-1',
        name: 'My Company',
        initials: 'MC',
        memberCount: 5,
        role: 'admin'
      })
      expect(data.pendingInvitations).toHaveLength(1)
      expect(data.canCreateWorkspace).toBe(true)
    })

    it('should return multi-option scenario when user has multiple invitations', async () => {
      // Mock no organizations but multiple invitations
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'user_organizations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }
        }
        if (table === 'invitations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: jest.fn(() => Promise.resolve({
                  data: [
                    {
                      id: 'inv-1',
                      organization_id: 'org-1',
                      role: 'employee',
                      team_id: null,
                      organizations: { name: 'First Company' },
                      teams: null,
                      invited_by_profiles: {
                        full_name: 'John Doe',
                        email: 'john@first.com'
                      }
                    },
                    {
                      id: 'inv-2',
                      organization_id: 'org-2',
                      role: 'manager',
                      team_id: null,
                      organizations: { name: 'Second Company' },
                      teams: null,
                      invited_by_profiles: {
                        full_name: 'Jane Smith',
                        email: 'jane@second.com'
                      }
                    }
                  ],
                  error: null
                }))
              }))
            }))
          }
        }
        return { select: jest.fn() }
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.scenario).toBe('multi-option')
      expect(data.userWorkspaces).toEqual([])
      expect(data.pendingInvitations).toHaveLength(2)
      expect(data.canCreateWorkspace).toBe(true)
    })
  })

  describe('Helper Functions', () => {
    it('should calculate correct initials for organization names', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'user_organizations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({
                data: [{
                  organization_id: 'org-1',
                  role: 'admin',
                  is_default: true,
                  is_active: true,
                  organizations: {
                    name: 'Amazing Business Bureau',
                    member_count: 10
                  }
                }],
                error: null
              }))
            }))
          }
        }
        if (table === 'invitations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          }
        }
        return { select: jest.fn() }
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(data.userWorkspaces[0].initials).toBe('AB')
    })

    it('should handle single word organization names', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'user_organizations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({
                data: [{
                  organization_id: 'org-1',
                  role: 'admin',
                  is_default: true,
                  is_active: true,
                  organizations: {
                    name: 'Google',
                    member_count: 3
                  }
                }],
                error: null
              }))
            }))
          }
        }
        if (table === 'invitations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          }
        }
        return { select: jest.fn() }
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(data.userWorkspaces[0].initials).toBe('GO')
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })
    })

    it('should handle database error when fetching organizations', async () => {
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'user_organizations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ 
                data: null, 
                error: { message: 'Database connection failed' }
              }))
            }))
          }
        }
        return { select: jest.fn() }
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to check organization status')
    })

    it('should handle database error when fetching invitations', async () => {
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'user_organizations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }
        }
        if (table === 'invitations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ 
                  data: null, 
                  error: { message: 'Database connection failed' }
                }))
              }))
            }))
          }
        }
        return { select: jest.fn() }
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to check organization status')
    })

    it('should handle unexpected exceptions gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Unexpected error'))

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to check organization status')
    })
  })
})