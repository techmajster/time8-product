import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleLeaveRequestEdit, handleLeaveRequestCancellation } from '@/lib/leave-balance-utils'
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { leave_type_id, start_date, end_date, days_requested, reason } = await request.json()
    const { id: requestId } = await params

    if (!leave_type_id || !start_date || !end_date || !days_requested) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use optimized auth utility
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) return auth.error
    const { context } = auth
    const { user, organization, role } = context
    const organizationId = organization.id
    const isManager = role === 'admin' || role === 'manager'

    const supabase = await createClient()

    // Get the existing leave request (allow admins/managers to edit any request in their org)
    const { data: existingRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', requestId)
      .eq('organization_id', organizationId)
      .single()

    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { error: 'Leave request not found or access denied' },
        { status: 404 }
      )
    }

    // Permission check: user must own the request OR be an admin/manager
    const isOwnRequest = existingRequest.user_id === user.id
    if (!isOwnRequest && !isManager) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this leave request' },
        { status: 403 }
      )
    }

    // Check if request can be edited (not cancelled)
    if (existingRequest.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot edit cancelled leave request' },
        { status: 400 }
      )
    }

    // Don't allow editing if the leave period has already started
    const today = new Date()
    const startDate = new Date(existingRequest.start_date)
    
    if (today >= startDate) {
      return NextResponse.json(
        { error: 'Cannot edit leave request - the leave period has already started' },
        { status: 400 }
      )
    }

    try {
      // Handle the edit with balance adjustments
      await handleLeaveRequestEdit(
        existingRequest.user_id,
        existingRequest.leave_type_id,
        existingRequest.days_requested,
        leave_type_id,
        days_requested,
        organizationId,
        existingRequest.status
      )

      // Update the leave request itself
      const updateData: Record<string, string | number | null> = {
        leave_type_id,
        start_date,
        end_date,
        days_requested,
        reason: reason || null,
        updated_at: new Date().toISOString()
      }

      // Add audit trail when admin/manager edits another user's request
      if (!isOwnRequest && isManager) {
        updateData.edited_by = user.id
        updateData.edited_at = new Date().toISOString()
      }

      // Handle status changes based on who is editing
      if (isManager) {
        // Admin/manager edits: keep current status (approved stays approved, pending stays pending)
        // No status change needed - admin edits preserve the status
      } else if (isOwnRequest) {
        // Employee editing their own request
        // If previously rejected, reset to pending for re-review
        if (existingRequest.status === 'rejected') {
          updateData.status = 'pending'
          updateData.reviewed_by = null
          updateData.reviewed_at = null
          updateData.review_comment = null
        }
        // If approved, this shouldn't happen (blocked by start date check above)
        // If pending, status stays pending
      }

      const { error: updateError } = await supabase
        .from('leave_requests')
        .update(updateData)
        .eq('id', requestId)

      if (updateError) {
        throw updateError
      }

      const message = `Leave request has been ${updateData.status === 'pending' ? 'zaktualizowany i wymaga ponownego zatwierdzenia' : 'zaktualizowany'}`

      return NextResponse.json({
        success: true,
        message
      })

    } catch (error) {
      console.error('Error in handleLeaveRequestEdit:', error)
      return NextResponse.json(
        { error: 'Failed to update leave request' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('API Error updating leave request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params

    // Use optimized auth utility
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) return auth.error
    const { context } = auth
    const { user, organization, role } = context
    const organizationId = organization.id
    const isManager = role === 'admin' || role === 'manager'

    const supabase = await createClient()

    // Get the leave request to verify ownership and status
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', requestId)
      .eq('organization_id', organizationId)
      .single()

    if (fetchError || !leaveRequest) {
      return NextResponse.json(
        { error: 'Leave request not found or access denied' },
        { status: 404 }
      )
    }

    // Check permissions based on role
    const isOwnRequest = leaveRequest.user_id === user.id

    if (isManager) {
      // Managers/admins can delete pending or approved requests from any user (even after started)
      if (!['pending', 'approved'].includes(leaveRequest.status)) {
        return NextResponse.json(
          { error: 'Only pending or approved leave requests can be deleted' },
          { status: 400 }
        )
      }

      // Store the status for balance restoration
      const previousStatus = leaveRequest.status

      // Delete the request
      const { error: deleteError } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', requestId)

      if (deleteError) {
        console.error('Error deleting leave request:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete leave request' },
          { status: 500 }
        )
      }

      // Handle balance restoration if the request was approved
      if (previousStatus === 'approved') {
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
          // Note: Request is already deleted, but balance restoration failed
          // In production, consider using a transaction or a background job
        }
      }

      const message = previousStatus === 'approved'
        ? 'Wniosek urlopowy został usunięty. Dni urlopowe zostały przywrócone do salda pracownika.'
        : 'Wniosek urlopowy został usunięty'

      return NextResponse.json({
        success: true,
        message
      })

    } else {
      // Regular users can only delete their own cancelled requests
      if (!isOwnRequest) {
        return NextResponse.json(
          { error: 'You can only delete your own leave requests' },
          { status: 403 }
        )
      }

      // Only allow deletion of cancelled requests
      if (leaveRequest.status !== 'cancelled') {
        return NextResponse.json(
          { error: 'Only cancelled leave requests can be deleted' },
          { status: 400 }
        )
      }

      // Delete the leave request
      const { data: deletedData, error: deleteError } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', requestId)
        .eq('user_id', user.id) // Extra safety check
        .select()

      if (deleteError) {
        console.error('Error deleting leave request:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete leave request: ' + deleteError.message },
          { status: 500 }
        )
      }

      // Check if any records were actually deleted
      if (!deletedData || deletedData.length === 0) {
        return NextResponse.json(
          { error: 'No leave request was deleted - request may not exist or you may not have permission' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Leave request deleted successfully',
        deletedCount: deletedData.length
      })
    }

  } catch (error) {
    console.error('API Error deleting leave request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 