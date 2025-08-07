import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * Server-side utilities that work with RLS policies
 * These functions handle the complexity of admin vs user client selection
 */

/**
 * Check if user has organization membership (server-side)
 * Uses admin client to bypass RLS for authentication checks
 */
export async function checkUserOrganization(userId: string) {
  const adminClient = createAdminClient()
  
  try {
    const { data: userOrgs, error } = await adminClient
      .from('user_organizations')
      .select('organization_id, role, team_id, is_active, is_default')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)

    if (error) {
      console.error('❌ Error checking user organization:', error)
      return { hasOrganization: false, organization: null, error }
    }

    return {
      hasOrganization: userOrgs && userOrgs.length > 0,
      organization: userOrgs?.[0] || null,
      error: null
    }
  } catch (error) {
    console.error('❌ Exception in checkUserOrganization:', error)
    return { hasOrganization: false, organization: null, error }
  }
}

/**
 * Get user's pending invitations (server-side)
 * Uses admin client to bypass RLS
 */
export async function getUserPendingInvitations(userEmail: string) {
  const adminClient = createAdminClient()
  
  try {
    const { data: invitations, error } = await adminClient
      .from('invitations')
      .select(`
        id, 
        organization_id,
        role,
        team_id,
        status,
        created_at,
        expires_at,
        organizations (
          name,
          slug
        ),
        teams (
          name
        )
      `)
      .eq('email', userEmail.toLowerCase())
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error getting pending invitations:', error)
      return { invitations: [], error }
    }

    return {
      invitations: invitations || [],
      error: null
    }
  } catch (error) {
    console.error('❌ Exception in getUserPendingInvitations:', error)
    return { invitations: [], error }
  }
}

/**
 * Get user profile with organization context (server-side)
 * Uses admin client to bypass RLS
 */
export async function getUserWithOrganization(userId: string) {
  const adminClient = createAdminClient()
  
  try {
    // Get profile
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('❌ Error getting user profile:', profileError)
      return { user: null, organization: null, error: profileError }
    }

    // Get active organization
    const { data: userOrg, error: orgError } = await adminClient
      .from('user_organizations')
      .select(`
        *,
        organizations (
          id,
          name,
          slug,
          settings
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('is_default', true)
      .single()

    if (orgError && orgError.code !== 'PGRST116') { // PGRST116 is "no rows" error
      console.error('❌ Error getting user organization:', orgError)
    }

    return {
      user: profile,
      organization: userOrg || null,
      error: null
    }
  } catch (error) {
    console.error('❌ Exception in getUserWithOrganization:', error)
    return { user: null, organization: null, error }
  }
}