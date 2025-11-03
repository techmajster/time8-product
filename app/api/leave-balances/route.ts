import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const year = searchParams.get('year') || new Date().getFullYear().toString()

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
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

    // Get leave balances for the user (only for leave types that require balances)
    const { data: leaveBalances, error } = await supabaseAdmin
      .from('leave_balances')
      .select(`
        *,
        leave_types!inner (
          id,
          name,
          color,
          leave_category,
          requires_balance,
          days_per_year
        )
      `)
      .eq('user_id', userId)
      .eq('year', year)
      .eq('leave_types.requires_balance', true)

    if (error) {
      console.error('Error fetching leave balances:', error)
      return NextResponse.json(
        { error: 'Failed to fetch leave balances' },
        { status: 500 }
      )
    }

    return NextResponse.json(leaveBalances || [])
  } catch (error) {
    console.error('Unexpected error in leave-balances API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
