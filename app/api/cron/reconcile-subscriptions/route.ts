import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendCriticalAlert, sendWarningAlert, sendInfoAlert } from '@/lib/alert-service'

/**
 * ReconcileSubscriptionsJob
 *
 * Runs daily to verify database subscription data matches Lemon Squeezy
 * and detect any discrepancies.
 *
 * This is Layer 3 of the multi-layer billing guarantee system.
 *
 * Process:
 * 1. Fetch all active subscriptions from database
 * 2. For each subscription, fetch current data from Lemon Squeezy API
 * 3. Compare quantities and detect mismatches
 * 4. Create critical alerts for any discrepancies
 * 5. Log all reconciliation results for audit trail
 */

interface ReconciliationResult {
  subscription_id: string
  lemonsqueezy_subscription_id: string
  database_quantity: number
  lemonsqueezy_quantity: number
  status: 'match' | 'mismatch'
  details?: string
}

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a cron service
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key'

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if Lemon Squeezy API is configured
    const hasLemonSqueezyConfig = process.env.LEMONSQUEEZY_API_KEY
    if (!hasLemonSqueezyConfig) {
      return NextResponse.json(
        { error: 'Lemon Squeezy API not configured' },
        { status: 503 }
      )
    }

    const supabase = createClient()

    // Fetch all active subscriptions from database
    const { data: subscriptions, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .in('status', ['active', 'on_trial'])
      .not('lemonsqueezy_subscription_id', 'is', null)

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError)
      return NextResponse.json(
        { error: 'Database query failed', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions to reconcile',
        timestamp: new Date().toISOString(),
        checked: 0,
        matches: 0,
        mismatches: 0
      })
    }

    const results: ReconciliationResult[] = []
    const errors: any[] = []
    let matchCount = 0
    let mismatchCount = 0

    // Process each subscription
    for (const subscription of subscriptions) {
      try {
        // Fetch current subscription data from Lemon Squeezy
        const response = await fetch(
          `https://api.lemonsqueezy.com/v1/subscriptions/${subscription.lemonsqueezy_subscription_id}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/vnd.api+json',
              'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`
            }
          }
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(`Lemon Squeezy API error: ${errorData.errors?.[0]?.detail || response.statusText}`)
        }

        const lemonSqueezyData = await response.json()
        const lsQuantity = lemonSqueezyData.data.attributes.quantity
        const dbQuantity = subscription.current_seats

        // Compare quantities
        const isMatch = lsQuantity === dbQuantity

        if (isMatch) {
          matchCount++
          results.push({
            subscription_id: subscription.id,
            lemonsqueezy_subscription_id: subscription.lemonsqueezy_subscription_id,
            database_quantity: dbQuantity,
            lemonsqueezy_quantity: lsQuantity,
            status: 'match'
          })

          console.log(`✅ Subscription ${subscription.lemonsqueezy_subscription_id}: DB=${dbQuantity}, LS=${lsQuantity} (MATCH)`)

        } else {
          mismatchCount++

          const details = `Database shows ${dbQuantity} seats, Lemon Squeezy shows ${lsQuantity} seats`

          results.push({
            subscription_id: subscription.id,
            lemonsqueezy_subscription_id: subscription.lemonsqueezy_subscription_id,
            database_quantity: dbQuantity,
            lemonsqueezy_quantity: lsQuantity,
            status: 'mismatch',
            details
          })

          // Create critical alert for mismatch (multi-channel: database, Slack, email)
          await sendCriticalAlert(
            `Subscription ${subscription.lemonsqueezy_subscription_id} out of sync! LS: ${lsQuantity}, DB: ${dbQuantity}`,
            {
              subscription_id: subscription.id,
              organization_id: subscription.organization_id,
              lemonsqueezy_subscription_id: subscription.lemonsqueezy_subscription_id,
              lemonsqueezy_quantity: lsQuantity,
              database_quantity: dbQuantity,
              difference: Math.abs(lsQuantity - dbQuantity),
              job: 'ReconcileSubscriptionsJob',
              detected_at: new Date().toISOString()
            }
          )

          console.error(`❌ MISMATCH: Subscription ${subscription.lemonsqueezy_subscription_id}: DB=${dbQuantity}, LS=${lsQuantity}`)
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push({
          subscription_id: subscription.id,
          lemonsqueezy_subscription_id: subscription.lemonsqueezy_subscription_id,
          error: errorMessage
        })

        // Create warning alert for failed reconciliation check (database + Slack)
        await sendWarningAlert(
          `Failed to reconcile subscription ${subscription.lemonsqueezy_subscription_id}`,
          {
            subscription_id: subscription.id,
            organization_id: subscription.organization_id,
            lemonsqueezy_subscription_id: subscription.lemonsqueezy_subscription_id,
            error: errorMessage,
            job: 'ReconcileSubscriptionsJob'
          }
        )

        console.error(`⚠️ Failed to reconcile subscription ${subscription.lemonsqueezy_subscription_id}:`, errorMessage)
      }

      // Rate limiting: wait 100ms between API calls to avoid hitting Lemon Squeezy rate limits
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Create summary info alert if everything matched (database only)
    if (mismatchCount === 0 && errors.length === 0 && subscriptions.length > 0) {
      await sendInfoAlert(
        `Daily reconciliation complete: All ${subscriptions.length} subscriptions in sync`,
        {
          checked: subscriptions.length,
          matches: matchCount,
          job: 'ReconcileSubscriptionsJob',
          completed_at: new Date().toISOString()
        }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription reconciliation complete',
      timestamp: new Date().toISOString(),
      checked: subscriptions.length,
      matches: matchCount,
      mismatches: mismatchCount,
      errors: errors.length,
      results: results.filter(r => r.status === 'mismatch'), // Only return mismatches in response
      errorDetails: errors
    })

  } catch (error) {
    console.error('Error in reconcile-subscriptions cron job:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Allow manual trigger via GET for testing (with auth)
export async function GET(request: NextRequest) {
  return POST(request)
}
