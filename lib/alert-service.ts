/**
 * Alert Service
 *
 * Sends critical billing alerts via multiple channels:
 * - Database (alerts table)
 * - Slack webhook
 * - Email to admin
 */

import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export interface AlertMetadata {
  subscription_id?: string
  organization_id?: string
  lemonsqueezy_quantity?: number
  database_quantity?: number
  job?: string
  [key: string]: any
}

export interface CriticalAlertResult {
  success: boolean
  error?: string
  channels: {
    database: boolean
    slack: boolean
    email: boolean
  }
}

/**
 * Sends a critical alert via all available channels
 *
 * @param message - Alert message
 * @param metadata - Additional context data
 * @returns Result indicating success/failure for each channel
 */
export async function sendCriticalAlert(
  message: string,
  metadata?: AlertMetadata
): Promise<CriticalAlertResult> {
  const results = {
    database: false,
    slack: false,
    email: false
  }

  // Channel 1: Database (alerts table)
  try {
    const dbResult = await createDatabaseAlert('critical', message, metadata)
    results.database = dbResult
  } catch (error) {
    console.error('[AlertService] Database alert failed:', error)
  }

  // Channel 2: Slack webhook
  try {
    const slackResult = await sendSlackAlert(message, metadata)
    results.slack = slackResult
  } catch (error) {
    console.error('[AlertService] Slack alert failed:', error)
  }

  // Channel 3: Email to admin
  try {
    const emailResult = await sendEmailAlert(message, metadata)
    results.email = emailResult
  } catch (error) {
    console.error('[AlertService] Email alert failed:', error)
  }

  // At least one channel must succeed
  const anySuccess = results.database || results.slack || results.email

  return {
    success: anySuccess,
    error: anySuccess ? undefined : 'All alert channels failed',
    channels: results
  }
}

/**
 * Creates an alert record in the database
 */
async function createDatabaseAlert(
  severity: 'info' | 'warning' | 'critical',
  message: string,
  metadata?: AlertMetadata
): Promise<boolean> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('alerts')
      .insert({
        severity,
        message,
        metadata: metadata || null,
        resolved: false
      })

    if (error) {
      console.error('[AlertService] Database insert error:', error)
      return false
    }

    console.log(`[AlertService] Database alert created: ${severity} - ${message}`)
    return true

  } catch (error) {
    console.error('[AlertService] Database alert exception:', error)
    return false
  }
}

/**
 * Sends alert to Slack via webhook
 */
async function sendSlackAlert(
  message: string,
  metadata?: AlertMetadata
): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) {
    console.log('[AlertService] Slack webhook not configured, skipping')
    return false
  }

  try {
    const payload = {
      text: `🚨 *Critical Billing Alert*`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 Critical Billing Alert',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Message:* ${message}`
          }
        }
      ]
    }

    // Add metadata fields if present
    if (metadata && Object.keys(metadata).length > 0) {
      const fields = Object.entries(metadata)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => ({
          type: 'mrkdwn',
          text: `*${key}:* ${JSON.stringify(value)}`
        }))

      if (fields.length > 0) {
        payload.blocks.push({
          type: 'section',
          fields: fields.slice(0, 10) // Slack limit
        } as any)
      }
    }

    // Add timestamp
    payload.blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `<!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|${new Date().toISOString()}>`
        }
      ]
    } as any)

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      console.error('[AlertService] Slack webhook failed:', response.status, response.statusText)
      return false
    }

    console.log('[AlertService] Slack alert sent successfully')
    return true

  } catch (error) {
    console.error('[AlertService] Slack alert exception:', error)
    return false
  }
}

/**
 * Sends alert email to admin
 */
async function sendEmailAlert(
  message: string,
  metadata?: AlertMetadata
): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL

  if (!adminEmail) {
    console.log('[AlertService] Admin email not configured, skipping')
    return false
  }

  if (!resend) {
    console.log('[AlertService] Email service not configured, skipping')
    return false
  }

  try {
    const metadataHtml = metadata && Object.keys(metadata).length > 0
      ? `
        <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Details:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${Object.entries(metadata)
              .filter(([_, value]) => value !== undefined && value !== null)
              .map(([key, value]) => `
                <tr>
                  <td style="padding: 5px; font-weight: bold;">${key}:</td>
                  <td style="padding: 5px;">${JSON.stringify(value)}</td>
                </tr>
              `)
              .join('')}
          </table>
        </div>
      `
      : ''

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert-box {
      background: #fef2f2;
      border-left: 4px solid #dc2626;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .alert-icon { font-size: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <h1 style="color: #dc2626;">🚨 Critical Billing Alert</h1>

    <div class="alert-box">
      <p><strong>Message:</strong></p>
      <p>${message}</p>
    </div>

    ${metadataHtml}

    <p style="color: #6b7280; font-size: 14px;">
      <strong>Timestamp:</strong> ${new Date().toISOString()}<br>
      <strong>Environment:</strong> ${process.env.NODE_ENV || 'unknown'}
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #6b7280; font-size: 12px;">
      This is an automated alert from your SaaS Leave System. Please investigate immediately.
    </p>
  </div>
</body>
</html>`

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || process.env.FROM_EMAIL || 'alerts@yourdomain.com',
      to: adminEmail,
      subject: `🚨 Critical Billing Alert - ${message.substring(0, 50)}`,
      html: htmlContent
    })

    if (result.error) {
      console.error('[AlertService] Email send error:', result.error)
      return false
    }

    console.log('[AlertService] Email alert sent successfully:', result.data?.id)
    return true

  } catch (error) {
    console.error('[AlertService] Email alert exception:', error)
    return false
  }
}

/**
 * Sends an info-level alert (database only)
 */
export async function sendInfoAlert(
  message: string,
  metadata?: AlertMetadata
): Promise<boolean> {
  return createDatabaseAlert('info', message, metadata)
}

/**
 * Sends a warning-level alert (database + Slack if configured)
 */
export async function sendWarningAlert(
  message: string,
  metadata?: AlertMetadata
): Promise<CriticalAlertResult> {
  const results = {
    database: false,
    slack: false,
    email: false
  }

  // Database alert
  try {
    results.database = await createDatabaseAlert('warning', message, metadata)
  } catch (error) {
    console.error('[AlertService] Database alert failed:', error)
  }

  // Slack alert (optional)
  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      results.slack = await sendSlackAlert(message, metadata)
    } catch (error) {
      console.error('[AlertService] Slack alert failed:', error)
    }
  }

  return {
    success: results.database || results.slack,
    channels: results
  }
}
