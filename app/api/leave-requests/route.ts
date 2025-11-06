import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { authenticateAndGetOrgContext, isManagerOrAdmin } from '@/lib/auth-utils-v2'

export async function GET(request: NextRequest) {
  try {
    // Authenticate and get organization context
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      return auth.error
    }

    const { context } = auth
    const { user, organization, role } = context
    const organizationId = organization.id
    // Use admin client to bypass RLS policies since we've already validated permissions
    const supabaseAdmin = createAdminClient()

    // Parse query parameters for pagination and filtering
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const tab = searchParams.get('tab') || 'wszystkie' // nowe, zaakceptowane, odrzucone, zrealizowane, wszystkie

    // Calculate pagination offsets
    const from = (page - 1) * limit
    const to = from + limit - 1

    // Build query based on role
    const canViewAll = isManagerOrAdmin(role)

    // Base query for count
    let countQuery = supabaseAdmin
      .from('leave_requests')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    // Base query for data
    let dataQuery = supabaseAdmin
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
          email,
          avatar_url
        ),
        reviewed_by_profile:profiles!leave_requests_reviewed_by_fkey (
          full_name,
          email
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(from, to)

    // If employee, only show their own requests
    if (!canViewAll) {
      countQuery = countQuery.eq('user_id', user.id)
      dataQuery = dataQuery.eq('user_id', user.id)
    }

    // Apply tab filtering
    switch (tab) {
      case 'nowe':
        countQuery = countQuery.eq('status', 'pending')
        dataQuery = dataQuery.eq('status', 'pending')
        break
      case 'zaakceptowane':
        countQuery = countQuery.eq('status', 'approved')
        dataQuery = dataQuery.eq('status', 'approved')
        break
      case 'odrzucone':
        countQuery = countQuery.eq('status', 'rejected')
        dataQuery = dataQuery.eq('status', 'rejected')
        break
      case 'zrealizowane':
        countQuery = countQuery.eq('status', 'completed')
        dataQuery = dataQuery.eq('status', 'completed')
        break
      case 'wszystkie':
      default:
        // No status filter for all requests
        break
    }

    // Execute queries in parallel
    const [{ data: leaveRequests, error: dataError }, { count, error: countError }] = await Promise.all([
      dataQuery,
      countQuery
    ])

    if (dataError) {
      console.error('Error fetching leave requests:', dataError)
      return NextResponse.json(
        { error: 'Failed to fetch leave requests' },
        { status: 500 }
      )
    }

    if (countError) {
      console.error('Error counting leave requests:', countError)
      return NextResponse.json(
        { error: 'Failed to count leave requests' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      leaveRequests,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

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
    const requestBody = await request.json()
    const { 
      leave_type_id, 
      start_date, 
      end_date, 
      days_requested, 
      reason, 
      notes,
      employee_id,
      auto_approve = false 
    } = requestBody

    console.log('🏖️ Leave request API called with:', { 
      leave_type_id, 
      start_date, 
      end_date, 
      days_requested, 
      employee_id,
      auto_approve,
      hasReason: !!reason 
    })

    if (!leave_type_id || !start_date || !end_date) {
      console.error('❌ Missing required fields:', { leave_type_id, start_date, end_date })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use optimized auth utility
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      console.error('❌ Authentication failed:', auth.error)
      return auth.error
    }
    const { context } = auth
    const { user, organization, role } = context
    const organizationId = organization.id

    console.log('✅ Authentication successful:', { userId: user.id, organizationId, role })

    // Handle admin-created requests
    let targetUserId = user.id
    let isAdminCreated = false

    if (employee_id && isManagerOrAdmin(role)) {
      // Admin/manager is creating request for another employee
      targetUserId = employee_id
      isAdminCreated = true
      
      // Use admin client to verify the target employee belongs to the organization
      const supabaseAdmin = createAdminClient()
      const { data: targetEmployeeOrg, error: targetError } = await supabaseAdmin
        .from('user_organizations')
        .select('user_id, organization_id, team_id')
        .eq('user_id', employee_id)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single()

      if (targetError || !targetEmployeeOrg) {
        console.error('Target employee verification error:', targetError)
        return NextResponse.json(
          { error: 'Employee not found or not in your organization' },
          { status: 400 }
        )
      }

      // If manager, verify they can manage this employee (same team)
      if (role === 'manager') {
        const { data: managerOrg, error: managerError } = await supabaseAdmin
          .from('user_organizations')
          .select('team_id')
          .eq('user_id', user.id)
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .single()

        if (managerError || !managerOrg?.team_id || managerOrg.team_id !== targetEmployeeOrg.team_id) {
          console.error('Manager team verification error:', managerError)
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
    const supabaseAdmin = createAdminClient()

    // Validate leave type belongs to organization using admin client
    console.log('🔍 Validating leave type:', { leave_type_id, organizationId })
    const { data: leaveType, error: leaveTypeError } = await supabaseAdmin
      .from('leave_types')
      .select('id, name')
      .eq('id', leave_type_id)
      .eq('organization_id', organizationId)
      .single()

    if (leaveTypeError || !leaveType) {
      console.error('❌ Leave type validation failed:', { leaveTypeError, leave_type_id, organizationId })
      return NextResponse.json(
        { error: 'Invalid leave type' },
        { status: 400 }
      )
    }

    console.log('✅ Leave type validated:', leaveType)

    // Check for overlapping requests (for the target user) using admin client
    // Fixed overlap logic: two periods overlap if:
    // (start1 <= end2) AND (end1 >= start2)
    console.log('🔍 Checking for overlapping requests:', { targetUserId, start_date, end_date })
    const { data: overlappingRequests, error: overlapError } = await supabaseAdmin
      .from('leave_requests')
      .select('id, start_date, end_date, status')
      .eq('user_id', targetUserId)
      .eq('organization_id', organizationId)
      .in('status', ['pending', 'approved'])
      .lte('start_date', end_date)
      .gte('end_date', start_date)

    if (overlapError) {
      console.error('❌ Error checking overlapping requests:', overlapError)
      return NextResponse.json(
        { error: 'Failed to validate request dates' },
        { status: 500 }
      )
    }

    if (overlappingRequests && overlappingRequests.length > 0) {
      console.log('❌ Found overlapping requests:', overlappingRequests)
      const employeeName = isAdminCreated ? 'Wybrany pracownik ma' : 'Masz'
      return NextResponse.json(
        { error: `${employeeName} już zaplanowany lub oczekujący urlop w tym terminie` },
        { status: 400 }
      )
    }

    console.log('✅ No overlapping requests found')

    // Determine status and reviewer
    // Auto-approve if:
    // 1. Admin creating request for another employee with auto_approve flag, OR
    // 2. Admin creating request for themselves (no one above them to approve)
    const isAdminSelfRequest = role === 'admin' && targetUserId === user.id
    const shouldAutoApprove = (auto_approve && isAdminCreated) || isAdminSelfRequest
    
    const requestStatus = shouldAutoApprove ? 'approved' : 'pending'
    const reviewedBy = shouldAutoApprove ? user.id : null
    const reviewedAt = shouldAutoApprove ? new Date().toISOString() : null

    console.log('📋 Request approval logic:', {
      role,
      isAdminCreated,
      isAdminSelfRequest,
      shouldAutoApprove,
      requestStatus,
      targetUserId,
      currentUserId: user.id
    })

    // Create leave request using admin client
    const leaveRequestData = {
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
    }

    console.log('🏖️ Creating leave request:', leaveRequestData)
    
    const { data: leaveRequest, error: createError } = await supabaseAdmin
      .from('leave_requests')
      .insert(leaveRequestData)
      .select()
      .single()

    if (createError) {
      console.error('❌ Error creating leave request:', createError)
      return NextResponse.json(
        { error: 'Failed to create leave request', details: createError.message },
        { status: 500 }
      )
    }

    console.log('✅ Leave request created successfully:', { id: leaveRequest.id, status: leaveRequest.status })

    // Send email notification
    try {
      const { notifyLeaveRequestStatusChange } = await import('@/lib/notification-utils')
      
      if (shouldAutoApprove) {
        // Notify about approved request (either admin-created for employee or admin self-request)
        await notifyLeaveRequestStatusChange(leaveRequest.id, 'approved')
      } else {
        // Normal flow - notify managers about new pending request
        await notifyLeaveRequestStatusChange(leaveRequest.id, 'pending')
      }
    } catch (emailError) {
      console.error('Error sending email notification:', emailError)
      // Don't fail the request if email fails
    }

    // Generate appropriate success message
    let successMessage = 'Wniosek urlopowy został pomyślnie złożony'
    
    if (isAdminCreated) {
      successMessage = 'Nieobecność została pomyślnie dodana'
    } else if (isAdminSelfRequest) {
      successMessage = 'Twój wniosek urlopowy został automatycznie zatwierdzony'
    } else if (shouldAutoApprove) {
      successMessage = 'Wniosek urlopowy został automatycznie zatwierdzony'
    }

    console.log('✅ Success message:', successMessage)

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