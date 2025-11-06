import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { reactivateArchivedUser } from '@/lib/seat-management'
import { cookies } from 'next/headers'

/**
 * POST /api/admin/reactivate-user/[userId]
 *
 * Reactivates an archived user (restores their access)
 * Admin only endpoint
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient()
    const { userId } = params

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

    // Use the reactivateArchivedUser function from seat-management
    const result = await reactivateArchivedUser(
      userId,
      userOrg.organization_id,
      user.id
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    console.log(`[API] Archived user ${userId} reactivated by ${user.id}`)

    return NextResponse.json({
      success: true,
      message: 'User reactivated successfully',
      data: result.data
    })

  } catch (error) {
    console.error('Error in reactivate-user endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
