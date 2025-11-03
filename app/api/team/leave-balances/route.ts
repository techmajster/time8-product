import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const year = searchParams.get('year') || new Date().getFullYear().toString()

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      )
    }

    // Authenticate the request
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use admin client for better performance
    const supabaseAdmin = createAdminClient()

    // Get all users in the organization
    const { data: userOrgs } = await supabaseAdmin
      .from('user_organizations')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    const userIds = userOrgs?.map(uo => uo.user_id) || []

    if (userIds.length === 0) {
      return NextResponse.json([])
    }

    // Get leave balances for all team members
    const { data: leaveBalances, error } = await supabaseAdmin
      .from('leave_balances')
      .select(`
        *,
        leave_types!inner (
          id,
          name,
          color,
          requires_balance
        )
      `)
      .in('user_id', userIds)
      .eq('year', year)
      .eq('leave_types.requires_balance', true)

    if (error) {
      console.error('Error fetching team leave balances:', error)
      return NextResponse.json(
        { error: 'Failed to fetch team leave balances' },
        { status: 500 }
      )
    }

    return NextResponse.json(leaveBalances || [])
  } catch (error) {
    console.error('Unexpected error in team/leave-balances API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
