import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { to } = await request.json()
    
    if (!to) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    // Check if email service is configured
    const hasEmailConfig = process.env.RESEND_API_KEY && process.env.FROM_EMAIL

    if (!hasEmailConfig) {
      return NextResponse.json(
        { error: 'Email service not configured. Missing RESEND_API_KEY or FROM_EMAIL.' },
        { status: 500 }
      )
    }

    // Dynamically import email functions
    const { sendTestEmail } = await import('@/lib/email')
    
    // Send test email
    const result = await sendTestEmail({
      to,
      subject: 'Test Email from Leave System',
      content: `
        <h2>Email Configuration Test</h2>
        <p>Congratulations! Your email service is working correctly.</p>
        <p>This test email was sent from your Leave Management System.</p>
        <p><strong>Resend API Key:</strong> ✅ Configured</p>
        <p><strong>FROM_EMAIL:</strong> ✅ ${process.env.FROM_EMAIL}</p>
        <hr>
        <p><small>If you received this email, your invitation system should now work perfectly!</small></p>
      `
    })

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Test email sent successfully!',
        messageId: result.messageId,
        config: {
          hasResendKey: !!process.env.RESEND_API_KEY,
          fromEmail: process.env.FROM_EMAIL
        }
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to send email: ' + result.error },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
} 