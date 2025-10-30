import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { MarkAllReadResponse } from '@/types/notification'

export async function POST(request: Request) {
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
