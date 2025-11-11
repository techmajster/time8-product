import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/permissions'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { invitationId: string } }
) {
  try {
    const { invitationId } = params

    // Validate invitation ID
    if (!invitationId || invitationId.trim() === '') {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    // Get current user from session
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Use admin client to fetch invitation details
    const supabaseAdmin = createAdminClient()

    const { data: invitations, error: invitationError } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('id', invitationId)

    if (invitationError) {
      console.error('[CancelInvitation] Query error:', invitationError)
      return NextResponse.json(
        { error: 'Failed to fetch invitation' },
        { status: 500 }
      )
    }

    if (!invitations || invitations.length === 0) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    const invitation = invitations[0]

    // Check if invitation is already cancelled or accepted
    if (invitation.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Invitation is already cancelled' },
        { status: 400 }
      )
    }

    if (invitation.status === 'accepted') {
      return NextResponse.json(
        { error: 'Cannot cancel accepted invitation' },
        { status: 400 }
      )
    }

    // Check if user is an admin of the organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', invitation.organization_id)
      .in('status', ['active', 'pending_removal'])
      .maybeSingle()

    if (userOrgError || !userOrg) {
      return NextResponse.json(
        { error: 'Not authorized to cancel this invitation' },
        { status: 403 }
      )
    }

    if (!isAdmin(userOrg.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Soft delete: Update status to cancelled
    const { data: updatedInvitation, error: updateError } = await supabaseAdmin
      .from('invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId)

    if (updateError) {
      console.error('[CancelInvitation] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to cancel invitation' },
        { status: 500 }
      )
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Invitation cancelled successfully'
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('[CancelInvitation] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
