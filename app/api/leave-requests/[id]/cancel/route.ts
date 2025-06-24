import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleLeaveRequestCancellation } from '@/lib/leave-balance-utils'
import { getBasicAuth } from '@/lib/auth-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { comment } = await request.json()
    const { id: requestId } = await params

    // Use optimized auth utility
    const auth = await getBasicAuth()
    if (!auth.success) return auth.error
    const { user, organizationId } = auth

    const supabase = await createClient()

    // Get the leave request to verify ownership and status
    const { data: leaveRequest, error: fetchError } = await supabase
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
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      )
    }

    // Verify the request belongs to the user's organization
    if (leaveRequest.organization_id !== organizationId) {
      return NextResponse.json(
        { error: 'You can only manage requests from your organization' },
        { status: 403 }
      )
    }

    // Check if user owns the request (only users can cancel their own requests)
    if (leaveRequest.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only cancel your own leave requests' },
        { status: 403 }
      )
    }

    // Check if request can be cancelled
    if (leaveRequest.status === 'cancelled') {
      return NextResponse.json(
        { error: 'This leave request is already cancelled' },
        { status: 400 }
      )
    }

    // Don't allow cancellation if the leave period has already started
    const today = new Date()
    const startDate = new Date(leaveRequest.start_date)
    
    if (today >= startDate) {
      return NextResponse.json(
        { error: 'Cannot cancel leave request - the leave period has already started' },
        { status: 400 }
      )
    }

    // Store the previous status for balance handling
    const previousStatus = leaveRequest.status

    // Update the leave request to cancelled status
    const { error: updateError } = await supabase
      .from('leave_requests')
      .update({
        status: 'cancelled',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_comment: comment || 'Cancelled by employee'
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Error cancelling leave request:', updateError)
      return NextResponse.json(
        { error: 'Failed to cancel leave request' },
        { status: 500 }
      )
    }

    // Handle balance restoration if the request was previously approved
    try {
      await handleLeaveRequestCancellation(
        leaveRequest.user_id,
        leaveRequest.leave_type_id,
        leaveRequest.days_requested,
        leaveRequest.organization_id,
        previousStatus
      )
    } catch (balanceError) {
      console.error('Error restoring leave balance:', balanceError)
      // Note: We don't rollback the cancellation here, but log the error
      // In a production system, you might want to use a transaction
    }

    const message = previousStatus === 'approved' 
      ? 'Wniosek urlopowy został anulowany. Dni urlopowe zostały przywrócone do Twojego salda.'
      : 'Wniosek urlopowy został anulowany'

    return NextResponse.json({
      success: true,
      message,
      status: 'cancelled'
    })

  } catch (error) {
    console.error('API Error cancelling leave request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 