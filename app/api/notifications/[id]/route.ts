import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { MarkReadResponse } from '@/types/notification'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const notificationId = params.id

    // Validate notification ID
    if (!notificationId) {
      return Response.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { is_read } = body

    if (typeof is_read !== 'boolean') {
      return Response.json(
        { error: 'is_read must be a boolean' },
        { status: 400 }
      )
    }

    // Update notification
    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read,
        read_at: is_read ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .select('id, is_read, read_at, updated_at')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return Response.json(
          { error: 'Notification not found' },
          { status: 404 }
        )
      }
      console.error('Error updating notification:', error)
      return Response.json(
        { error: 'Failed to update notification', details: error.message },
        { status: 500 }
      )
    }

    const response: MarkReadResponse = {
      success: true,
      notification: data
    }

    return Response.json(response)
  } catch (error) {
    console.error('Unexpected error in PATCH /api/notifications/[id]:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
