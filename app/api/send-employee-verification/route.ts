import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      email,
      full_name,
      organization_name,
      temp_password,
      personal_message 
    } = body

    // Validate required fields
    if (!email || !full_name || !organization_name || !temp_password) {
      return NextResponse.json(
        { error: 'Missing required fields: email, full_name, organization_name, temp_password' },
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

    try {
      // Dynamically import email functions only when needed
      const { sendEmployeeVerificationEmail } = await import('@/lib/email')
      
      // Send employee verification email with credentials
      const result = await sendEmployeeVerificationEmail({
        to: email,
        full_name,
        organization_name,
        temp_password,
        personal_message
      })

      if (result.error) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Verification email sent to ${email}`,
        messageId: result.messageId
      })

    } catch (emailError) {
      console.error('Error sending verification email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Employee verification email API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 