import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2'

export async function GET(request: NextRequest) {
  try {
    // REFACTOR: Use standard auth pattern for workspace isolation
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      return auth.error
    }

    const { context } = auth
    const { organization } = context
    const organizationId = organization.id

    console.log('✅ Calendar leave requests API: Using organization:', organizationId)

    const supabaseAdmin = await createAdminClient()

    // Get URL parameters for date filtering
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const teamMemberIdsParam = searchParams.get('team_member_ids')
    const teamMemberIds = teamMemberIdsParam ? teamMemberIdsParam.split(',').filter(id => id.trim()) : []

    console.log('📝 Calendar API params:', { startDate, endDate, teamMemberIds, organizationId })

    // Fetch leave requests using admin client to bypass RLS
    let query = supabaseAdmin
      .from('leave_requests')
      .select(`
        id,
        user_id,
        start_date,
        end_date,
        status,
        organization_id,
        leave_type_id,
        profiles!leave_requests_user_id_fkey (
          id,
          full_name,
          email,
          avatar_url
        ),
        leave_types (
          id,
          name,
          color
        )
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'approved')

    // Filter by team members if provided and not empty
    if (teamMemberIds.length > 0) {
      query = query.in('user_id', teamMemberIds)
    }

    // Filter by date range if provided
    if (startDate && endDate) {
      query = query.or(`start_date.lte.${endDate},end_date.gte.${startDate}`)
    }

    const { data: leaveRequests, error } = await query

    if (error) {
      console.error('❌ Error fetching calendar leave requests:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        query: 'leave_requests with profiles and leave_types'
      })
      return NextResponse.json({ error: 'Failed to fetch leave requests', details: error.message }, { status: 500 })
    }

    console.log('✅ Calendar leave requests fetched successfully:', leaveRequests?.length || 0, 'requests')
    console.log('🔍 Calendar leave requests details:', leaveRequests?.map(req => ({
      id: req.id,
      user_id: req.user_id,
      status: req.status,
      start_date: req.start_date,
      end_date: req.end_date,
      user_name: req.profiles?.full_name
    })))
    return NextResponse.json(leaveRequests || [])

  } catch (error) {
    console.error('❌ Error in calendar leave requests API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}