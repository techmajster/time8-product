import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { teamMemberIds, date } = await request.json()

    if (!teamMemberIds || !Array.isArray(teamMemberIds) || !date) {
      return NextResponse.json(
        { error: 'teamMemberIds array and date are required' },
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

    // Get current active leave requests (people on leave today)
    const { data: currentLeaveRequests, error } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        id,
        user_id,
        start_date,
        end_date,
        leave_types (
          name,
          color
        ),
        profiles!leave_requests_user_id_fkey (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('status', 'approved')
      .lte('start_date', date)
      .gte('end_date', date)
      .in('user_id', teamMemberIds)

    if (error) {
      console.error('Error fetching current leave requests:', error)
      return NextResponse.json(
        { error: 'Failed to fetch current leave requests' },
        { status: 500 }
      )
    }

    return NextResponse.json(currentLeaveRequests || [])
  } catch (error) {
    console.error('Unexpected error in current leave requests API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
