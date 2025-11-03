import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '5')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
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

    // Get recent leave requests for the user
    const { data: recentRequests, error } = await supabase
      .from('leave_requests')
      .select(`
        id,
        start_date,
        end_date,
        status,
        leave_types!inner (
          name,
          color
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching recent leave requests:', error)
      return NextResponse.json(
        { error: 'Failed to fetch recent leave requests' },
        { status: 500 }
      )
    }

    return NextResponse.json(recentRequests || [])
  } catch (error) {
    console.error('Unexpected error in recent leave requests API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
