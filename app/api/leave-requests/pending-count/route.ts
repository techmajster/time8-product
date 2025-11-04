import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { teamMemberIds } = await request.json()

    if (!teamMemberIds || !Array.isArray(teamMemberIds)) {
      return NextResponse.json(
        { error: 'teamMemberIds array is required' },
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

    // Get pending leave requests count
    const { count, error } = await supabaseAdmin
      .from('leave_requests')
      .select('id', { count: 'exact' })
      .eq('status', 'pending')
      .in('user_id', teamMemberIds)

    if (error) {
      console.error('Error fetching pending requests count:', error)
      return NextResponse.json(
        { error: 'Failed to fetch pending requests count' },
        { status: 500 }
      )
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error('Unexpected error in pending-count API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
