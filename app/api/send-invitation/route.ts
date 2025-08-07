import { NextRequest, NextResponse } from 'next/server'
import { getOnboardingUrl } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 /api/send-invitation called')
    const body = await request.json()
    const { 
      email,
      invitationCode,
      personalMessage 
    } = body

    console.log('📧 Send invitation request:', { email, invitationCode, hasPersonalMessage: !!personalMessage })

    // Validate required fields
    if (!email || !invitationCode) {
      console.error('❌ Missing required fields:', { email: !!email, invitationCode: !!invitationCode })
      return NextResponse.json(
        { error: 'Missing required fields: email and invitationCode' },
        { status: 400 }
      )
    }

    // Check if email service is configured
    const hasEmailConfig = process.env.RESEND_API_KEY && process.env.FROM_EMAIL

    if (!hasEmailConfig) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 503 }
      )
    }

    // Get dynamic onboarding URL
    const onboardingUrl = getOnboardingUrl(request)

    // Send proper invitation email using the correct email function
    try {
      console.log('📧 About to import and call sendInvitationEmail...')
      // Dynamically import email functions only when needed
      const { sendInvitationEmail } = await import('@/lib/email')
      
      // Get invitation details from database to populate proper email data
      const emailData = {
        to: email,
        organizationName: 'Your Organization', // Should be fetched from database in future
        inviterName: 'Administrator', // Should be fetched from user session in future
        inviterEmail: process.env.FROM_EMAIL || 'noreply@time8.io',
        role: 'Employee', // Should be fetched from invitation in future
        invitationToken: invitationCode,
        personalMessage: personalMessage
      }
      
      console.log('📧 Calling sendInvitationEmail with data:', emailData)
      const result = await sendInvitationEmail(emailData)

      /* OLD TEST EMAIL TEMPLATE - REPLACED WITH PROPER INVITATION
      const result = await sendTestEmail({
        to: email,
        subject: 'Zaproszenie do zespołu Time8',
        content: `
      */

      console.log('📧 sendInvitationEmail result:', result)
      
      if (result.success) {
        console.log('✅ Email sent successfully! MessageId:', result.messageId)
        return NextResponse.json({ 
          success: true, 
          message: 'Invitation email sent successfully',
          messageId: result.messageId 
        })
      } else {
        console.error('❌ Email sending failed:', result.error)
        return NextResponse.json(
          { error: 'Failed to send email: ' + result.error },
          { status: 500 }
        )
      }
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send invitation email' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('API Error sending invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 