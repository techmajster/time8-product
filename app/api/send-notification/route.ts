import { NextRequest, NextResponse } from 'next/server'
import { 
  sendLeaveRequestNotification,
  sendTeamLeaveNotification, 
  sendLeaveRequestReminder,
  sendWeeklySummary
} from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, ...data } = body

    // Validate required fields
    if (!type) {
      return NextResponse.json(
        { error: 'Notification type is required' },
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

    let result

    switch (type) {
      case 'leave_request':
        result = await sendLeaveRequestNotification(data)
        break
      
      case 'team_leave':
        result = await sendTeamLeaveNotification(data)
        break
      
      case 'leave_reminder':
        result = await sendLeaveRequestReminder(data)
        break
      
      case 'weekly_summary':
        result = await sendWeeklySummary(data)
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        )
    }

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Notification sent successfully',
        messageId: result.messageId 
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to send notification: ' + result.error },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('API Error sending notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 