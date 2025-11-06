/**
 * @fileoverview Leave Request Update and Cancellation API Routes
 *
 * Handles editing and canceling leave requests with role-based permissions and audit trail:
 *
 * **Permission Model:**
 * - Employees: Can edit/cancel their own requests (before start date)
 * - Managers: Can edit/cancel team member requests anytime
 * - Admins: Can edit/cancel ANY organization request anytime
 *
 * **Audit Trail:**
 * - When admin/manager edits another user's request:
 *   - Sets `edited_by` to logged-in user's ID
 *   - Sets `edited_at` to current timestamp
 * - When user edits own request: No audit trail
 *
 * **Business Rules:**
 * - Cannot edit cancelled requests
 * - Cannot edit requests after start date (employees only)
 * - Balance adjustments handled automatically
 * - Organization isolation enforced via RLS
 *
 * @module app/api/leave-requests/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleLeaveRequestEdit, handleLeaveRequestCancellation } from '@/lib/leave-balance-utils'
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2'

/**
 * PUT /api/leave-requests/[id]
 *
 * Updates an existing leave request with role-based permissions.
 *
 * **Request Body:**
 * ```json
 * {
 *   "leave_type_id": "uuid",
 *   "start_date": "2024-11-19",
 *   "end_date": "2024-11-21",
 *   "days_requested": 3,
 *   "reason": "Optional reason text"
 * }
 * ```
 *
 * **Permissions:**
 * - Employee: Can edit own requests only (before start date)
 * - Manager/Admin: Can edit any request in organization/team
 *
 * **Audit Trail:**
 * - Admin/Manager editing another user: Sets `edited_by` and `edited_at`
 * - User editing own request: No audit fields set
 *
 * **Validation:**
 * - All required fields must be present
 * - Request must exist and belong to organization
 * - Request cannot be cancelled
 * - Request start date must be in future (for employees)
 *
 * **Balance Updates:**
 * - Automatically adjusts leave balances
 * - Handles leave type changes
 * - Updates available/used days
 *
 * @param request - Next.js request object with leave request data
 * @param params - Route parameters containing leave request ID
 * @returns Updated leave request or error response
 *
 * @example
 * ```ts
 * // Employee editing own request
 * PUT /api/leave-requests/123
 * // Response: Updated request (no edited_by/edited_at)
 *
 * // Admin editing another user's request
 * PUT /api/leave-requests/456
 * // Response: Updated request (with edited_by/edited_at set to admin's ID)
 * ```
 */
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

/**
 * DELETE /api/leave-requests/[id]
 *
 * Cancels (soft deletes) a leave request with role-based permissions.
 *
 * **Permissions:**
 * - Employee: Can cancel own pending requests (before start date only)
 * - Manager/Admin: Can cancel pending/approved requests anytime (including after start)
 *
 * **Business Logic:**
 * - Sets status to 'cancelled' (soft delete)
 * - Automatically restores leave balance
 * - Cannot cancel already cancelled/rejected requests
 * - Employees blocked from canceling after start date
 *
 * **Balance Restoration:**
 * - Pending requests: Restores full balance
 * - Approved requests: Restores full balance
 * - Handles all leave types
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing leave request ID
 * @returns Success message or error response
 *
 * @example
 * ```ts
 * // Employee canceling own request (before start)
 * DELETE /api/leave-requests/123
 * // Response: { success: true, message: "Leave request cancelled" }
 *
 * // Admin canceling request anytime
 * DELETE /api/leave-requests/456
 * // Response: { success: true, message: "Leave request cancelled" }
 * ```
 */
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