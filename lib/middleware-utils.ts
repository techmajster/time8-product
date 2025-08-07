import { createServerClient } from '@supabase/ssr'
import { type NextRequest } from 'next/server'

/**
 * Create Supabase admin client for middleware operations
 * This bypasses RLS policies for authentication checks
 */
export function createAdminClientForMiddleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in middleware')
    return null
  }

  return createServerClient(
    supabaseUrl,
    supabaseServiceKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // In middleware, we don't need to set cookies with admin client
        },
      },
    }
  )
}

/**
 * Check if user has active organization membership
 * Uses admin client to bypass RLS
 */
export async function userHasOrganization(userId: string, request: NextRequest): Promise<boolean> {
  const adminClient = createAdminClientForMiddleware(request)
  
  if (!adminClient) {
    // Fallback: assume user has organization to prevent redirect loops
    console.warn('⚠️ Could not create admin client in middleware, assuming user has org')
    return true
  }

  try {
    const { data: userOrgs, error } = await adminClient
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)

    if (error) {
      console.error('❌ Error checking user organization in middleware:', error)
      // Fallback: assume user has organization to prevent redirect loops
      return true
    }

    return userOrgs && userOrgs.length > 0
  } catch (error) {
    console.error('❌ Exception in userHasOrganization:', error)
    // Fallback: assume user has organization to prevent redirect loops
    return true
  }
}