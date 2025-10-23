import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Debug endpoint - only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Debug endpoints are disabled in production' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')

    if (!employeeId) {
      return NextResponse.json({ error: 'employee_id parameter required' }, { status: 400 })
    }

    // Get current user
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client to bypass RLS
    const { createAdminClient } = await import('@/lib/supabase/server')
    const adminClient = await createAdminClient()
    
    const currentYear = new Date().getFullYear()
    
    // Query 1: Direct admin query (bypasses RLS)
    const { data: adminBalances, error: adminError } = await adminClient
      .from('leave_balances')
      .select(`
        *,
        leave_types (*)
      `)
      .eq('user_id', employeeId)
      .eq('year', currentYear)

    // Query 2: Regular client query (subject to RLS)
    const { data: regularBalances, error: regularError } = await supabase
      .from('leave_balances')
      .select(`
        *,
        leave_types (*)
      `)
      .eq('user_id', employeeId)
      .eq('year', currentYear)

    // Query 3: All balances for this user (admin)
    const { data: allUserBalances, error: allError } = await adminClient
      .from('leave_balances')
      .select(`
        user_id,
        year,
        leave_type_id,
        allocated_days,
        remaining_days,
        leave_types(name)
      `)
      .eq('user_id', employeeId)

    return NextResponse.json({
      currentUser: user.id,
      currentUserEmail: user.email,
      targetEmployeeId: employeeId,
      currentYear,
      adminQuery: {
        count: adminBalances?.length || 0,
        error: adminError,
        data: adminBalances
      },
      regularQuery: {
        count: regularBalances?.length || 0,
        error: regularError,
        data: regularBalances
      },
      allUserBalances: {
        count: allUserBalances?.length || 0,
        error: allError,
        data: allUserBalances
      }
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}