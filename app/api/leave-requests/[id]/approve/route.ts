import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { handleLeaveRequestApproval } from '@/lib/leave-balance-utils'
import { authenticateAndGetOrgContext, isManagerOrAdmin } from '@/lib/auth-utils-v2'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { action, comment } = await request.json()
    const { id: requestId } = await params

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    // Use optimized auth utility
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) return auth.error
    const { context } = auth
    const { user, organization, role } = context
    const organizationId = organization.id

    // Check if user has permission to approve/reject
    if (!isManagerOrAdmin(role)) {
      return NextResponse.json(
        { error: 'You do not have permission to approve/reject leave requests' },
        { status: 403 }
      )
    }

    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    console.log('🔍 Approving leave request:', { requestId, action, userId: user.id, role })

    // Get the leave request to verify it belongs to the user's organization using admin client
    const { data: leaveRequest, error: fetchError } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        leave_types (
          name
        ),
        profiles!leave_requests_user_id_fkey (
          full_name,
          email
        )
      `)
      .eq('id', requestId)
      .single()

    if (fetchError || !leaveRequest) {
      console.error('❌ Leave request fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      )
    }

    console.log('✅ Leave request found:', { 
      id: leaveRequest.id, 
      status: leaveRequest.status, 
      userId: leaveRequest.user_id,
      organizationId: leaveRequest.organization_id
    })

    // Verify the request belongs to the user's organization
    if (leaveRequest.organization_id !== organizationId) {
      return NextResponse.json(
        { error: 'You can only manage requests from your organization' },
        { status: 403 }
      )
    }

    // Check if request is still pending
    if (leaveRequest.status !== 'pending') {
      console.log('❌ Request not pending:', { currentStatus: leaveRequest.status, action })
      return NextResponse.json(
        { error: `Cannot ${action} request - status is already ${leaveRequest.status}` },
        { status: 400 }
      )
    }

    // Update the leave request using admin client
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    const updateData = {
      status: newStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_comment: comment || null
    }

    console.log('🔄 Updating leave request:', { requestId, updateData })

    const { error: updateError } = await supabaseAdmin
      .from('leave_requests')
      .update(updateData)
      .eq('id', requestId)

    if (updateError) {
      console.error('❌ Error updating leave request:', updateError)
      return NextResponse.json(
        { error: 'Failed to update leave request', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('✅ Leave request updated successfully:', { requestId, newStatus })

    // If approved, update leave balances
    if (action === 'approve') {
      try {
        console.log('💰 Updating leave balance:', {
          userId: leaveRequest.user_id,
          leaveTypeId: leaveRequest.leave_type_id,
          daysRequested: leaveRequest.days_requested,
          organizationId: leaveRequest.organization_id
        })

        await handleLeaveRequestApproval(
          leaveRequest.user_id,
          leaveRequest.leave_type_id,
          leaveRequest.days_requested,
          leaveRequest.organization_id
        )

        console.log('✅ Leave balance updated successfully')
      } catch (balanceError) {
        console.error('❌ Error updating leave balance:', balanceError)
        // Note: We don't rollback the approval here, but log the error
        // In a production system, you might want to use a transaction
      }
    }

    // Send email notification about the status change
    try {
      console.log('📧 Sending notification email for status change:', { requestId, newStatus })
      const { notifyLeaveRequestStatusChange } = await import('@/lib/notification-utils')
      await notifyLeaveRequestStatusChange(requestId, newStatus)
      console.log('✅ Notification email sent successfully')
    } catch (emailError) {
      console.error('⚠️ Error sending email notification:', emailError)
      // Don't fail the request if email fails
    }

    const actionText = action === 'approve' ? 'zatwierdzony' : 'odrzucony'
    const message = `Wniosek urlopowy został ${actionText}`

    console.log('🎉 Leave request processing completed:', { requestId, action, message })

    return NextResponse.json({
      success: true,
      message,
      status: newStatus
    })

  } catch (error) {
    console.error('API Error updating leave request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 