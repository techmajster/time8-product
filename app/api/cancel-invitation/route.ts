import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBasicAuth, requireRole } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const { invitationId } = await request.json()

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    // Authenticate and check permissions
    const auth = await getBasicAuth()
    if (!auth.success) {
      return auth.error
    }

    const { user, organizationId, role } = auth
    
    // Check if user has permission to cancel invitations
    const roleCheck = requireRole({ role } as any, ['admin', 'manager'])
    if (roleCheck) {
      return roleCheck
    }

    const supabase = await createClient()

    // Get the invitation to verify it belongs to the user's organization
    const { data: invitation } = await supabase
      .from('invitations')
      .select('id, organization_id, status, email')
      .eq('id', invitationId)
      .single()

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Verify the invitation belongs to the user's organization
    if (invitation.organization_id !== organizationId) {
      return NextResponse.json(
        { error: 'You can only cancel invitations from your organization' },
        { status: 403 }
      )
    }

    // Check if invitation is already cancelled or accepted
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot cancel invitation - status is already ${invitation.status}` },
        { status: 400 }
      )
    }

    // Delete the invitation from the database
    const { error: deleteError } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId)

    if (deleteError) {
      console.error('Error deleting invitation:', deleteError)
      return NextResponse.json(
        { error: 'Failed to cancel invitation' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Invitation to ${invitation.email} has been cancelled and removed`
    })

  } catch (error) {
    console.error('API Error cancelling invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 