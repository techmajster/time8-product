import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      email,
      invitationCode,
      personalMessage 
    } = body

    // Validate required fields
    if (!email || !invitationCode) {
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

    // For now, send a simple invitation email
    // Note: This is a simplified version that only sends the invitation code
    // The full invitation system would need to be updated to handle team assignments
    try {
      // Dynamically import email functions only when needed
      const { sendTestEmail } = await import('@/lib/email')
      
      // Send invitation email with invitation code
      const result = await sendTestEmail({
        to: email,
        subject: 'Zaproszenie do zespołu',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>🎉 Zaproszenie do dołączenia do zespołu</h2>
            <p>Zostałeś zaproszony do dołączenia do organizacji w systemie zarządzania urlopami.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Twój kod zaproszenia:</h3>
              <p style="font-size: 24px; font-weight: bold; color: #2563eb; letter-spacing: 2px;">${invitationCode}</p>
            </div>
            
            ${personalMessage ? `
              <div style="background: #f0f9ff; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
                <p><strong>Wiadomość:</strong></p>
                <p style="font-style: italic;">"${personalMessage}"</p>
              </div>
            ` : ''}
            
            <p>Aby zaakceptować zaproszenie:</p>
            <ol>
              <li>Przejdź do systemu logowania</li>
              <li>Utwórz konto lub zaloguj się</li>
              <li>Użyj kodu zaproszenia: <strong>${invitationCode}</strong></li>
            </ol>
            
            <p><strong>⏰ To zaproszenie wygasa za 7 dni.</strong></p>
            
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 14px;">System zarządzania urlopami</p>
          </div>
        `
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