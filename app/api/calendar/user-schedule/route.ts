import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const organizationId = searchParams.get('organizationId')
    const date = searchParams.get('date')

    if (!userId || !organizationId || !date) {
      return NextResponse.json(
        { error: 'userId, organizationId, and date are required' },
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

    // Get user schedule for the specific date
    const { data, error } = await supabase
      .from('employee_schedules')
      .select('shift_start_time, shift_end_time, is_working_day')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('date', date)
      .single()

    if (error || !data) {
      return NextResponse.json(null)
    }

    if (!data.is_working_day || !data.shift_start_time || !data.shift_end_time) {
      return NextResponse.json(null)
    }

    // Format time from HH:MM:SS to HH:MM
    const formatTime = (timeString: string | null): string => {
      if (!timeString) return ''
      return timeString.substring(0, 5)
    }

    return NextResponse.json({
      start: formatTime(data.shift_start_time),
      end: formatTime(data.shift_end_time),
      isReady: true
    })
  } catch (error) {
    console.error('Unexpected error in user-schedule API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
