import { NextRequest, NextResponse } from 'next/server'

// Import the email template function (we'll extract just the template part)
const getEmailTemplate = (content: string) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: hsl(267 85% 60%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
      .content { background: white; padding: 30px; border: 1px solid #e1e5e9; }
      .footer { background: hsl(240 5% 93%); padding: 20px; border-radius: 0 0 8px 8px; text-align: center; color: hsl(240 4% 54%); font-size: 14px; }
      .button { 
        display: inline-block; 
        background: hsl(267 85% 60%); 
        color: white; 
        padding: 12px 24px; 
        text-decoration: none; 
        border-radius: 6px; 
        margin: 20px 0;
        font-weight: bold;
      }
      .status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
      }
      .status-pending { background: hsl(48 96% 53%); color: hsl(26 83% 14%); }
      .status-approved { background: hsl(142 76% 36%); color: white; }
      .status-rejected { background: hsl(0 84% 60%); color: white; }
      .leave-item { 
        background: hsl(240 5% 96%); 
        padding: 15px; 
        border-radius: 6px; 
        margin: 10px 0; 
        border-left: 4px solid hsl(267 85% 60%);
      }
      .summary-stats {
        display: flex;
        justify-content: space-around;
        background: hsl(240 5% 96%);
        padding: 20px;
        border-radius: 6px;
        margin: 20px 0;
      }
      .stat-item {
        text-align: center;
      }
      .stat-number {
        font-size: 24px;
        font-weight: bold;
        color: hsl(267 85% 60%);
      }
      .stat-label {
        font-size: 12px;
        color: hsl(240 4% 54%);
        text-transform: uppercase;
      }
    </style>
  </head>
  <body>
    <div class="container">
      ${content}
      <div class="footer">
        <p>Ten email został wysłany przez system zarządzania urlopami.</p>
        <p>Jeśli nie chcesz otrzymywać takich powiadomień, możesz je wyłączyć w ustawieniach profilu.</p>
      </div>
    </div>
  </body>
</html>
`

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const type = url.searchParams.get('type') || 'verification'

  let content = ''

  if (type === 'verification') {
    // Email verification template
    const verificationUrl = `${url.origin}/api/auth/verify-email?token=SAMPLE_TOKEN_123`
    
    content = `
      <div class="header">
        <h1>✉️ Potwierdź swój adres email</h1>
        <div class="brand">Time8 - Nowoczesne zarządzanie czasem pracy</div>
      </div>
      <div class="content">
        <h2>Cześć Jan Kowalski!</h2>
        <p>Dziękujemy za rejestrację w systemie Time8! Aby dokończyć tworzenie konta, musisz potwierdzić swój adres email.</p>
        
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="margin: 0 0 15px 0; font-size: 16px; color: #1e40af;">Kliknij poniższy przycisk, aby potwierdzić email:</p>
          <a href="${verificationUrl}" class="button" style="display: inline-block; background: hsl(267 85% 60%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Potwierdź adres email
          </a>
        </div>
        
        <p>Jeśli przycisk nie działa, skopiuj i wklej ten link do przeglądarki:</p>
        <p style="word-break: break-all; color: hsl(267 85% 60%); font-size: 14px; background: #f8f9fa; padding: 10px; border-radius: 4px;">${verificationUrl}</p>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="color: #856404; margin: 0;"><strong>⏰ Ważne:</strong> Ten link wygasa za 24 godziny ze względów bezpieczeństwa.</p>
        </div>
        
        <div style="margin-top: 30px;">
          <h4>Co dalej?</h4>
          <ol style="color: #4b5563;">
            <li>Potwierdź swój adres email klikając przycisk powyżej</li>
            <li>Zostaniesz automatycznie zalogowany</li>
            <li>Skonfiguruj swoją organizację</li>
            <li>Zacznij zarządzać urlopami swojego zespołu</li>
          </ol>
        </div>
        
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          Jeśli nie zakładałeś konta w Time8, zignoruj ten email.
        </p>
      </div>
    `
  } else if (type === 'invitation') {
    // Invitation email for comparison
    const invitationUrl = `${url.origin}/onboarding/join?token=SAMPLE_INVITATION_TOKEN`
    
    content = `
      <div class="header">
        <h1>🎉 Zaproszenie do Przykładowa Firma Sp. z o.o.</h1>
      </div>
      <div class="content">
        <p>Cześć!</p>
        
        <p><strong>Anna Nowak</strong> (anna.nowak@example.com) zaprasza Cię do dołączenia do organizacji <strong>Przykładowa Firma Sp. z o.o.</strong> w systemie zarządzania urlopami.</p>
        
        <div style="background: hsl(240 5% 96%); padding: 15px; border-left: 4px solid hsl(267 85% 60%); margin: 20px 0;">
          <p><strong>Wiadomość od Anna Nowak:</strong></p>
          <p style="font-style: italic;">"Witaj w naszym zespole! Cieszę się, że będziemy pracować razem."</p>
        </div>
        
        <p>Zostałeś przypisany do roli: <span class="status-badge" style="background: hsl(240 5% 93%); color: hsl(240 10% 25%);">employee</span></p>
        
        <p>Aby zaakceptować zaproszenie i założyć konto, kliknij poniższy przycisk:</p>
        
        <a href="${invitationUrl}" class="button">Zaakceptuj zaproszenie</a>
        
        <p>Lub skopiuj i wklej ten link do przeglądarki:</p>
        <p style="word-break: break-all; color: hsl(267 85% 60%); font-size: 14px;">${invitationUrl}</p>
        
        <div style="margin-top: 30px; padding: 15px; background: hsl(240 5% 96%); border-radius: 6px;">
          <p><strong>⏰ To zaproszenie wygasa za 7 dni.</strong></p>
          <p>Jeśli masz pytania, skontaktuj się bezpośrednio z anna.nowak@example.com.</p>
        </div>
      </div>
    `
  }

  const html = getEmailTemplate(content)
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  })
} 