import { Resend } from 'resend'
import { getAppUrl, getInviteUrl, getLoginUrl, getOnboardingUrl } from './utils'

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Smart email address selection
const getFromEmail = (emailType: 'critical' | 'brand' | 'notification') => {
  switch (emailType) {
    case 'critical':
      // High-deliverability for invitations, password resets, important system emails
      return process.env.FROM_EMAIL || 'onboarding@resend.dev'
    case 'brand':
      // Time8 brand emails for general notifications, building domain reputation
      return process.env.BRAND_EMAIL || process.env.FROM_EMAIL || 'noreply@time8.io'
    case 'notification':
      // Regular notifications - balance between reliability and branding
      return process.env.NOTIFICATION_EMAIL || process.env.BRAND_EMAIL || 'notifications@time8.io'
    default:
      return process.env.FROM_EMAIL || 'noreply@yourdomain.com'
  }
}

interface InvitationEmailData {
  to: string
  organizationName: string
  inviterName: string
  inviterEmail: string
  role: string
  invitationToken: string
  personalMessage?: string
}

interface LeaveRequestNotificationData {
  to: string
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  status: 'pending' | 'approved' | 'rejected'
  organizationName: string
  requestId: string
}

interface TeamLeaveNotificationData {
  to: string
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  organizationName: string
}

interface LeaveRequestReminderData {
  to: string
  pendingRequestsCount: number
  organizationName: string
  requests: Array<{
    employeeName: string
    leaveType: string
    startDate: string
    requestDate: string
  }>
}

interface WeeklySummaryData {
  to: string
  organizationName: string
  weekStart: string
  weekEnd: string
  totalLeaves: number
  pendingRequests: number
  upcomingLeaves: Array<{
    employeeName: string
    leaveType: string
    startDate: string
    endDate: string
  }>
}

interface EmployeeVerificationData {
  to: string
  full_name: string
  organization_name: string
  temp_password: string
  personal_message?: string
}

interface EmailVerificationData {
  to: string
  full_name: string
  verification_token: string
}

// Email templates
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

