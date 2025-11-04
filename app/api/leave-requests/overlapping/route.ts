import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2'

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      return auth.error
    }

    const { context } = auth
    const { organization, user } = context
    const organizationId = organization.id

    const { start_date, end_date, exclude_user_id } = await request.json()

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    // Use exclude_user_id if provided, otherwise exclude current user
    const userIdToExclude = exclude_user_id || user.id

    const supabaseAdmin = createAdminClient()

    // Fetch overlapping leave requests from same organization
    const { data: overlappingRequests, error } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        id,
        user_id,
        end_date,
        leave_types (
          name
        ),
        profiles!leave_requests_user_id_fkey (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('organization_id', organizationId)
      .neq('user_id', userIdToExclude) // Exclude specified user
      .in('status', ['approved', 'pending']) // Include both approved and pending requests
      .lte('start_date', end_date) // Leave starts before or on request's end date
      .gte('end_date', start_date) // Leave ends after or on request's start date

    if (error) {
      console.error('Error fetching overlapping requests:', error)
      return NextResponse.json(
        { error: 'Failed to fetch overlapping requests' },
        { status: 500 }
      )
    }

    // Format the response
    const formattedOverlappingRequests = (overlappingRequests || []).map((req: any) => ({
      id: req.profiles?.id || req.user_id,
      full_name: req.profiles?.full_name || null,
      email: req.profiles?.email || '',
      avatar_url: req.profiles?.avatar_url || null,
      leave_type_name: req.leave_types?.name || 'Urlop',
      end_date: req.end_date,
    }))

    return NextResponse.json({
      overlappingRequests: formattedOverlappingRequests
    })

  } catch (error) {
    console.error('API Error fetching overlapping requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

