import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getOrSetCache, cacheKeys, cacheTTL } from '@/lib/cache-utils'

export interface UserProfile {
  id: string
  organization_id: string
  role: string
  full_name: string | null
  email: string
  avatar_url: string | null
  manager_id: string | null
  auth_provider: string
  created_at: string
  updated_at: string
}

export type AuthResult = {
  success: true
  user: any
  profile: UserProfile
} | {
  success: false
  error: NextResponse
}

/**
 * Common authentication and profile fetching for API routes
 * Returns user and profile or error response
 */
export async function authenticateAndGetProfile(): Promise<AuthResult> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return {
      success: false,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // MULTI-ORG UPDATE: Get user profile and organization context
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return {
      success: false,
      error: NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
  }

  // Get user's organization from user_organizations
  const { data: userOrg, error: userOrgError } = await supabase
    .from('user_organizations')
    .select('organization_id, role, team_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .eq('is_default', true)
    .single()

  if (userOrgError || !userOrg) {
    return {
      success: false,
      error: NextResponse.json({ error: 'User not assigned to organization' }, { status: 400 })
    }
  }

  // Add organization context to profile for backward compatibility
  profile.organization_id = userOrg.organization_id
  profile.role = userOrg.role
  profile.team_id = userOrg.team_id

  return {
    success: true,
    user,
    profile
  }
}

/**
 * Check if user has admin or manager role
 */
export function isManagerOrAdmin(role: string): boolean {
  return role === 'admin' || role === 'manager'
}

/**
 * Check if user has admin role
 */
export function isAdmin(role: string): boolean {
  return role === 'admin'
}

/**
 * Common role-based authorization check for API routes
 */
export function requireRole(profile: UserProfile, requiredRoles: string[]): NextResponse | null {
  if (!requiredRoles.includes(profile.role)) {
    return NextResponse.json(
      { error: `Access denied. Required role: ${requiredRoles.join(' or ')}` },
      { status: 403 }
    )
  }
  return null
}

/**
 * Lightweight authentication for API routes that only need org and role
 */
export type BasicAuthResult = {
  success: true
  user: {
    id: string
    email: string
  }
  organizationId: string
  role: string
} | {
  success: false
  error: NextResponse
}

/**
 * Get basic authentication info with caching
 * Returns user, organizationId, and role
 */
export async function getBasicAuth(): Promise<BasicAuthResult> {
  try {
    const supabase = await createClient()
    
    // Get user from Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return {
        success: false,
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Try to get cached profile data first
    const cacheKey = cacheKeys.userProfileWithOrg(user.id)
    const cachedProfile = await getOrSetCache(
      cacheKey,
      async () => {
        // MULTI-ORG UPDATE: Fetch from user_organizations instead of profiles
        const { data: userOrg, error: profileError } = await supabase
          .from('user_organizations')
          .select('organization_id, role')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .eq('is_default', true)
          .single()

        if (profileError || !userOrg) {
          throw new Error('User organization not found')
        }

        return userOrg
      },
      cacheTTL.userProfileWithOrg
    )

    if (!cachedProfile?.organization_id) {
      return {
        success: false,
        error: NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email || ''
      },
      organizationId: cachedProfile.organization_id,
      role: cachedProfile.role
    }

  } catch (error) {
    console.error('Auth error:', error)
    return {
      success: false,
      error: NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
} 