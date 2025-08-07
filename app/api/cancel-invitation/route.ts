import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { authenticateAndGetOrgContext, requireRole } from '@/lib/auth-utils-v2'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Cancel invitation API called')
    const { invitationId } = await request.json()
    console.log('📋 Request payload:', { invitationId })

    if (!invitationId) {
      console.error('❌ Missing invitation ID')
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    // Authenticate and check permissions
    console.log('🔐 Authenticating user...')
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      console.error('❌ Authentication failed:', auth.error)
      return auth.error
    }

    const { context } = auth
    const { user, organization, role } = context
    const organizationId = organization.id
    
    console.log('✅ Authenticated:', { userId: user.id, organizationId, role })
    
    // Check if user has permission to cancel invitations
    const roleCheck = requireRole({ role } as any, ['admin', 'manager'])
    if (roleCheck) {
      console.error('❌ Insufficient permissions:', { role })
      return roleCheck
    }

    const supabaseAdmin = createAdminClient()

    // Get the invitation to verify it belongs to the user's organization
    const { data: invitation } = await supabaseAdmin
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
    console.log(`🗑️ Cancelling invitation ${invitationId} for ${invitation.email}`)
    
    const { error: deleteError } = await supabaseAdmin
      .from('invitations')
      .delete()
      .eq('id', invitationId)

    if (deleteError) {
      console.error('❌ Error deleting invitation:', deleteError)
      return NextResponse.json(
        { error: 'Failed to cancel invitation' },
        { status: 500 }
      )
    }

    console.log(`✅ Invitation to ${invitation.email} cancelled successfully`)
    
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