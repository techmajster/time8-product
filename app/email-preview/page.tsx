'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Sample data for previews
const sampleData = {
  invitation: {
    organizationName: 'BB8 Sp. z o.o.',
    inviterName: 'Jan Kowalski',
    inviterEmail: 'jan.kowalski@bb8.pl',
    role: 'Employee',
    invitationToken: 'sample-token-123',
    personalMessage: 'Witamy w naszym zespole! Cieszymy się, że do nas dołączasz.',
    to: 'nowy.pracownik@example.com'
  },
  leaveNotification: {
    employeeName: 'Anna Nowak',
    leaveType: 'Urlop wypoczynkowy',
    startDate: '2024-12-15',
    endDate: '2024-12-22',
    status: 'approved' as const,
    requestId: '123',
    organizationName: 'BB8 Sp. z o.o.',
    to: 'manager@example.com'
  },
  teamLeave: {
    employeeName: 'Piotr Wiśniewski',
    leaveType: 'Urlop rodzicielski',
    startDate: '2024-12-10',
    endDate: '2024-12-24',
    organizationName: 'BB8 Sp. z o.o.',
    to: 'zespol@example.com'
  },
  reminder: {
    pendingRequestsCount: 3,
    organizationName: 'BB8 Sp. z o.o.',
    to: 'manager@example.com',
    requests: [
      {
        employeeName: 'Michał Kowalczyk',
        leaveType: 'Urlop wypoczynkowy',
        requestDate: '2024-12-01',
        startDate: '2024-12-20'
      },
      {
        employeeName: 'Katarzyna Lewandowska',
        leaveType: 'Zwolnienie lekarskie',
        requestDate: '2024-12-02',
        startDate: '2024-12-18'
      }
    ]
  },
  weeklySummary: {
    weekStart: '2024-12-01',
    weekEnd: '2024-12-07',
    totalLeaves: 5,
    pendingRequests: 2,
    organizationName: 'BB8 Sp. z o.o.',
    to: 'manager@example.com',
    upcomingLeaves: [
      {
        employeeName: 'Adam Nowicki',
        leaveType: 'Urlop wypoczynkowy',
        startDate: '2024-12-15',
        endDate: '2024-12-22'
      }
    ]
  },
  employeeVerification: {
    full_name: 'Tomasz Jankowski',
    organization_name: 'BB8 Sp. z o.o.',
    temp_password: 'TempPass123!',
    personal_message: 'Witamy w naszej firmie! Przygotowaliśmy dla Ciebie dostęp do systemu.',
    to: 'tomasz.jankowski@example.com'
  },
  emailVerification: {
    full_name: 'Magdalena Zielińska',
    verification_token: 'verify-token-abc123',
    to: 'magdalena.zielinska@example.com'
  }
}

