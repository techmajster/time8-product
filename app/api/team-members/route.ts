import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { organizationId, teamMemberIds } = await request.json()

    if (!organizationId || !teamMemberIds || !Array.isArray(teamMemberIds)) {
      return NextResponse.json(
        { error: 'organizationId and teamMemberIds array are required' },
        { status: 400 }
      )
    }

    // Authenticate the request
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use admin client for better performance
    const supabaseAdmin = createAdminClient()

    // Get team members based on user's team scope via user_organizations
    const { data: rawTeamMembers, error } = await supabaseAdmin
      .from('user_organizations')
      .select(`
        user_id,
        role,
        team_id,
        profiles!user_organizations_user_id_fkey (
          id,
          email,
          full_name,
          avatar_url
        ),
        teams!user_organizations_team_id_fkey (
          id,
          name,
          color
        )
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .in('user_id', teamMemberIds)
      .order('profiles(full_name)', { ascending: true })

    if (error) {
      console.error('Error fetching team members:', error)
      return NextResponse.json(
        { error: 'Failed to fetch team members' },
        { status: 500 }
      )
    }

    // Transform the data to match expected interface
    const allTeamMembers = rawTeamMembers?.map(userOrg => {
      const profile = Array.isArray(userOrg.profiles) ? userOrg.profiles[0] : userOrg.profiles
      return {
        id: profile?.id || userOrg.user_id,
        email: profile?.email || '',
        full_name: profile?.full_name,
        avatar_url: profile?.avatar_url,
        team_id: userOrg.team_id,
        teams: Array.isArray(userOrg.teams) ? userOrg.teams[0] : userOrg.teams
      }
    }) || []

    return NextResponse.json(allTeamMembers)
  } catch (error) {
    console.error('Unexpected error in team-members API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
