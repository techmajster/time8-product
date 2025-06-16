import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { invitationId } = await request.json()

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
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
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to cancel invitations
    if (profile.role !== 'admin' && profile.role !== 'manager') {
      return NextResponse.json(
        { error: 'You do not have permission to cancel invitations' },
        { status: 403 }
      )
    }

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
    if (invitation.organization_id !== profile.organization_id) {
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