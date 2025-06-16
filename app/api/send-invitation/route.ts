import { NextRequest, NextResponse } from 'next/server'
import { sendInvitationEmail, createInvitationEmailContent } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      to, 
      organizationName, 
      inviterName, 
      inviterEmail, 
      role, 
      invitationToken, 
      personalMessage 
    } = body

    // Validate required fields
    if (!to || !organizationName || !inviterName || !inviterEmail || !role || !invitationToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if email service is configured
    const hasEmailConfig = process.env.RESEND_API_KEY && process.env.FROM_EMAIL

    if (hasEmailConfig) {
      // Send actual email
      const result = await sendInvitationEmail({
        to,
        organizationName,
        inviterName,
        inviterEmail,
        role,
        invitationToken,
        personalMessage
      })

      if (result.success) {
        return NextResponse.json({ 
          success: true, 
          message: 'Invitation email sent successfully',
          messageId: result.messageId 
        })
      } else {
        return NextResponse.json(
          { error: 'Failed to send email: ' + result.error },
          { status: 500 }
        )
      }
    } else {
      // Email service not configured - return invitation link for manual sharing
      const emailContent = createInvitationEmailContent({
        to,
        organizationName,
        inviterName,
        inviterEmail,
        role,
        invitationToken,
        personalMessage
      })

      return NextResponse.json({
        success: false,
        message: 'Email service not configured',
        invitationUrl: emailContent.invitationUrl,
        emailContent: emailContent.content
      })
    }

  } catch (error) {
    console.error('API Error sending invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 