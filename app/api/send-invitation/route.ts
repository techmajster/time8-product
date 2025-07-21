import { NextRequest, NextResponse } from 'next/server'
import { getOnboardingUrl } from '@/lib/utils'

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

    // Get dynamic onboarding URL
    const onboardingUrl = getOnboardingUrl(request)

    // For now, send a simple invitation email
    // Note: This is a simplified version that only sends the invitation code
    // The full invitation system would need to be updated to handle team assignments
    try {
      // Dynamically import email functions only when needed
      const { sendTestEmail } = await import('@/lib/email')
      
      // Send invitation email with invitation code
      const result = await sendTestEmail({
        to: email,
        subject: 'Zaproszenie do zespołu Time8',
        content: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px 20px; border-radius: 12px 12px 0 0; text-align: center;">
              <h2 style="margin: 0; font-size: 28px; font-weight: 700;">🎉 Zaproszenie do Time8</h2>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">Nowoczesne zarządzanie czasem pracy i urlopami</p>
            </div>
            
            <div style="background: white; padding: 40px 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
              <p>Zostałeś zaproszony do dołączenia do zespołu w systemie <strong>Time8</strong>!</p>
              
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <h3 style="margin-top: 0; color: #1f2937;">Twój kod zaproszenia:</h3>
                <p style="font-size: 24px; font-weight: bold; color: #3b82f6; letter-spacing: 2px; font-family: monospace;">${invitationCode}</p>
              </div>
              
              ${personalMessage ? `
                <div style="background: #f0f9ff; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;">
                  <p style="margin: 0; font-style: italic; color: #1e40af;"><strong>Wiadomość:</strong> "${personalMessage}"</p>
                </div>
              ` : ''}
              
              <div style="margin: 30px 0;">
                <h4 style="color: #1f2937;">Jak dołączyć:</h4>
                <ol style="color: #4b5563; line-height: 1.8;">
                  <li>Przejdź do <a href="${onboardingUrl}" style="color: #3b82f6;">systemu Time8</a></li>
                  <li>Utwórz konto lub zaloguj się</li>
                  <li>Użyj kodu zaproszenia: <strong>${invitationCode}</strong></li>
                  <li>Dołącz do zespołu i zacznij zarządzać swoim czasem!</li>
                </ol>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${onboardingUrl}" 
                   style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                  Dołącz do Time8
                </a>
              </div>
              
              <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e;"><strong>⏰ Ważne:</strong> To zaproszenie wygasa za 7 dni.</p>
              </div>
            </div>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; color: #6b7280; font-size: 14px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
              <div style="color: #3b82f6; font-size: 18px; font-weight: 700; margin-bottom: 8px;">Time8</div>
              <p style="margin: 4px 0;">Nowoczesne zarządzanie czasem pracy i urlopami</p>
              <p style="margin: 4px 0; font-size: 12px;">
                Jeśli masz pytania, skontaktuj się z administratorem systemu.
              </p>
            </div>
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