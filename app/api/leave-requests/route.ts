import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBasicAuth, isManagerOrAdmin } from '@/lib/auth-utils'

export async function GET() {
  try {
    // Authenticate and get basic profile info
    const auth = await getBasicAuth()
    if (!auth.success) {
      return auth.error
    }

    const { user, organizationId, role } = auth
    const supabase = await createClient()

    // Build query based on role
    const canViewAll = isManagerOrAdmin(role)
    
    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        leave_types (
          id,
          name,
          color
        ),
        user_profile:profiles!leave_requests_user_id_fkey (
          id,
          full_name,
          email
        ),
        reviewed_by_profile:profiles!leave_requests_reviewed_by_fkey (
          full_name,
          email
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    // If employee, only show their own requests
    if (!canViewAll) {
      query = query.eq('user_id', user.id)
    }

    const { data: leaveRequests, error } = await query

    if (error) {
      console.error('Error fetching leave requests:', error)
      return NextResponse.json(
        { error: 'Failed to fetch leave requests' },
        { status: 500 }
      )
    }

    return NextResponse.json({ leaveRequests })

  } catch (error) {
    console.error('API Error fetching leave requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { leave_type_id, start_date, end_date, days_requested, reason } = await request.json()

    if (!leave_type_id || !start_date || !end_date || !days_requested) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use optimized auth utility
    const auth = await getBasicAuth()
    if (!auth.success) return auth.error
    const { user, organizationId } = auth

    const supabase = await createClient()

    // Validate leave type belongs to organization
    const { data: leaveType } = await supabase
      .from('leave_types')
      .select('id, name')
      .eq('id', leave_type_id)
      .eq('organization_id', organizationId)
      .single()

    if (!leaveType) {
      return NextResponse.json(
        { error: 'Invalid leave type' },
        { status: 400 }
      )
    }

    // Check for overlapping requests
    // Fixed overlap logic: two periods overlap if:
    // (start1 <= end2) AND (end1 >= start2)
    const { data: overlappingRequests } = await supabase
      .from('leave_requests')
      .select('id, start_date, end_date, status')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .in('status', ['pending', 'approved'])
      .lte('start_date', end_date)
      .gte('end_date', start_date)

    if (overlappingRequests && overlappingRequests.length > 0) {
      return NextResponse.json(
        { error: 'Masz już zaplanowany lub oczekujący urlop w tym terminie' },
        { status: 400 }
      )
    }

    // Create leave request
    const { data: leaveRequest, error: createError } = await supabase
      .from('leave_requests')
      .insert({
        organization_id: organizationId,
        user_id: user.id,
        leave_type_id,
        start_date,
        end_date,
        days_requested,
        reason: reason || null,
        status: 'pending'
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating leave request:', createError)
      return NextResponse.json(
        { error: 'Failed to create leave request', details: createError.message },
        { status: 500 }
      )
    }

    // Send email notification about new request to managers
    try {
      const { notifyLeaveRequestStatusChange } = await import('@/lib/notification-utils')
      await notifyLeaveRequestStatusChange(leaveRequest.id, 'pending')
    } catch (emailError) {
      console.error('Error sending email notification:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      leaveRequest,
      message: 'Wniosek urlopowy został pomyślnie złożony'
    })

  } catch (error) {
    console.error('API Error creating leave request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 