/**
 * Email utility functions for the Time8 system
 * Provides smart email routing and template functionality
 */

/**
 * Get the appropriate FROM email address based on email type
 * Uses environment variables with fallbacks for reliability
 */
export function getFromEmail(type: 'critical' | 'brand' | 'notification'): string {
  switch (type) {
    case 'critical':
      // Critical emails (invitations, password resets) - High deliverability
      return process.env.FROM_EMAIL || 'onboarding@time8.io'
    case 'brand':
      // Brand emails (general communications) - Building Time8 reputation
      return process.env.BRAND_EMAIL || process.env.FROM_EMAIL || 'noreply@time8.io' 
    case 'notification':
      // Notifications (leave updates, reminders) - Balance reliability and branding
      return process.env.NOTIFICATION_EMAIL || process.env.FROM_EMAIL || 'notifications@time8.io'
    default:
      return process.env.FROM_EMAIL || 'onboarding@time8.io'
  }
}

/**
 * Generate the complete HTML email template with Time8 branding
 * Includes responsive design and professional styling
 */
export function getEmailTemplate(content: string): string {
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

/**
 * Interface definitions for email data
 */
export interface LeaveRequestNotificationData {
  to: string
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  status: 'pending' | 'approved' | 'rejected'
  requestId: string
  organizationName: string
}

export interface TeamLeaveNotificationData {
  to: string
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  organizationName: string
}

export interface LeaveRequestReminderData {
  to: string
  pendingRequestsCount: number
  organizationName: string
  requests: Array<{
    employeeName: string
    leaveType: string
    requestDate: string
    startDate: string
  }>
}

export interface WeeklySummaryData {
  to: string
  weekStart: string
  weekEnd: string
  totalLeaves: number
  pendingRequests: number
  organizationName: string
  upcomingLeaves: Array<{
    employeeName: string
    leaveType: string
    startDate: string
    endDate: string
  }>
}

export interface EmployeeVerificationData {
  to: string
  full_name: string
  organization_name: string
  temp_password: string
  personal_message?: string
}

export interface EmailVerificationData {
  to: string
  full_name: string
  verification_token: string
}