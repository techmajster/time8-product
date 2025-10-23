/**
 * Auth Mocks for Integration Tests
 *
 * Provides mock implementations of auth utilities for testing API routes
 * without requiring real Next.js request context and authenticated sessions.
 */

import { NextResponse } from 'next/server'
import type { AuthContext, AuthResult } from '@/lib/auth-utils-v2'

// =====================================================================================
// MOCK DATA FACTORIES
// =====================================================================================

export interface MockAuthConfig {
  userId: string
  email: string
  organizationId: string
  organizationName?: string
  role: 'admin' | 'manager' | 'employee'
  teamId?: string | null
}

export function createMockAuthContext(config: MockAuthConfig): AuthContext {
  const {
    userId,
    email,
    organizationId,
    organizationName = 'Test Organization',
    role,
    teamId = null
  } = config

  return {
    user: {
      id: userId,
      email,
      aud: 'authenticated',
      role: undefined
    },
    profile: {
      id: userId,
      organization_id: organizationId,
      role,
      full_name: `Test User`,
      email,
      avatar_url: null,
      manager_id: null,
      auth_provider: 'email',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    organization: {
      id: organizationId,
      name: organizationName,
      slug: organizationName.toLowerCase().replace(/\s+/g, '-'),
      logo_url: null,
      google_domain: null,
      require_google_domain: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    organizationSettings: {
      organization_id: organizationId,
      allow_domain_join_requests: false,
      is_discoverable_by_domain: false,
      require_admin_approval_for_domain_join: true,
      auto_approve_verified_domains: false,
      default_employment_type: 'full_time',
      require_contract_dates: false,
      data_retention_days: 365,
      allow_data_export: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    userOrganization: {
      user_id: userId,
      organization_id: organizationId,
      role,
      team_id: teamId,
      is_active: true,
      is_default: true,
      joined_via: 'created',
      employment_type: 'full_time',
      contract_start_date: null,
      joined_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    role,
    organizations: [
      {
        user_id: userId,
        organization_id: organizationId,
        role,
        team_id: teamId,
        is_active: true,
        is_default: true,
        joined_via: 'created',
        employment_type: 'full_time',
        contract_start_date: null,
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    permissions: {
      canManageUsers: role === 'admin',
      canManageTeams: role === 'admin',
      canApproveLeave: role === 'admin' || role === 'manager',
      canViewReports: role === 'admin' || role === 'manager',
      canManageSettings: role === 'admin'
    }
  }
}

// =====================================================================================
// MOCK IMPLEMENTATIONS
// =====================================================================================

/**
 * Mock implementation of authenticateAndGetOrgContext
 * Returns the mock auth context based on current test configuration
 */
export function createMockAuthenticateAndGetOrgContext(
  mockConfig: MockAuthConfig | null
): () => Promise<AuthResult> {
  return async (): Promise<AuthResult> => {
    // If no mock config, return unauthorized
    if (!mockConfig) {
      return {
        success: false,
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Return success with mock context
    return {
      success: true,
      context: createMockAuthContext(mockConfig)
    }
  }
}

/**
 * Mock implementation of requireRole
 * Checks if the mock user has the required role
 */
export function createMockRequireRole(
  mockConfig: MockAuthConfig | null
): (context: AuthContext, allowedRoles: string[]) => NextResponse | null {
  return (context: AuthContext, allowedRoles: string[]): NextResponse | null => {
    if (!mockConfig) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!allowedRoles.includes(mockConfig.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    return null
  }
}

/**
 * Mock Supabase client that returns mock user data
 */
export function createMockSupabaseClient(mockConfig: MockAuthConfig | null) {
  return {
    auth: {
      getUser: jest.fn(async () => {
        if (!mockConfig) {
          return {
            data: { user: null },
            error: { message: 'Not authenticated' }
          }
        }

        return {
          data: {
            user: {
              id: mockConfig.userId,
              email: mockConfig.email,
              aud: 'authenticated',
              app_metadata: {},
              user_metadata: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          },
          error: null
        }
      }),
      signOut: jest.fn(async () => ({ error: null }))
    },
    from: jest.fn((table: string) => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(async () => ({
            data: null,
            error: { message: 'Mock: Use real supabase for data operations' }
          })),
          maybeSingle: jest.fn(async () => ({
            data: null,
            error: null
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(async () => ({
            data: null,
            error: { message: 'Mock: Use real supabase for data operations' }
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(async () => ({
            data: null,
            error: { message: 'Mock: Use real supabase for data operations' }
          }))
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(async () => ({
          error: { message: 'Mock: Use real supabase for data operations' }
        }))
      }))
    }))
  }
}

// =====================================================================================
// MOCK SETUP HELPERS
// =====================================================================================

/**
 * Global mock state - stores current mock configuration
 */
let currentMockConfig: MockAuthConfig | null = null

/**
 * Set the mock auth configuration for the current test
 */
export function setMockAuthConfig(config: MockAuthConfig | null) {
  currentMockConfig = config
}

/**
 * Get the current mock auth configuration
 */
export function getMockAuthConfig(): MockAuthConfig | null {
  return currentMockConfig
}

/**
 * Clear mock auth configuration (call in afterEach)
 */
export function clearMockAuthConfig() {
  currentMockConfig = null
}

// =====================================================================================
// JEST MOCK SETUP
// =====================================================================================

/**
 * Setup function to be called at the start of test file
 * Mocks the auth utilities with dynamic mock configuration
 */
export function setupAuthMocks() {
  // Mock @/lib/supabase/server
  jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(async () => createMockSupabaseClient(getMockAuthConfig())),
    createAdminClient: jest.fn(() => {
      // Return the real Supabase admin client for data operations
      const { createClient } = jest.requireActual('@supabase/supabase-js')
      return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
    })
  }))

  // Mock @/lib/auth-utils-v2
  jest.mock('@/lib/auth-utils-v2', () => {
    const actual = jest.requireActual('@/lib/auth-utils-v2')
    return {
      ...actual,
      authenticateAndGetOrgContext: jest.fn(async (organizationId?: string) => {
        const config = getMockAuthConfig()
        if (!config) {
          return {
            success: false,
            error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
          }
        }

        return {
          success: true,
          context: createMockAuthContext({
            ...config,
            organizationId: organizationId || config.organizationId
          })
        }
      }),
      requireRole: jest.fn((context: AuthContext, allowedRoles: string[]) => {
        const config = getMockAuthConfig()
        if (!config) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!allowedRoles.includes(config.role)) {
          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          )
        }

        return null
      })
    }
  })

  // Mock next/headers for cookies and headers
  jest.mock('next/headers', () => ({
    cookies: jest.fn(async () => {
      const config = getMockAuthConfig()
      return {
        get: jest.fn((name: string) => {
          if (name === 'active-organization-id' && config) {
            return { value: config.organizationId }
          }
          return undefined
        }),
        set: jest.fn(),
        delete: jest.fn()
      }
    }),
    headers: jest.fn(async () => {
      const config = getMockAuthConfig()
      return {
        get: jest.fn((name: string) => {
          if (name === 'x-organization-id' && config) {
            return config.organizationId
          }
          return null
        })
      }
    })
  }))
}
