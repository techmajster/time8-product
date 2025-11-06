import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// This endpoint is designed to be called by a cron job (e.g., Vercel Cron)
// It updates approved leave requests to 'completed' status when their end_date has passed
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from a cron job using the authorization header
    const authHeader = request.headers.get('authorization')

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createAdminClient()

    // Call the database function to update completed leave requests
    const { data, error } = await supabase.rpc('update_completed_leave_requests')

    if (error) {
      console.error('❌ Error updating completed leave requests:', error)
      return NextResponse.json(
        { error: 'Failed to update completed leave requests', details: error.message },
        { status: 500 }
      )
    }

    const updatedCount = data || 0

    console.log(`✅ Successfully updated ${updatedCount} leave requests to completed status`)

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Updated ${updatedCount} leave request(s) to completed status`,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('❌ Unexpected error in update-completed-leave-requests cron:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
