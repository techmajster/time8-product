import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { Notification, NotificationsResponse } from '@/types/notification'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get active organization from cookie (per-workspace notifications)
    const cookieStore = await cookies()
    const activeOrgId = cookieStore.get('active-organization-id')?.value

    // Get user's organization membership
    let userOrgQuery = supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (activeOrgId) {
      userOrgQuery = userOrgQuery.eq('organization_id', activeOrgId)
    } else {
      userOrgQuery = userOrgQuery.eq('is_default', true)
    }

    const { data: userOrg, error: orgError } = await userOrgQuery.single()

    if (orgError || !userOrg) {
      return Response.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const organizationId = userOrg.organization_id

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unread_only') === 'true'

    // Build query
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Add unread filter if requested
    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data: notifications, error, count } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return Response.json(
        { error: 'Failed to fetch notifications', details: error.message },
        { status: 500 }
      )
    }

    // Get unread count separately
    const { count: unreadCount, error: unreadError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .eq('is_read', false)

    if (unreadError) {
      console.error('Error fetching unread count:', unreadError)
    }

    const totalCount = count || 0
    const hasMore = offset + limit < totalCount

    const response: NotificationsResponse = {
      notifications: (notifications || []) as Notification[],
      unread_count: unreadCount || 0,
      total_count: totalCount,
      has_more: hasMore
    }

    return Response.json(response)
  } catch (error) {
    console.error('Unexpected error in GET /api/notifications:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
