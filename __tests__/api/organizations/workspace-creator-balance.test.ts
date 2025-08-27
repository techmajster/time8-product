/**
 * @jest-environment node
 */

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { POST } from '@/app/api/organizations/route'

// Mock Supabase
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/auth-utils-v2')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

describe('POST /api/organizations - Workspace Creator Balance Initialization', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create leave balances for workspace creator when leave types are created', async () => {
    const userId = 'user-123'
    const orgId = 'org-456'

    // Track calls for balance insertion
    const balanceInsertCalls: any[] = []

    // Mock regular client  
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: userId, email: 'creator@test.com' } },
          error: null,
        }),
      },
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { id: userId, full_name: 'Test Creator', role: 'admin' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'leave_types') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'leave-type-1',
                    name: 'Urlop wypoczynkowy',
                    days_per_year: 20,
                    requires_balance: true,
                    leave_category: 'annual'
                  },
                  {
                    id: 'leave-type-2', 
                    name: 'Urlop na żądanie',
                    days_per_year: 4,
                    requires_balance: true,
                    leave_category: 'annual'
                  }
                ],
                error: null,
              }),
            })),
          }
        }
        return {}
      }),
    }

    // Mock admin client
    const mockSupabaseAdmin = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'organizations') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { id: orgId, name: 'Test Workspace' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'user_organizations') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
            })),
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === 'organization_domains') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === 'leave_balances') {
          return {
            insert: jest.fn().mockImplementation((data: any) => {
              balanceInsertCalls.push(data)
              return Promise.resolve({ data: null, error: null })
            }),
          }
        }
        return {}
      }),
    }

    mockCreateClient.mockResolvedValue(mockSupabase as any)
    mockCreateAdminClient.mockReturnValue(mockSupabaseAdmin as any)

    const request = new Request('http://localhost:3000/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Workspace',
        slug: 'test-workspace',
        country_code: 'PL'
      }),
    }) as any

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)

    // Verify leave balances were inserted
    expect(balanceInsertCalls).toHaveLength(1)
    expect(balanceInsertCalls[0]).toEqual([
      {
        user_id: userId,
        leave_type_id: 'leave-type-1',
        organization_id: orgId,
        year: new Date().getFullYear(),
        entitled_days: 20,
        used_days: 0
      },
      {
        user_id: userId,
        leave_type_id: 'leave-type-2',
        organization_id: orgId,
        year: new Date().getFullYear(),
        entitled_days: 4,
        used_days: 0
      }
    ])
  })

  it('should not create balances for child-specific leave types', async () => {
    const userId = 'user-123'
    const orgId = 'org-456'

    const balanceInsertCalls: any[] = []

    // Mock regular client with maternity leave type
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: userId, email: 'creator@test.com' } },
          error: null,
        }),
      },
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { id: userId, full_name: 'Test Creator', role: 'admin' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'leave_types') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'maternity-leave',
                    name: 'Urlop macierzyński',
                    days_per_year: 140,
                    requires_balance: true,
                    leave_category: 'maternity'
                  }
                ],
                error: null,
              }),
            })),
          }
        }
        return {}
      }),
    }

    const mockSupabaseAdmin = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'organizations') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { id: orgId, name: 'Test Workspace' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'user_organizations') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
            })),
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === 'organization_domains') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === 'leave_balances') {
          return {
            insert: jest.fn().mockImplementation((data: any) => {
              balanceInsertCalls.push(data)
              return Promise.resolve({ data: null, error: null })
            }),
          }
        }
        return {}
      }),
    }

    mockCreateClient.mockResolvedValue(mockSupabase as any)
    mockCreateAdminClient.mockReturnValue(mockSupabaseAdmin as any)

    const request = new Request('http://localhost:3000/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Workspace',
        slug: 'test-workspace',
        country_code: 'PL'
      }),
    }) as any

    const response = await POST(request)
    expect(response.status).toBe(200)

    // Should not create balances for maternity leave (filtered out)
    expect(balanceInsertCalls).toHaveLength(0)
  })
})