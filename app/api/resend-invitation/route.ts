import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendInvitationEmail } from '@/lib/email'
import { authenticateAndGetOrgContext, requireRole } from '@/lib/auth-utils-v2'

export async function POST(request: NextRequest) {
  try {
    const { invitationId, email } = await request.json()

    if (!invitationId || !email) {
      return NextResponse.json(
        { error: 'Invitation ID and email are required' },
        { status: 400 }
      )
    }

    // Authenticate and check permissions
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      return auth.error
    }

    const { context } = auth
    const { user, profile, organization, role } = context
    const organizationId = organization.id
    
    // Check if user has permission to resend invitations
    const roleCheck = requireRole({ role } as any, ['admin', 'manager'])
    if (roleCheck) {
      return roleCheck
    }

    const supabaseAdmin = createAdminClient()

    // Get invitation details
    const { data: invitation } = await supabaseAdmin
      .from('invitations')
      .select(`
        id,
        email,
        role,
        token,
        invitation_code,
        organization_id,
        status,
        expires_at,
        personal_message
      `)
      .eq('id', invitationId)
      .eq('organization_id', organizationId)
      .single()

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invitation is no longer pending' },
        { status: 400 }
      )
    }

    // Check if invitation is expired
    const isExpired = new Date(invitation.expires_at) < new Date()
    if (isExpired) {
      // Update expiration date to 7 days from now
      const newExpiresAt = new Date()
      newExpiresAt.setDate(newExpiresAt.getDate() + 7)

      await supabaseAdmin
        .from('invitations')
        .update({ expires_at: newExpiresAt.toISOString() })
        .eq('id', invitationId)
    }

    // Send invitation email using the correct invitation_code
    try {
      console.log(`📧 Resending invitation email to ${invitation.email} with code ${invitation.invitation_code}`)
      
      const emailResult = await sendInvitationEmail({
        to: invitation.email,
        organizationName: organization.name,
        inviterName: profile.full_name || user.email.split('@')[0],
        inviterEmail: user.email,
        role: invitation.role,
        invitationToken: invitation.invitation_code, // Use invitation_code, not token
        personalMessage: invitation.personal_message || ''
      })

      if (!emailResult.success) {
        console.error('Failed to resend invitation email:', emailResult.error)
        return NextResponse.json(
          { error: 'Failed to send invitation email' },
          { status: 500 }
        )
      }

      console.log('✅ Invitation email resent successfully:', emailResult.messageId)

      return NextResponse.json({
        success: true,
        message: 'Invitation resent successfully',
        messageId: emailResult.messageId
      })

    } catch (emailError) {
      console.error('Error sending invitation email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send invitation email' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Resend invitation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 