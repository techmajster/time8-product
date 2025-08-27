import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params
    console.log('🔍 API: Getting leave request details:', { requestId })

    // Use optimized auth utility
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) return auth.error
    const { context } = auth
    const { user, organization, userOrganization } = context
    const organizationId = organization.id

    console.log('🔍 API: Auth context:', {
      userId: user.id,
      organizationId,
      userRole: userOrganization.role,
      requestId
    })

    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    // Get the leave request details with relations
    // Use admin client since we've already validated user permissions through auth context
    const { data: leaveRequest, error: fetchError } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        leave_types (
          id,
          name,
          color,
          days_per_year
        ),
        profiles!leave_requests_user_id_fkey (
          id,
          full_name,
          email
        ),
        reviewed_by_profile:profiles!leave_requests_reviewed_by_fkey (
          full_name,
          email
        )
      `)
      .eq('id', requestId)
      .eq('organization_id', organizationId)
      .single()

    if (fetchError || !leaveRequest) {
      console.error('Leave request fetch failed:', {
        requestId,
        organizationId,
        userId: user.id,
        fetchError: {
          message: fetchError?.message,
          code: fetchError?.code,
          details: fetchError?.details,
          hint: fetchError?.hint
        },
        hasLeaveRequest: !!leaveRequest
      })
      return NextResponse.json(
        { error: 'Leave request not found or access denied', debug: { requestId, organizationId } },
        { status: 404 }
      )
    }

    // Check for conflicting leave requests (same organization, overlapping dates, approved)
    const { data: conflictingLeaves } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        id,
        profiles!leave_requests_user_id_fkey (
          full_name,
          email,
          avatar_url
        ),
        leave_types (
          name
        ),
        end_date
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'approved')
      .neq('user_id', leaveRequest.user_id) // Exclude the current user
      .neq('id', requestId) // Exclude current request
      .or(`and(start_date.lte.${leaveRequest.end_date},end_date.gte.${leaveRequest.start_date})`)

    // Format conflicting leaves for the component
    const formattedConflictingLeaves = conflictingLeaves?.map(leave => ({
      id: leave.id,
      full_name: leave.profiles?.full_name || null,
      email: leave.profiles?.email || '',
      avatar_url: leave.profiles?.avatar_url || null,
      leave_type: leave.leave_types?.name || 'Urlop',
      end_date: new Date(leave.end_date).toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    })) || []

    // Get user's leave types and balances for editing functionality
    const { data: leaveTypes } = await supabaseAdmin
      .from('leave_types')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name')

    const { data: leaveBalances } = await supabaseAdmin
      .from('leave_balances')
      .select(`
        *,
        carry_over_days,
        leave_types (
          id,
          name,
          color,
          leave_category
        )
      `)
      .eq('user_id', leaveRequest.user_id)
      .eq('year', new Date().getFullYear())

    // Prepare user profile for editing
    const userProfile = {
      id: leaveRequest.user_id,
      full_name: leaveRequest.profiles?.full_name || null,
      email: leaveRequest.profiles?.email || '',
      role: userOrganization.role,
      employment_start_date: null, // Not needed for details
      organization_id: organizationId
    }

    return NextResponse.json({
      leaveRequest,
      conflictingLeaves: formattedConflictingLeaves,
      userRole: userOrganization.role,
      currentUserId: user.id,
      leaveTypes: leaveTypes || [],
      leaveBalances: leaveBalances || [],
      userProfile
    })

  } catch (error) {
    console.error('API Error fetching leave request details:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}