import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Authenticate the request
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const todayDate = new Date().toISOString().split('T')[0]

    // Check if user has an approved leave request active today
    const { data: activeLeave, error } = await supabase
      .from('leave_requests')
      .select(`
        id,
        end_date,
        leave_types (
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .lte('start_date', todayDate)
      .gte('end_date', todayDate)
      .single()

    if (error || !activeLeave) {
      // No active leave or error fetching
      return NextResponse.json(null)
    }

    return NextResponse.json({
      id: activeLeave.id,
      end_date: activeLeave.end_date,
      leave_type_name: Array.isArray(activeLeave.leave_types)
        ? activeLeave.leave_types[0]?.name
        : activeLeave.leave_types?.name
    })
  } catch (error) {
    console.error('Unexpected error in active-leave API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
