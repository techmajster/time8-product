import { createClient } from '@/lib/supabase/server'

export interface TeamScope {
  type: 'organization' | 'team'
  teamId?: string
  organizationId: string
}

/**
 * Determines the user's team scope for filtering data
 * If user has team_id: filter by team
 * If user has no team_id: show all organization data (fallback)
 * If user is admin: always see all organization data (override)
 */
export async function getUserTeamScope(userId: string): Promise<TeamScope> {
  const supabase = await createClient()
  
  // MULTI-ORG UPDATE: Get user's active organization from user_organizations
  const { data: userOrg, error } = await supabase
    .from('user_organizations')
    .select('organization_id, team_id, role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('is_default', true)
    .single()

  if (error || !userOrg?.organization_id) {
    throw new Error('User profile not found')
  }

  // Admins always see all organization data
  if (userOrg.role === 'admin') {
    return {
      type: 'organization',
      organizationId: userOrg.organization_id
    }
  }

  // If user has team_id, filter by team
  if (userOrg.team_id) {
    return {
      type: 'team',
      teamId: userOrg.team_id,
      organizationId: userOrg.organization_id
    }
  }

  // Fallback: show all organization data (no teams exist or user not assigned)
  return {
    type: 'organization',
    organizationId: userOrg.organization_id
  }
}

/**
 * Gets team member IDs for filtering queries
 * Returns array of user IDs that should be visible to the current user
 */
export async function getTeamMemberIds(scope: TeamScope): Promise<string[]> {
  const supabase = await createClient()

  if (scope.type === 'organization') {
    // MULTI-ORG UPDATE: Show all organization members via user_organizations
    const { data: members } = await supabase
      .from('user_organizations')
      .select('user_id')
      .eq('organization_id', scope.organizationId)
      .eq('is_active', true)

    return members?.map(m => m.user_id) || []
  }

  if (scope.type === 'team' && scope.teamId) {
    // MULTI-ORG UPDATE: Show only team members via user_organizations
    const { data: members } = await supabase
      .from('user_organizations')
      .select('user_id')
      .eq('team_id', scope.teamId)
      .eq('is_active', true)

    return members?.map(m => m.user_id) || []
  }

  return []
}

/**
 * Applies team filtering to a Supabase query builder
 * Use this to filter queries by team membership
 */
export function applyTeamFilter(
  query: any, 
  scope: TeamScope, 
  userIdColumn: string = 'user_id'
) {
  if (scope.type === 'organization') {
    // Filter by organization (fallback or admin)
    return query.eq('organization_id', scope.organizationId)
  }

  if (scope.type === 'team' && scope.teamId) {
    // MULTI-ORG UPDATE: Filter by team members via user_organizations
    return query.in(userIdColumn, `(
      SELECT user_id FROM user_organizations 
      WHERE team_id = '${scope.teamId}' AND is_active = true
    )`)
  }

  return query
}

/**
 * Checks if current user can manage a specific team
 */
export async function canManageTeam(userId: string, teamId: string): Promise<boolean> {
  const supabase = await createClient()
  
  // MULTI-ORG UPDATE: Get user role from user_organizations
  const { data: userOrg } = await supabase
    .from('user_organizations')
    .select('role, team_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('is_default', true)
    .single()

  if (!userOrg) return false

  // Admins can manage any team
  if (userOrg.role === 'admin') return true

  // Team managers can manage their own team
  const { data: team } = await supabase
    .from('teams')
    .select('manager_id')
    .eq('id', teamId)
    .single()

  return team?.manager_id === userId
} 