/**
 * Test Alert Email Script
 *
 * Tests the alert service email delivery by sending a test critical alert
 * to admin@bb8.pl
 *
 * Usage: npx tsx scripts/test-alert-email.ts
 */

import { sendCriticalAlert } from '../lib/alert-service'

async function testAlertEmail() {
  console.log('🧪 Testing alert email delivery...')
  console.log('📧 Sending test critical alert to admin@bb8.pl\n')

  const testMetadata = {
    test: true,
    subscription_id: 'test_sub_123',
    organization_id: 'test_org_456',
    lemonsqueezy_subscription_id: 'test_ls_789',
    lemonsqueezy_quantity: 5,
    database_quantity: 3,
    difference: 2,
    job: 'TestAlertScript',
    detected_at: new Date().toISOString(),
    message: 'This is a test alert to verify email delivery is working correctly'
  }

  try {
    const result = await sendCriticalAlert(
      'Test Critical Alert - Email Delivery Test',
      testMetadata
    )

    console.log('\n✅ Alert sent successfully!\n')
    console.log('Results:')
    console.log('  Database:', result.channels.database ? '✅ Success' : '❌ Failed')
    console.log('  Slack:', result.channels.slack ? '✅ Success' : '⚠️  Skipped (no webhook configured)')
    console.log('  Email:', result.channels.email ? '✅ Success' : '❌ Failed')

    if (result.channels.email) {
      console.log('\n📬 Check your inbox at admin@bb8.pl for the test alert email!')
      console.log('   Subject: 🚨 Critical Billing Alert - Test Critical Alert...')
    } else {
      console.log('\n❌ Email delivery failed. Check the error logs above.')
    }

    if (result.error) {
      console.log('\n⚠️  Error:', result.error)
    }

    process.exit(result.success ? 0 : 1)

  } catch (error) {
    console.error('\n❌ Error running test:', error)
    process.exit(1)
  }
}

testAlertEmail()
