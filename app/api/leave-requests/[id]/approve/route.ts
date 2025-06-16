import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleLeaveRequestApproval } from '@/lib/leave-balance-utils'

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

    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get user profile to check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role, full_name, email')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to approve/reject
    if (profile.role !== 'admin' && profile.role !== 'manager') {
      return NextResponse.json(
        { error: 'You do not have permission to approve/reject leave requests' },
        { status: 403 }
      )
    }

    // Get the leave request to verify it belongs to the user's organization
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
    if (leaveRequest.organization_id !== profile.organization_id) {
      return NextResponse.json(
        { error: 'You can only manage requests from your organization' },
        { status: 403 }
      )
    }

    // Check if request is still pending
    if (leaveRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot ${action} request - status is already ${leaveRequest.status}` },
        { status: 400 }
      )
    }

    // Update the leave request
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    const { error: updateError } = await supabase
      .from('leave_requests')
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_comment: comment || null
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Error updating leave request:', updateError)
      return NextResponse.json(
        { error: 'Failed to update leave request' },
        { status: 500 }
      )
    }

    // If approved, update leave balances
    if (action === 'approve') {
      try {
        await handleLeaveRequestApproval(
          leaveRequest.user_id,
          leaveRequest.leave_type_id,
          leaveRequest.days_requested,
          leaveRequest.organization_id
        )
      } catch (balanceError) {
        console.error('Error updating leave balance:', balanceError)
        // Note: We don't rollback the approval here, but log the error
        // In a production system, you might want to use a transaction
      }
    }

    const actionText = action === 'approve' ? 'zatwierdzony' : 'odrzucony'
    const message = `Wniosek urlopowy został ${actionText}`

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