// Template generators (we'll implement these to match your actual templates)
function generateInvitationTemplate(data: typeof sampleData.invitation) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { 
      display: inline-block; 
      background: #3b82f6; 
      color: white; 
      padding: 12px 24px; 
      text-decoration: none; 
      border-radius: 6px; 
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Zaproszenie do ${data.organizationName}</h1>
    <p>Cześć!</p>
    <p><strong>${data.inviterName}</strong> zaprasza Cię do dołączenia do ${data.organizationName}.</p>
    ${data.personalMessage ? `<p><em>"${data.personalMessage}"</em></p>` : ''}
    <p>Rola: ${data.role}</p>
    <a href="#" class="button">Zaakceptuj zaproszenie</a>
    <p>Zaproszenie wygasa za 7 dni.</p>
  </div>
</body>
</html>`
}

function generateEmailTemplate(content: string): string {
  return `
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
      .brand {
        font-size: 14px;
        opacity: 0.9;
        margin-top: 5px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      ${content}
      <div class="footer">
        <p>Ten email został wysłany przez system zarządzania urlopami Time8.</p>
        <p>Jeśli nie chcesz otrzymywać takich powiadomień, możesz je wyłączyć w ustawieniach profilu.</p>
      </div>
    </div>
  </body>
</html>
`
}

function generateLeaveNotificationTemplate(data: typeof sampleData.leaveNotification) {
  const statusText = {
    pending: 'oczekuje na zatwierdzenie',
    approved: 'został zatwierdzony',
    rejected: 'został odrzucony'
  }

  const statusClass = `status-${data.status}`

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
      
      <a href="#" class="button">Zobacz szczegóły wniosku</a>
    </div>
  `

  return generateEmailTemplate(content)
}

function generateTeamLeaveTemplate(data: typeof sampleData.teamLeave) {
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
      
      <a href="#" class="button">Zobacz kalendarz zespołu</a>
    </div>
  `

  return generateEmailTemplate(content)
}

function generateReminderTemplate(data: typeof sampleData.reminder) {
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
      
      <a href="#" class="button">Sprawdź wnioski urlopowe</a>
    </div>
  `

  return generateEmailTemplate(content)
}

function generateWeeklySummaryTemplate(data: typeof sampleData.weeklySummary) {
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
      
      <a href="#" class="button">Zobacz pełny kalendarz</a>
    </div>
  `

  return generateEmailTemplate(content)
}

function generateEmployeeVerificationTemplate(data: typeof sampleData.employeeVerification) {
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
      
      <a href="#" class="button">
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

  return generateEmailTemplate(content)
}

function generateEmailVerificationTemplate(data: typeof sampleData.emailVerification) {
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
        <a href="#" class="button" style="display: inline-block; background: hsl(267 85% 60%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Potwierdź adres email
        </a>
      </div>
      
      <p>Jeśli przycisk nie działa, skopiuj i wklej ten link do przeglądarki:</p>
      <p style="word-break: break-all; color: hsl(267 85% 60%); font-size: 14px; background: #f8f9fa; padding: 10px; border-radius: 4px;">https://your-app.com/verify?token=sample-token</p>
      
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

  return generateEmailTemplate(content)
}

const emailTemplates = {
  invitation: {
    name: 'Team Invitation Email',
    description: 'Email sent when inviting new team members',
    generator: generateInvitationTemplate,
    data: sampleData.invitation
  },
  leaveNotification: {
    name: 'Leave Request Notification',
    description: 'Email sent when leave request status changes',
    generator: generateLeaveNotificationTemplate,
    data: sampleData.leaveNotification
  },
  teamLeave: {
    name: 'Team Leave Notification',
    description: 'Email sent to notify team about upcoming leave',
    generator: generateTeamLeaveTemplate,
    data: sampleData.teamLeave
  },
  reminder: {
    name: 'Leave Request Reminder',
    description: 'Email sent to remind managers about pending requests',
    generator: generateReminderTemplate,
    data: sampleData.reminder
  },
  weeklySummary: {
    name: 'Weekly Leave Summary',
    description: 'Weekly summary email for managers',
    generator: generateWeeklySummaryTemplate,
    data: sampleData.weeklySummary
  },
  employeeVerification: {
    name: 'Employee Account Verification',
    description: 'Email sent to new employees with login credentials',
    generator: generateEmployeeVerificationTemplate,
    data: sampleData.employeeVerification
  },
  emailVerification: {
    name: 'Email Address Verification',
    description: 'Email sent for email address confirmation',
    generator: generateEmailVerificationTemplate,
    data: sampleData.emailVerification
  }
}

export default function EmailPreviewPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof emailTemplates>('invitation')
  const [previewHtml, setPreviewHtml] = useState('')

  const generatePreview = () => {
    const template = emailTemplates[selectedTemplate]
    const html = template.generator(template.data as any)
    setPreviewHtml(html)
  }

  const openInNewTab = () => {
    if (previewHtml) {
      const newWindow = window.open()
      if (newWindow) {
        newWindow.document.write(previewHtml)
        newWindow.document.close()
      }
    }
  }

  const downloadHtml = () => {
    if (previewHtml) {
      const blob = new Blob([previewHtml], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedTemplate}-template.html`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="min-h-screen bg-muted py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Email Template Preview</h1>
          <p className="text-muted-foreground mt-2">Preview and test your email templates with sample data</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Template Selector */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Select Template</CardTitle>
                <CardDescription>Choose an email template to preview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedTemplate} onValueChange={(value) => setSelectedTemplate(value as keyof typeof emailTemplates)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(emailTemplates).map(([key, template]) => (
                      <SelectItem key={key} value={key}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="text-sm text-muted-foreground">
                  {emailTemplates[selectedTemplate].description}
                </div>

                <div className="space-y-2">
                  <Button onClick={generatePreview} className="w-full">
                    Generate Preview
                  </Button>
                  
                  {previewHtml && (
                    <>
                      <Button onClick={openInNewTab} variant="outline" className="w-full">
                        Open in New Tab
                      </Button>
                      <Button onClick={downloadHtml} variant="outline" className="w-full">
                        Download HTML
                      </Button>
                    </>
                  )}
                </div>

                {/* Template List */}
                <div className="mt-8">
                  <h3 className="font-medium text-foreground mb-4">All Templates</h3>
                  <div className="space-y-2">
                    {Object.entries(emailTemplates).map(([key, template]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedTemplate(key as keyof typeof emailTemplates)}
                        className={`w-full text-left p-3 rounded-md text-sm transition-colors ${
                          selectedTemplate === key
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-white hover:bg-muted border border'
                        }`}
                      >
                        <div className="font-medium">{template.name}</div>
                        <div className="text-muted-foreground text-xs mt-1">{template.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Area */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Preview: {emailTemplates[selectedTemplate].name}</CardTitle>
                <CardDescription>Live preview with sample data</CardDescription>
              </CardHeader>
              <CardContent>
                {previewHtml ? (
                  <div className="border rounded-lg overflow-hidden">
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full h-[800px] border-0"
                      title="Email Preview"
                    />
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Click "Generate Preview" to see the email template</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}