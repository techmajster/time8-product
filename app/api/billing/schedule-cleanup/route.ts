/**
 * Schedule Cleanup Task Endpoint
 * 
 * Handles scheduling and running cleanup tasks for abandoned checkout sessions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface ScheduleRequest {
  task_type: string;
  schedule: string;
  threshold_hours?: number;
  force_run?: boolean;
}

/**
 * POST handler for scheduling cleanup tasks
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: ScheduleRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request payload' },
        { status: 400 }
      );
    }

    const { task_type, schedule, threshold_hours = 24, force_run = false } = body;
    console.log('⏰ Schedule cleanup request:', { task_type, schedule, threshold_hours, force_run });
    
    if (!task_type || !schedule) {
      return NextResponse.json(
        { 
          error: 'Missing required parameters',
          required: ['task_type', 'schedule']
        },
        { status: 400 }
      );
    }

    if (task_type !== 'cleanup_abandoned_checkouts') {
      return NextResponse.json(
        { error: 'Invalid task_type. Must be "cleanup_abandoned_checkouts"' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (force_run) {
      // Run cleanup immediately
      const cutoffTime = new Date(Date.now() - threshold_hours * 60 * 60 * 1000);
      
      // Find potentially abandoned checkouts by looking at billing events
      const { data: events, error: eventsError } = await supabase
        .from('billing_events')
        .select('checkout_id, created_at, event_data')
        .eq('event_type', 'checkout.created')
        .lt('created_at', cutoffTime.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (eventsError) {
        console.error('Failed to fetch checkout events:', eventsError);
        return NextResponse.json(
          { error: 'Failed to fetch checkout events', details: eventsError },
          { status: 500 }
        );
      }

      const checkouts = events || [];
      let cleanedCount = 0;
      const errors: string[] = [];

      // Filter out checkouts that have been completed or already abandoned
      for (const checkout of checkouts) {
        try {
          // Check if this checkout has completion events
          const { data: completionEvents } = await supabase
            .from('billing_events')
            .select('id')
            .eq('checkout_id', checkout.checkout_id)
            .in('event_type', ['subscription.created', 'checkout.abandoned', 'checkout.force_cleanup'])
            .limit(1);

          if (completionEvents && completionEvents.length > 0) {
            // Skip - already completed or processed
            continue;
          }

          // Mark as abandoned
          const cleanupResponse = await fetch('/api/billing/cleanup-checkout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              checkout_id: checkout.checkout_id,
              action: 'mark_abandoned'
            })
          });

          if (cleanupResponse.ok) {
            cleanedCount++;
          } else {
            const errorText = await cleanupResponse.text();
            errors.push(`Failed to cleanup ${checkout.checkout_id}: ${errorText}`);
          }
        } catch (error: any) {
          errors.push(`Error processing ${checkout.checkout_id}: ${error.message}`);
        }
      }

      // Log the cleanup run
      const { error: logError } = await supabase
        .from('billing_events')
        .insert({
          event_type: 'cleanup.scheduled_run',
          event_data: {
            task_type,
            threshold_hours,
            checkouts_processed: checkouts.length,
            checkouts_cleaned: cleanedCount,
            errors_count: errors.length,
            timestamp: new Date().toISOString()
          },
          processed: true
        });

      if (logError) {
        console.error('Failed to log cleanup run:', logError);
      }

      return NextResponse.json({
        success: true,
        message: 'Cleanup task executed',
        results: {
          checkouts_processed: checkouts.length,
          checkouts_cleaned: cleanedCount,
          errors_count: errors.length,
          errors: errors.slice(0, 5) // Return first 5 errors
        }
      });
    }

    // Just schedule the task (for future cron job implementation)
    const { error: scheduleError } = await supabase
      .from('billing_events')
      .insert({
        event_type: 'cleanup.scheduled',
        event_data: {
          task_type,
          schedule,
          threshold_hours,
          timestamp: new Date().toISOString()
        },
        processed: false
      });

    if (scheduleError) {
      console.error('Failed to schedule cleanup task:', scheduleError);
      return NextResponse.json(
        { error: 'Failed to schedule cleanup task', details: scheduleError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cleanup task scheduled',
      task_type,
      schedule,
      threshold_hours
    });

  } catch (error) {
    console.error('Schedule cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export const PUT = GET;
export const DELETE = GET;
export const PATCH = GET;