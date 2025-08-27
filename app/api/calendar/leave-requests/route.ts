import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const supabaseAdmin = await createAdminClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('🔍 Calendar leave requests API auth check:', {
      user: user ? { id: user.id, email: user.email } : null,
      authError: authError ? authError.message : null
    })

    if (!user) {
      console.error('❌ Calendar leave requests API: No authenticated user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current active organization (respect workspace switching cookie)
    const cookieStore = await cookies()
    const activeOrgId = cookieStore.get('active-organization-id')?.value
    
    let userOrgQuery = supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      
    // If we have an active org cookie, use that specific org, otherwise use default
    if (activeOrgId) {
      userOrgQuery = userOrgQuery.eq('organization_id', activeOrgId)
      console.log('🍪 Calendar leave requests API: Using active organization from cookie:', activeOrgId)
    } else {
      userOrgQuery = userOrgQuery.eq('is_default', true)
      console.log('🏠 Calendar leave requests API: Using default organization (no active cookie)')
    }
    
    const { data: userOrg, error: orgError } = await userOrgQuery.single()

    console.log('🔍 Calendar leave requests API org check:', { userOrg, orgError })

    if (!userOrg) {
      console.error('❌ Calendar leave requests API: No organization found for user')
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get URL parameters for date filtering
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const teamMemberIdsParam = searchParams.get('team_member_ids')
    const teamMemberIds = teamMemberIdsParam ? teamMemberIdsParam.split(',').filter(id => id.trim()) : []

    console.log('📝 Calendar API params:', { startDate, endDate, teamMemberIds, organizationId: userOrg.organization_id })

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
      .eq('organization_id', userOrg.organization_id)
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