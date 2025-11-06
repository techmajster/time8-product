import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/permissions'
import { cookies } from 'next/headers'

/**
 * GET /api/admin/pending-changes
 *
 * Lists all users scheduled for removal (status: pending_removal)
 * Admin only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get active organization (respect workspace switching cookie)
    const cookieStore = await cookies()
    const activeOrgId = cookieStore.get('active-organization-id')?.value

    let userOrgQuery = supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)

    // Use active org cookie if available, otherwise default org
    if (activeOrgId) {
      userOrgQuery = userOrgQuery.eq('organization_id', activeOrgId)
    } else {
      userOrgQuery = userOrgQuery.eq('is_default', true)
    }

    const { data: userOrg, error: userOrgError } = await userOrgQuery.single()

    if (userOrgError || !userOrg) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 404 }
      )
    }

    // Check if user is admin
    if (!isAdmin(userOrg.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get all users with pending_removal status in the organization
    const { data: pendingUsers, error: fetchError } = await supabase
      .from('user_organizations')
      .select(`
        user_id,
        status,
        removal_effective_date,
        role,
        users:user_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('organization_id', userOrg.organization_id)
      .eq('status', 'pending_removal')
      .order('removal_effective_date', { ascending: true })

    if (fetchError) {
      console.error('Error fetching pending removals:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch pending removals' },
        { status: 500 }
      )
    }

    // Transform the data to a cleaner format
    const formattedUsers = pendingUsers?.map(uo => ({
      id: uo.users.id,
      email: uo.users.email,
      full_name: uo.users.full_name,
      avatar_url: uo.users.avatar_url,
      role: uo.role,
      removal_effective_date: uo.removal_effective_date
    })) || []

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      count: formattedUsers.length
    })

  } catch (error) {
    console.error('Error in pending-changes endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
