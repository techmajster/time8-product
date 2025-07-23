import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendInvitationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { invitationId, email } = await request.json()

    if (!invitationId || !email) {
      return NextResponse.json(
        { error: 'Invitation ID and email are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile and verify admin/manager role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id, full_name, email')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'manager'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get invitation details
    const { data: invitation } = await supabase
      .from('invitations')
      .select(`
        id,
        email,
        role,
        token,
        invitation_code,
        organization_id,
        status,
        expires_at
      `)
      .eq('id', invitationId)
      .eq('organization_id', profile.organization_id)
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

      await supabase
        .from('invitations')
        .update({ expires_at: newExpiresAt.toISOString() })
        .eq('id', invitationId)
    }

    // Get organization details
    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', profile.organization_id)
      .single()

    // Send invitation email
    try {
      const emailResult = await sendInvitationEmail({
        to: invitation.email,
        organizationName: organization?.name || 'Your Organization',
        inviterName: profile.full_name || 'Administrator',
        inviterEmail: profile.email || 'admin@company.com',
        role: invitation.role,
        invitationToken: invitation.token,
        personalMessage: ''
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