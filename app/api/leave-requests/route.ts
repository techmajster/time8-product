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
    const { 
      leave_type_id, 
      start_date, 
      end_date, 
      days_requested, 
      reason, 
      notes,
      employee_id,
      auto_approve = false 
    } = await request.json()

    if (!leave_type_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use optimized auth utility
    const auth = await getBasicAuth()
    if (!auth.success) return auth.error
    const { user, organizationId, role } = auth

    // Handle admin-created requests
    let targetUserId = user.id
    let isAdminCreated = false

    if (employee_id && isManagerOrAdmin(role)) {
      // Admin/manager is creating request for another employee
      targetUserId = employee_id
      isAdminCreated = true
      
      // Verify the target employee belongs to the organization
      const supabase = await createClient()
      const { data: targetEmployee } = await supabase
        .from('profiles')
        .select('id, organization_id, team_id')
        .eq('id', employee_id)
        .eq('organization_id', organizationId)
        .single()

      if (!targetEmployee) {
        return NextResponse.json(
          { error: 'Employee not found or not in your organization' },
          { status: 400 }
        )
      }

      // If manager, verify they can manage this employee (same team)
      if (role === 'manager') {
        const { data: managerProfile } = await supabase
          .from('profiles')
          .select('team_id')
          .eq('id', user.id)
          .single()

        if (!managerProfile?.team_id || managerProfile.team_id !== targetEmployee.team_id) {
          return NextResponse.json(
            { error: 'You can only create absences for members of your team' },
            { status: 403 }
          )
        }
      }
    }

    // Calculate days if not provided (for admin-created requests)
    let calculatedDays = days_requested
    if (!calculatedDays) {
      const startDateObj = new Date(start_date)
      const endDateObj = new Date(end_date)
      const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime())
      calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    }

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

    // Check for overlapping requests (for the target user)
    // Fixed overlap logic: two periods overlap if:
    // (start1 <= end2) AND (end1 >= start2)
    const { data: overlappingRequests } = await supabase
      .from('leave_requests')
      .select('id, start_date, end_date, status')
      .eq('user_id', targetUserId)
      .eq('organization_id', organizationId)
      .in('status', ['pending', 'approved'])
      .lte('start_date', end_date)
      .gte('end_date', start_date)

    if (overlappingRequests && overlappingRequests.length > 0) {
      const employeeName = isAdminCreated ? 'Wybrany pracownik ma' : 'Masz'
      return NextResponse.json(
        { error: `${employeeName} już zaplanowany lub oczekujący urlop w tym terminie` },
        { status: 400 }
      )
    }

    // Determine status and reviewer
    const requestStatus = auto_approve && isAdminCreated ? 'approved' : 'pending'
    const reviewedBy = auto_approve && isAdminCreated ? user.id : null
    const reviewedAt = auto_approve && isAdminCreated ? new Date().toISOString() : null

    // Create leave request
    const { data: leaveRequest, error: createError } = await supabase
      .from('leave_requests')
      .insert({
        organization_id: organizationId,
        user_id: targetUserId,
        leave_type_id,
        start_date,
        end_date,
        days_requested: calculatedDays,
        reason: reason || notes || null,
        status: requestStatus,
        reviewed_by: reviewedBy,
        reviewed_at: reviewedAt
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

    // Send email notification
    try {
      const { notifyLeaveRequestStatusChange } = await import('@/lib/notification-utils')
      
      if (auto_approve && isAdminCreated) {
        // Notify employee that absence was added for them
        await notifyLeaveRequestStatusChange(leaveRequest.id, 'approved')
      } else {
        // Normal flow - notify managers about new request
        await notifyLeaveRequestStatusChange(leaveRequest.id, 'pending')
      }
    } catch (emailError) {
      console.error('Error sending email notification:', emailError)
      // Don't fail the request if email fails
    }

    const successMessage = isAdminCreated 
      ? 'Nieobecność została pomyślnie dodana'
      : 'Wniosek urlopowy został pomyślnie złożony'

    return NextResponse.json({
      success: true,
      leaveRequest,
      message: successMessage
    })

  } catch (error) {
    console.error('API Error creating leave request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 