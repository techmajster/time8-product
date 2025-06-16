import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleLeaveRequestEdit } from '@/lib/leave-balance-utils'

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

    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Get the existing leave request to verify ownership
    const { data: existingRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', requestId)
      .eq('user_id', user.id) // Only allow users to edit their own requests
      .eq('organization_id', profile.organization_id)
      .single()

    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { error: 'Leave request not found or access denied' },
        { status: 404 }
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
        profile.organization_id,
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

      // If the request was previously approved or rejected, reset to pending for re-approval
      if (existingRequest.status === 'approved' || existingRequest.status === 'rejected') {
        updateData.status = 'pending'
        updateData.reviewed_by = null
        updateData.reviewed_at = null
        updateData.review_comment = null
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
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Get the leave request to verify ownership and status
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', requestId)
      .eq('user_id', user.id) // Only allow users to delete their own requests
      .eq('organization_id', profile.organization_id)
      .single()

    if (fetchError || !leaveRequest) {
      return NextResponse.json(
        { error: 'Leave request not found or access denied' },
        { status: 404 }
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

  } catch (error) {
    console.error('API Error deleting leave request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 