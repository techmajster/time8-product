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
    
    // Check if user has permission to resend invitations
    const roleCheck = requireRole({ role } as any, ['admin', 'manager'])
    if (roleCheck) {
      return roleCheck
    }

    // Get full profile for email info
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    // Get the invitation to verify it belongs to the user's organization
    const { data: invitation } = await supabase
      .from('invitations')
      .select(`
        id, 
        organization_id, 
        status, 
        email, 
        role, 
        personal_message,
        organizations (name)
      `)
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
        { error: 'You can only resend invitations from your organization' },
        { status: 403 }
      )
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot resend invitation - status is already ${invitation.status}` },
        { status: 400 }
      )
    }

    // Generate a new invitation token (same method as invitation creation)
    const newToken = btoa(Math.random().toString(36).substring(2) + Date.now().toString(36))
    const newExpiresAt = new Date()
    newExpiresAt.setDate(newExpiresAt.getDate() + 7) // 7 days from now

    // Update the invitation with new token, expiry date, and reset invitation code to generate a new one
    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        token: newToken,
        expires_at: newExpiresAt.toISOString(),
        created_at: new Date().toISOString(), // Update created_at to reflect resend time
        invitation_code: null // Reset to null so trigger generates a new code
      })
      .eq('id', invitationId)

    if (updateError) {
      console.error('Error updating invitation:', updateError)
      return NextResponse.json(
        { error: 'Failed to update invitation' },
        { status: 500 }
      )
    }

    // Send the invitation email
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: invitation.email,
          organizationName: (invitation.organizations as any)?.name || 'Unknown Organization',
          inviterName: profile?.full_name || profile?.email || 'Unknown',
          inviterEmail: profile?.email || '',
          role: invitation.role,
          invitationToken: newToken,
          personalMessage: invitation.personal_message
        })
      })

      const emailResult = await response.json()

      if (response.ok && emailResult.success) {
        return NextResponse.json({
          success: true,
          message: `Invitation successfully resent to ${invitation.email}`
        })
      } else {
        // Even if email fails, the invitation was updated, so consider it a partial success
        return NextResponse.json({
          success: true,
          message: `Invitation updated but email may not have been sent: ${emailResult.error || 'Unknown email error'}`
        })
      }
    } catch (emailError) {
      console.error('Error sending resend invitation email:', emailError)
      return NextResponse.json({
        success: true,
        message: `Invitation updated but email failed to send. Please try again or contact the user directly.`
      })
    }

  } catch (error) {
    console.error('API Error resending invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 