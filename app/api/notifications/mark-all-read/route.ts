import { createClient } from '@/lib/supabase/server'
import { authenticateAndGetProfile } from '@/lib/auth-utils'
import { MarkAllReadResponse } from '@/types/notification'

export async function POST(request: Request) {
  try {
    // Authenticate user
    const authResult = await authenticateAndGetProfile()

    if (!authResult.success || !authResult.user || !authResult.profile) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { user, profile } = authResult
    const organizationId = profile.organization_id

    // Create Supabase client
    const supabase = await createClient()

    // Update all unread notifications for this user
    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .eq('is_read', false)
      .select('id')

    if (error) {
      console.error('Error marking all notifications as read:', error)
      return Response.json(
        { error: 'Failed to mark all as read', details: error.message },
        { status: 500 }
      )
    }

    const response: MarkAllReadResponse = {
      success: true,
      updated_count: data?.length || 0
    }

    return Response.json(response)
  } catch (error) {
    console.error('Unexpected error in POST /api/notifications/mark-all-read:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
