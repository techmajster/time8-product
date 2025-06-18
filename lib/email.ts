import { Resend } from 'resend'

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface InvitationEmailData {
  to: string
  organizationName: string
  inviterName: string
  inviterEmail: string
  role: string
  invitationToken: string
  personalMessage?: string
}

export async function sendInvitationEmail(data: InvitationEmailData) {
  try {
    // Check if email service is configured
    if (!resend) {
      console.warn('Email service not configured - RESEND_API_KEY missing')
      return { success: false, error: 'Email service not configured' }
    }

    // Construct the invitation URL
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/auth/accept-invitation?token=${data.invitationToken}`

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You're invited to join ${data.organizationName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: hsl(220 14.3% 95.9%); padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .button { 
              display: inline-block; 
              background: hsl(13.2143 73.0435% 54.9020%); 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
            }
            .footer { color: hsl(215 16.3% 46.9%); font-size: 14px; margin-top: 30px; }
            .role-badge {
              background: hsl(220 14.3% 95.9%);
              color: hsl(222.2 84% 4.9%);
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 You're invited to join ${data.organizationName}!</h1>
            </div>
            
            <p>Hi there!</p>
            
            <p><strong>${data.inviterName}</strong> (${data.inviterEmail}) has invited you to join <strong>${data.organizationName}</strong> on our leave management system.</p>
            
            ${data.personalMessage ? `
              <div style="background: hsl(220 14.3% 95.9%); padding: 15px; border-left: 4px solid hsl(13.2143 73.0435% 54.9020%); margin: 20px 0;">
                <p><strong>Personal message from ${data.inviterName}:</strong></p>
                <p style="font-style: italic;">"${data.personalMessage}"</p>
              </div>
            ` : ''}
            
            <p>You've been assigned the role of <span class="role-badge">${data.role}</span> in the organization.</p>
            
            <p>To accept this invitation and set up your account, click the button below:</p>
            
            <a href="${invitationUrl}" class="button">Accept Invitation & Join Team</a>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: hsl(13.2143 73.0435% 54.9020%);">${invitationUrl}</p>
            
            <div class="footer">
              <p><strong>This invitation expires in 7 days.</strong></p>
              <p>If you have any questions, please contact ${data.inviterEmail} directly.</p>
              <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
      to: data.to,
      subject: `You're invited to join ${data.organizationName}`,
      html: emailHtml,
    })

    return { success: true, messageId: result.data?.id }
  } catch (error) {
    console.error('Failed to send invitation email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Fallback function if email service is not configured
export function createInvitationEmailContent(data: InvitationEmailData) {
  const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/auth/accept-invitation?token=${data.invitationToken}`
  
  return {
    subject: `You're invited to join ${data.organizationName}`,
    invitationUrl,
    content: `
Hi there!

${data.inviterName} (${data.inviterEmail}) has invited you to join ${data.organizationName} on our leave management system.

${data.personalMessage ? `Personal message: "${data.personalMessage}"` : ''}

Role: ${data.role}

To accept this invitation, visit: ${invitationUrl}

This invitation expires in 7 days.

Best regards,
The SaaS Leave System Team
    `
  }
} 