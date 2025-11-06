import { NextRequest, NextResponse } from 'next/server'
import { sendCriticalAlert } from '@/lib/alert-service'

/**
 * Test Alert Email Endpoint
 *
 * Sends a test critical alert to verify email delivery
 *
 * Usage:
 * curl -X POST http://localhost:3000/api/test/alert-email \
 *   -H "Authorization: Bearer your-secret-key"
 */

export async function POST(request: NextRequest) {
  try {
    // Simple auth check (use same CRON_SECRET)
    const authHeader = request.headers.get('authorization')
    const secret = process.env.CRON_SECRET || 'your-secret-key'

    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🧪 Testing alert email delivery...')
    console.log('📧 Sending test critical alert to', process.env.ADMIN_EMAIL || 'admin@bb8.pl')

    const testMetadata = {
      test: true,
      subscription_id: 'test_sub_123',
      organization_id: 'test_org_456',
      lemonsqueezy_subscription_id: 'test_ls_789',
      lemonsqueezy_quantity: 5,
      database_quantity: 3,
      difference: 2,
      job: 'TestAlertEndpoint',
      detected_at: new Date().toISOString(),
      message: 'This is a test alert to verify email delivery is working correctly'
    }

    const result = await sendCriticalAlert(
      'Test Critical Alert - Email Delivery Test',
      testMetadata
    )

    const response = {
      success: result.success,
      message: 'Test alert sent',
      channels: {
        database: result.channels.database ? 'Success' : 'Failed',
        slack: result.channels.slack ? 'Success' : 'Skipped (not configured)',
        email: result.channels.email ? 'Success' : 'Failed'
      },
      instructions: result.channels.email
        ? `Check your inbox at ${process.env.ADMIN_EMAIL || 'admin@bb8.pl'} for the test alert email!`
        : 'Email delivery failed. Check server logs for details.',
      error: result.error
    }

    console.log('\n✅ Alert sent!')
    console.log('  Database:', result.channels.database ? '✅' : '❌')
    console.log('  Slack:', result.channels.slack ? '✅' : '⚠️')
    console.log('  Email:', result.channels.email ? '✅' : '❌')

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Error sending test alert:', error)
    return NextResponse.json(
      {
        error: 'Failed to send test alert',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Also allow GET for easy browser testing
export async function GET(request: NextRequest) {
  return POST(request)
}
