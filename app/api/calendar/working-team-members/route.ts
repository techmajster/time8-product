import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const date = searchParams.get('date')
    const userId = searchParams.get('userId')
    const teamMemberIds = searchParams.get('teamMemberIds')

    if (!organizationId || !date || !userId || !teamMemberIds) {
      return NextResponse.json(
        { error: 'organizationId, date, userId, and teamMemberIds are required' },
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

    const teamMemberIdsArray = teamMemberIds.split(',')

    // Get users who are working on this day
    const { data: schedules, error: schedulesError } = await supabase
      .from('employee_schedules')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('date', date)
      .eq('is_working_day', true)
      .in('user_id', teamMemberIdsArray)

    if (schedulesError || !schedules || schedules.length === 0) {
      return NextResponse.json([])
    }

    const workingUserIds = schedules.map(s => s.user_id)

    // Get user IDs who are on approved leave (to exclude them)
    const { data: leaveRequests } = await supabase
      .from('leave_requests')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('status', 'approved')
      .lte('start_date', date)
      .gte('end_date', date)
      .in('user_id', workingUserIds)

    const absentUserIds = new Set(leaveRequests?.map(req => req.user_id) || [])
    const availableUserIds = workingUserIds.filter(id => !absentUserIds.has(id) && id !== userId)

    if (availableUserIds.length === 0) {
      return NextResponse.json([])
    }

    // Get profiles and team info for working users
    const { data: userOrgs, error: userOrgsError } = await supabase
      .from('user_organizations')
      .select(`
        user_id,
        profiles!user_organizations_user_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        teams!user_organizations_team_id_fkey (
          name
        )
      `)
      .eq('organization_id', organizationId)
      .in('user_id', availableUserIds)
      .eq('is_active', true)

    if (userOrgsError || !userOrgs) {
      return NextResponse.json([])
    }

    // Transform to working members array
    const workingMembers = userOrgs.map((userOrg: any) => {
      const profile = Array.isArray(userOrg.profiles) ? userOrg.profiles[0] : userOrg.profiles
      const team = Array.isArray(userOrg.teams) ? userOrg.teams[0] : userOrg.teams

      return {
        id: profile?.id || userOrg.user_id,
        name: profile?.full_name || 'Unknown User',
        avatar: profile?.avatar_url || undefined,
        teamName: team?.name || undefined
      }
    })

    return NextResponse.json(workingMembers)
  } catch (error) {
    console.error('Unexpected error in working-team-members API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
