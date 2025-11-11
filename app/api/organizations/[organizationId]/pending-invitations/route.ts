import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    const { organizationId } = params

    // Validate organization ID
    if (!organizationId || organizationId.trim() === '') {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Get current user from session
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user is a member of the organization and is an admin
    const { data: userOrg, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .in('status', ['active', 'pending_removal'])
      .maybeSingle()

    if (userOrgError || !userOrg) {
      return NextResponse.json(
        { error: 'Not authorized to access this organization' },
        { status: 403 }
      )
    }

    if (!isAdmin(userOrg.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Parse query parameters for pagination and filtering
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50) // Max 50 per page
    const status = searchParams.get('status') || 'pending'

    // Calculate pagination range
    const from = (page - 1) * limit
    const to = from + limit - 1

    // Use admin client to fetch invitations
    const supabaseAdmin = createAdminClient()

    const { data: invitations, error: invitationsError, count } = await supabaseAdmin
      .from('invitations')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (invitationsError) {
      console.error('[PendingInvitations] Query error:', invitationsError)
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      )
    }

    // Return invitations with pagination metadata
    return NextResponse.json(
      {
        invitations: invitations || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('[PendingInvitations] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