export async function sendInvitationEmail(data: InvitationEmailData) {
  try {
    // Check if email service is configured
    if (!resend) {
      console.warn('Email service not configured - RESEND_API_KEY missing')
      return { success: false, error: 'Email service not configured' }
    }

    // Construct the invitation URL using dynamic domain detection
    const invitationUrl = getInviteUrl(data.invitationToken)

    const content = `
      <div class="header">
        <h1>🎉 Zaproszenie do ${data.organizationName}</h1>
      </div>
      <div class="content">
        <p>Cześć!</p>
        
        <p><strong>${data.inviterName}</strong> (${data.inviterEmail}) zaprasza Cię do dołączenia do organizacji <strong>${data.organizationName}</strong> w systemie zarządzania urlopami.</p>
        
        ${data.personalMessage ? `
          <div style="background: hsl(240 5% 96%); padding: 15px; border-left: 4px solid hsl(267 85% 60%); margin: 20px 0;">
            <p><strong>Wiadomość od ${data.inviterName}:</strong></p>
            <p style="font-style: italic;">"${data.personalMessage}"</p>
          </div>
        ` : ''}
        
        <p>Zostałeś przypisany do roli: <span class="status-badge" style="background: hsl(240 5% 93%); color: hsl(240 10% 25%);">${data.role}</span></p>
        
        <p>Aby zaakceptować zaproszenie i założyć konto, kliknij poniższy przycisk:</p>
        
        <a href="${invitationUrl}" class="button">Zaakceptuj zaproszenie</a>
        
        <p>Lub skopiuj i wklej ten link do przeglądarki:</p>
        <p style="word-break: break-all; color: hsl(267 85% 60%); font-size: 14px;">${invitationUrl}</p>
        
        <div style="margin-top: 30px; padding: 15px; background: hsl(240 5% 96%); border-radius: 6px;">
          <p><strong>⏰ To zaproszenie wygasa za 7 dni.</strong></p>
          <p>Jeśli masz pytania, skontaktuj się bezpośrednio z ${data.inviterEmail}.</p>
        </div>
      </div>
    `

    const fromEmail = getFromEmail('brand')
    console.log('📧 Sending invitation from:', fromEmail, 'to:', data.to)
    
    const result = await resend.emails.send({
      from: getFromEmail('brand'), // Use same email type as working sendTestEmail
      to: data.to,
      subject: `Zaproszenie do ${data.organizationName}`,
      html: getEmailTemplate(content),
    })

    console.log('🔍 Resend API response:', JSON.stringify(result, null, 2))
    return { success: true, messageId: result.data?.id }
  } catch (error) {
    console.error('Failed to send invitation email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function sendLeaveRequestNotification(data: LeaveRequestNotificationData) {
  try {
    if (!resend) {
      return { success: false, error: 'Email service not configured' }
    }

    const statusText = {
      pending: 'oczekuje na zatwierdzenie',
      approved: 'został zatwierdzony',
      rejected: 'został odrzucony'
    }

    const statusClass = `status-${data.status}`
    const appUrl = getAppUrl()

    const content = `
      <div class="header">
        <h1>📋 Powiadomienie o wniosku urlopowym</h1>
      </div>
      <div class="content">
        <p>Cześć!</p>
        
        <p>Informujemy o zmianie statusu wniosku urlopowego:</p>
        
        <div class="leave-item">
          <h3>Szczegóły wniosku</h3>
          <p><strong>Pracownik:</strong> ${data.employeeName}</p>
          <p><strong>Typ urlopu:</strong> ${data.leaveType}</p>
          <p><strong>Okres:</strong> ${data.startDate} - ${data.endDate}</p>
          <p><strong>Status:</strong> <span class="status-badge ${statusClass}">${statusText[data.status]}</span></p>
        </div>
        
        <a href="${appUrl}/leave/${data.requestId}" class="button">Zobacz szczegóły wniosku</a>
      </div>
    `

    const result = await resend.emails.send({
      from: getFromEmail('notification'),
      to: data.to,
      subject: `Wniosek urlopowy ${statusText[data.status]} - ${data.organizationName}`,
      html: getEmailTemplate(content),
    })

    return { success: true, messageId: result.data?.id }
  } catch (error) {
    console.error('Failed to send leave request notification:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function sendTeamLeaveNotification(data: TeamLeaveNotificationData) {
  try {
    if (!resend) {
      return { success: false, error: 'Email service not configured' }
    }

    const appUrl = getAppUrl()

    const content = `
      <div class="header">
        <h1>👥 Powiadomienie o urlopie w zespole</h1>
      </div>
      <div class="content">
        <p>Cześć!</p>
        
        <p>Informujemy o zaplanowanym urlopie członka zespołu:</p>
        
        <div class="leave-item">
          <h3>Szczegóły urlopu</h3>
          <p><strong>Pracownik:</strong> ${data.employeeName}</p>
          <p><strong>Typ urlopu:</strong> ${data.leaveType}</p>
          <p><strong>Okres:</strong> ${data.startDate} - ${data.endDate}</p>
        </div>
        
        <p>Możesz sprawdzić kalendarz zespołu, aby zobaczyć wszystkie zaplanowane urlopy:</p>
        
        <a href="${appUrl}/calendar" class="button">Zobacz kalendarz zespołu</a>
      </div>
    `

    const result = await resend.emails.send({
      from: getFromEmail('notification'),
      to: data.to,
      subject: `Urlop w zespole: ${data.employeeName} - ${data.organizationName}`,
      html: getEmailTemplate(content),
    })

    return { success: true, messageId: result.data?.id }
  } catch (error) {
    console.error('Failed to send team leave notification:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function sendLeaveRequestReminder(data: LeaveRequestReminderData) {
  try {
    if (!resend) {
      return { success: false, error: 'Email service not configured' }
    }

    const appUrl = getAppUrl()

    const requestsList = data.requests.map(request => `
      <div class="leave-item">
        <p><strong>${request.employeeName}</strong> - ${request.leaveType}</p>
        <p><small>Data wniosku: ${request.requestDate} | Urlop od: ${request.startDate}</small></p>
      </div>
    `).join('')

    const content = `
      <div class="header">
        <h1>⏰ Przypomnienie o oczekujących wnioskach</h1>
      </div>
      <div class="content">
        <p>Cześć!</p>
        
        <p>Masz <strong>${data.pendingRequestsCount}</strong> oczekujących wniosków urlopowych do sprawdzenia:</p>
        
        ${requestsList}
        
        <p>Zalecamy sprawdzenie i podjęcie decyzji w sprawie tych wniosków:</p>
        
        <a href="${appUrl}/leave" class="button">Sprawdź wnioski urlopowe</a>
      </div>
    `

    const result = await resend.emails.send({
      from: getFromEmail('notification'),
      to: data.to,
      subject: `Przypomnienie: ${data.pendingRequestsCount} oczekujących wniosków - ${data.organizationName}`,
      html: getEmailTemplate(content),
    })

    return { success: true, messageId: result.data?.id }
  } catch (error) {
    console.error('Failed to send leave request reminder:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function sendWeeklySummary(data: WeeklySummaryData) {
  try {
    if (!resend) {
      return { success: false, error: 'Email service not configured' }
    }

    const appUrl = getAppUrl()

    const upcomingLeavesList = data.upcomingLeaves.map(leave => `
      <div class="leave-item">
        <p><strong>${leave.employeeName}</strong> - ${leave.leaveType}</p>
        <p><small>${leave.startDate} - ${leave.endDate}</small></p>
      </div>
    `).join('')

    const content = `
      <div class="header">
        <h1>📊 Cotygodniowe podsumowanie urlopów</h1>
      </div>
      <div class="content">
        <p>Cześć!</p>
        
        <p>Oto podsumowanie urlopów za okres ${data.weekStart} - ${data.weekEnd}:</p>
        
        <div class="summary-stats">
          <div class="stat-item">
            <div class="stat-number">${data.totalLeaves}</div>
            <div class="stat-label">Zaplanowane urlopy</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${data.pendingRequests}</div>
            <div class="stat-label">Oczekujące wnioski</div>
          </div>
        </div>
        
        ${data.upcomingLeaves.length > 0 ? `
          <h3>Nadchodzące urlopy:</h3>
          ${upcomingLeavesList}
        ` : '<p>Brak zaplanowanych urlopów na najbliższy czas.</p>'}
        
        <a href="${appUrl}/calendar" class="button">Zobacz pełny kalendarz</a>
      </div>
    `

    const result = await resend.emails.send({
      from: getFromEmail('notification'),
      to: data.to,
      subject: `Cotygodniowe podsumowanie urlopów - ${data.organizationName}`,
      html: getEmailTemplate(content),
    })

    return { success: true, messageId: result.data?.id }
  } catch (error) {
    console.error('Failed to send weekly summary:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function sendTestEmail(data: { to: string; subject: string; content: string }) {
  try {
    if (!resend) {
      console.warn('Email service not configured - RESEND_API_KEY missing')
      return { success: false, error: 'Email service not configured' }
    }

    const content = `
      <div class="header">
        <h1>📧 Test Email</h1>
      </div>
      <div class="content">
        ${data.content}
      </div>
    `

    const result = await resend.emails.send({
      from: getFromEmail('brand'),
      to: data.to,
      subject: data.subject,
      html: getEmailTemplate(content),
    })

    console.log('Resend API response:', JSON.stringify(result, null, 2))
    return { success: true, messageId: result.data?.id }
  } catch (error) {
    console.error('Failed to send test email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function sendEmployeeVerificationEmail(data: EmployeeVerificationData) {
  try {
    if (!resend) {
      return { success: false, error: 'Email service not configured' }
    }

    const content = `
      <div class="header">
        <h1>🎉 Witamy w ${data.organization_name}!</h1>
        <div class="brand">Time8 - Nowoczesne zarządzanie czasem pracy</div>
      </div>
      <div class="content">
        <h2>Cześć ${data.full_name}!</h2>
        <p>Twoje konto w systemie Time8 zostało utworzone. Aby aktywować konto i ustawić własne hasło, postępuj zgodnie z poniższymi instrukcjami.</p>
        
        ${data.personal_message ? `
          <div style="background: #f0f9ff; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;">
            <p style="margin: 0; font-style: italic; color: #1e40af;">"${data.personal_message}"</p>
          </div>
        ` : ''}
        
        <div class="leave-item" style="background: #fef3c7; border-left-color: #f59e0b;">
          <h3 style="color: #92400e; margin-top: 0;">Dane logowania:</h3>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${data.to}</p>
          <p style="margin: 5px 0;"><strong>Tymczasowe hasło:</strong> <code style="background: #fbbf24; padding: 2px 6px; border-radius: 3px; font-weight: bold;">${data.temp_password}</code></p>
        </div>
        
        <div style="background: #fee2e2; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="color: #991b1b; margin: 0;"><strong>⚠️ Ważne:</strong> Musisz zmienić hasło przy pierwszym logowaniu ze względów bezpieczeństwa.</p>
        </div>
        
        <a href="${getLoginUrl()}" class="button">
          Zaloguj się teraz
        </a>
        
        <div style="margin-top: 30px;">
          <h4>Co dalej?</h4>
          <ol style="color: #4b5563;">
            <li>Kliknij przycisk "Zaloguj się teraz"</li>
            <li>Wprowadź swój email i tymczasowe hasło</li>
            <li>Ustaw nowe, bezpieczne hasło</li>
            <li>Uzupełnij profil pracownika</li>
          </ol>
        </div>
      </div>
    `

    const result = await resend.emails.send({
      from: getFromEmail('critical'), // Critical delivery for account setup
      to: data.to,
      subject: `Witamy w ${data.organization_name} - Aktywuj swoje konto Time8`,
      html: getEmailTemplate(content),
    })

    return { success: true, messageId: result.data?.id }
  } catch (error) {
    console.error('Failed to send employee verification email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function sendEmailVerification(data: EmailVerificationData) {
  try {
    if (!resend) {
      console.warn('Email service not configured - RESEND_API_KEY missing')
      return { success: false, error: 'Email service not configured' }
    }

    // Construct the verification URL
    const verificationUrl = `${getAppUrl()}/api/auth/verify-email?token=${data.verification_token}`

    const content = `
      <div class="header">
        <h1>✉️ Potwierdź swój adres email</h1>
        <div class="brand">Time8 - Nowoczesne zarządzanie czasem pracy</div>
      </div>
      <div class="content">
        <h2>Cześć ${data.full_name}!</h2>
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

    console.log('🔍 Attempting to send email via Resend...', {
      from: getFromEmail('critical'),
      to: data.to,
      subject: 'Potwierdź swój adres email - Time8'
    })

    const result = await resend.emails.send({
      from: getFromEmail('critical'), // Critical delivery for email verification
      to: data.to,
      subject: 'Potwierdź swój adres email - Time8',
      html: getEmailTemplate(content),
    })

    console.log('🔍 Resend API full response:', JSON.stringify(result, null, 2))
    console.log('📧 Email verification sent:', { to: data.to, messageId: result.data?.id })
    return { success: true, messageId: result.data?.id }
  } catch (error) {
    console.error('Failed to send email verification:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Fallback function if email service is not configured
export function createInvitationEmailContent(data: InvitationEmailData) {
  const invitationUrl = getInviteUrl(data.invitationToken)
  
  return {
    subject: `Zaproszenie do ${data.organizationName}`,
    invitationUrl,
    content: `
Cześć!

${data.inviterName} (${data.inviterEmail}) zaprasza Cię do dołączenia do organizacji ${data.organizationName} w systemie zarządzania urlopami.

${data.personalMessage ? `Wiadomość: "${data.personalMessage}"` : ''}

Rola: ${data.role}

Aby zaakceptować zaproszenie, odwiedź: ${invitationUrl}

To zaproszenie wygasa za 7 dni.

Pozdrawienia,
System zarządzania urlopami
    `
  }
} 