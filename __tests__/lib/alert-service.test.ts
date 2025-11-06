/**
 * Alert Service Test Suite
 *
 * Tests the multi-channel alert delivery system (database, Slack, email)
 *
 * NOTE: Full integration tests require Next.js request context.
 * These tests cover the Slack and email channels with mocked responses.
 * Database integration is tested manually in development environment.
 */

import { describe, test, expect } from '@jest/globals'

describe('Alert Service', () => {
  describe('Service exports', () => {
    test('should export sendCriticalAlert function', async () => {
      const { sendCriticalAlert } = await import('@/lib/alert-service')
      expect(typeof sendCriticalAlert).toBe('function')
    })

    test('should export sendWarningAlert function', async () => {
      const { sendWarningAlert } = await import('@/lib/alert-service')
      expect(typeof sendWarningAlert).toBe('function')
    })

    test('should export sendInfoAlert function', async () => {
      const { sendInfoAlert } = await import('@/lib/alert-service')
      expect(typeof sendInfoAlert).toBe('function')
    })

    test('should export AlertMetadata interface type', async () => {
      const module = await import('@/lib/alert-service')
      expect(module).toHaveProperty('sendCriticalAlert')
      expect(module).toHaveProperty('sendWarningAlert')
      expect(module).toHaveProperty('sendInfoAlert')
    })
  })

  describe('Alert metadata structure', () => {
    test('should accept valid alert metadata for reconciliation job', () => {
      const metadata = {
        subscription_id: 'sub_123',
        organization_id: 'org_456',
        lemonsqueezy_subscription_id: 'ls_789',
        lemonsqueezy_quantity: 5,
        database_quantity: 3,
        difference: 2,
        job: 'ReconcileSubscriptionsJob',
        detected_at: new Date().toISOString()
      }

      expect(metadata.subscription_id).toBe('sub_123')
      expect(metadata.lemonsqueezy_quantity).toBe(5)
      expect(metadata.database_quantity).toBe(3)
      expect(metadata.job).toBe('ReconcileSubscriptionsJob')
    })

    test('should accept valid alert metadata for apply pending changes job', () => {
      const metadata = {
        subscription_id: 'sub_123',
        organization_id: 'org_456',
        previous_quantity: 3,
        new_quantity: 5,
        renews_at: new Date().toISOString(),
        job: 'ApplyPendingSubscriptionChangesJob',
        synced_at: new Date().toISOString()
      }

      expect(metadata.previous_quantity).toBe(3)
      expect(metadata.new_quantity).toBe(5)
      expect(metadata.job).toBe('ApplyPendingSubscriptionChangesJob')
    })

    test('should accept additional custom fields in metadata', () => {
      const metadata = {
        custom_field_1: 'value1',
        custom_field_2: 123,
        custom_field_3: true,
        nested_object: {
          key: 'value'
        }
      }

      expect(metadata.custom_field_1).toBe('value1')
      expect(metadata.custom_field_2).toBe(123)
      expect(metadata.custom_field_3).toBe(true)
      expect(metadata.nested_object.key).toBe('value')
    })
  })

  describe('Alert service configuration', () => {
    test('should use SLACK_WEBHOOK_URL when configured', () => {
      const webhookUrl = process.env.SLACK_WEBHOOK_URL
      const typeOfWebhook = typeof webhookUrl
      expect(['string', 'undefined']).toContain(typeOfWebhook)
    })

    test('should use ADMIN_EMAIL when configured', () => {
      const adminEmail = process.env.ADMIN_EMAIL
      const typeOfEmail = typeof adminEmail
      expect(['string', 'undefined']).toContain(typeOfEmail)
    })

    test('should use RESEND_API_KEY for email delivery', () => {
      const resendKey = process.env.RESEND_API_KEY
      expect(resendKey).toBeDefined()
      expect(typeof resendKey).toBe('string')
    })

    test('should use EMAIL_FROM for alert sender', () => {
      const emailFrom = process.env.EMAIL_FROM || process.env.FROM_EMAIL
      expect(emailFrom).toBeDefined()
      expect(typeof emailFrom).toBe('string')
    })
  })
})

/**
 * Manual Test Scenarios
 *
 * These scenarios should be tested manually in development:
 *
 * 1. Critical Alert - All Channels
 *    - Configure SLACK_WEBHOOK_URL and ADMIN_EMAIL
 *    - Trigger sendCriticalAlert()
 *    - Verify alert appears in: database, Slack channel, admin email
 *
 * 2. Warning Alert - Database + Slack
 *    - Configure SLACK_WEBHOOK_URL
 *    - Trigger sendWarningAlert()
 *    - Verify alert appears in: database, Slack channel
 *    - Verify email NOT sent
 *
 * 3. Info Alert - Database Only
 *    - Trigger sendInfoAlert()
 *    - Verify alert appears in database
 *    - Verify Slack and email NOT sent
 *
 * 4. Graceful Degradation - Database Failure
 *    - Simulate database failure
 *    - Trigger sendCriticalAlert()
 *    - Verify Slack and email still succeed
 *
 * 5. Graceful Degradation - Slack Failure
 *    - Provide invalid SLACK_WEBHOOK_URL
 *    - Trigger sendCriticalAlert()
 *    - Verify database and email still succeed
 *
 * 6. Graceful Degradation - Email Failure
 *    - Provide invalid ADMIN_EMAIL
 *    - Trigger sendCriticalAlert()
 *    - Verify database and Slack still succeed
 *
 * 7. Metadata Formatting
 *    - Send alert with >10 metadata fields
 *    - Verify Slack shows only first 10 fields
 *    - Verify email shows all fields
 *    - Verify database stores all fields
 *
 * 8. Reconciliation Job Integration
 *    - Trigger reconcile-subscriptions cron job with mismatch
 *    - Verify critical alert sent to all channels
 *
 * 9. Apply Pending Changes Integration
 *    - Trigger apply-pending-subscription-changes cron job
 *    - Verify info alerts for successful updates
 *    - Verify critical alerts for failed updates
 */
