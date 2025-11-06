import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendCriticalAlert, sendInfoAlert } from '@/lib/alert-service'

/**
 * ApplyPendingSubscriptionChangesJob
 *
 * Runs every 6 hours to update Lemon Squeezy 24 hours before subscription renewal
 * when pending seat changes exist.
 *
 * This is Layer 1 of the multi-layer billing guarantee system.
 *
 * Process:
 * 1. Find subscriptions with pending_seats that renew within 24-48 hours
 * 2. Update Lemon Squeezy via API with the new quantity
 * 3. Mark lemonsqueezy_quantity_synced = true
 * 4. Create info alert for admin dashboard visibility
 */

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

    // Find subscriptions that need updating:
    // - Have pending_seats (indicating a change is scheduled)
    // - Renew within 24-48 hours (give 24h buffer before renewal)
    // - Not yet synced with Lemon Squeezy
    const now = new Date()
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000)

    const { data: subscriptionsNeedingUpdate, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .not('pending_seats', 'is', null)
      .gte('renews_at', in24Hours.toISOString())
      .lte('renews_at', in48Hours.toISOString())
      .eq('lemonsqueezy_quantity_synced', false)
      .in('status', ['active', 'on_trial'])

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError)
      return NextResponse.json(
        { error: 'Database query failed', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!subscriptionsNeedingUpdate || subscriptionsNeedingUpdate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending subscription changes need processing',
        timestamp: new Date().toISOString(),
        processed: 0
      })
    }

    const results = []
    const errors = []

    // Process each subscription
    for (const subscription of subscriptionsNeedingUpdate) {
      try {
        // Update Lemon Squeezy subscription quantity
        const response = await fetch(
          `https://api.lemonsqueezy.com/v1/subscription-items/${subscription.lemonsqueezy_subscription_item_id}`,
          {
            method: 'PATCH',
            headers: {
              'Accept': 'application/vnd.api+json',
              'Content-Type': 'application/vnd.api+json',
              'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`
            },
            body: JSON.stringify({
              data: {
                type: 'subscription-items',
                id: subscription.lemonsqueezy_subscription_item_id,
                attributes: {
                  quantity: subscription.pending_seats,
                  disable_prorations: true
                }
              }
            })
          }
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(`Lemon Squeezy API error: ${errorData.errors?.[0]?.detail || response.statusText}`)
        }

        const lemonSqueezyData = await response.json()

        // Mark as synced in database
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            lemonsqueezy_quantity_synced: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id)

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`)
        }

        // Create info alert for admin dashboard (database only)
        await sendInfoAlert(
          `Subscription ${subscription.lemonsqueezy_subscription_id} updated in Lemon Squeezy: ${subscription.current_seats} → ${subscription.pending_seats} seats`,
          {
            subscription_id: subscription.id,
            organization_id: subscription.organization_id,
            previous_quantity: subscription.current_seats,
            new_quantity: subscription.pending_seats,
            renews_at: subscription.renews_at,
            job: 'ApplyPendingSubscriptionChangesJob',
            synced_at: new Date().toISOString()
          }
        )

        results.push({
          subscription_id: subscription.id,
          lemonsqueezy_subscription_id: subscription.lemonsqueezy_subscription_id,
          previous_quantity: subscription.current_seats,
          new_quantity: subscription.pending_seats,
          status: 'success'
        })

        console.log(`✅ Updated subscription ${subscription.lemonsqueezy_subscription_id}: ${subscription.current_seats} → ${subscription.pending_seats} seats`)

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push({
          subscription_id: subscription.id,
          lemonsqueezy_subscription_id: subscription.lemonsqueezy_subscription_id,
          error: errorMessage
        })

        // Create critical alert for failed updates (multi-channel: database, Slack, email)
        await sendCriticalAlert(
          `Failed to update subscription ${subscription.lemonsqueezy_subscription_id} in Lemon Squeezy`,
          {
            subscription_id: subscription.id,
            organization_id: subscription.organization_id,
            pending_quantity: subscription.pending_seats,
            renews_at: subscription.renews_at,
            error: errorMessage,
            job: 'ApplyPendingSubscriptionChangesJob'
          }
        )

        console.error(`❌ Failed to update subscription ${subscription.lemonsqueezy_subscription_id}:`, errorMessage)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Pending subscription changes processed',
      timestamp: new Date().toISOString(),
      processed: results.length,
      failed: errors.length,
      results,
      errors
    })

  } catch (error) {
    console.error('Error in apply-pending-subscription-changes cron job:', error)
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
