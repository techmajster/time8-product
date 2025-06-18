import { NextRequest, NextResponse } from 'next/server'
import { sendWeeklySummaries } from '@/lib/notification-utils'

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a cron service (basic security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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

    // Send weekly summaries
    await sendWeeklySummaries()

    return NextResponse.json({
      success: true,
      message: 'Weekly summaries sent successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in send-weekly-summary cron job:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Allow manual trigger via GET for testing
export async function GET(request: NextRequest) {
  try {
    // Check if email service is configured
    const hasEmailConfig = process.env.RESEND_API_KEY && process.env.FROM_EMAIL
    if (!hasEmailConfig) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 503 }
      )
    }

    await sendWeeklySummaries()

    return NextResponse.json({
      success: true,
      message: 'Weekly summaries sent successfully (manual trigger)',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in manual send-weekly-summary trigger:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 