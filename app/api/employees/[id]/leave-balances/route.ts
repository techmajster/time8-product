import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params
    
    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 })
    }
    
    // Verify current user is authenticated
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client to bypass RLS
    const { createAdminClient } = await import('@/lib/supabase/server')
    const adminClient = await createAdminClient()
    
    // Get current user's organization first (security check)
    const { data: currentUserOrg } = await adminClient
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
    
    if (!currentUserOrg || currentUserOrg.length === 0) {
      return NextResponse.json({ error: 'Current user has no organization' }, { status: 400 })
    }

    const currentOrgId = currentUserOrg[0].organization_id

    // Verify employee is in same organization (security)
    const { data: employeeOrg } = await adminClient
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', employeeId)
      .eq('organization_id', currentOrgId)
      .eq('is_active', true)
      .limit(1)
    
    if (!employeeOrg || employeeOrg.length === 0) {
      return NextResponse.json({ error: 'Employee not in same organization' }, { status: 403 })
    }

    // Get employee's leave balances for current year
    const currentYear = new Date().getFullYear()
    const { data: balances, error: balancesError } = await adminClient
      .from('leave_balances')
      .select(`
        *,
        leave_types (*)
      `)
      .eq('user_id', employeeId)
      .eq('year', currentYear)

    if (balancesError) {
      console.error('Leave balances query error:', balancesError)
      return NextResponse.json({
        error: 'Database error',
        details: balancesError.message
      }, { status: 500 })
    }

    console.log(`✅ Leave balances API - Found ${balances?.length || 0} balances for employee ${employeeId}`)

    return NextResponse.json({
      balances: balances || [],
      count: balances?.length || 0
    })

  } catch (error) {
    console.error('Leave balances API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}