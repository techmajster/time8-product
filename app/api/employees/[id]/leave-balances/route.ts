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

    // Get active organization from cookie (multi-workspace support)
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const activeOrgId = cookieStore.get('active-organization-id')?.value

    // Use admin client to bypass RLS
    const { createAdminClient } = await import('@/lib/supabase/server')
    const adminClient = await createAdminClient()

    // Get employee's organization in the ACTIVE workspace context
    let employeeOrgQuery = adminClient
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', employeeId)
      .eq('is_active', true)

    // If we have an active org cookie, prefer that organization
    if (activeOrgId) {
      employeeOrgQuery = employeeOrgQuery.eq('organization_id', activeOrgId)
    }

    const { data: employeeOrg } = await employeeOrgQuery.limit(1)

    if (!employeeOrg || employeeOrg.length === 0) {
      return NextResponse.json({ error: 'Employee has no organization' }, { status: 400 })
    }

    const employeeOrgId = employeeOrg[0].organization_id

    // Verify current user has access to employee's organization (security check)
    const { data: currentUserInEmployeeOrg } = await adminClient
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('organization_id', employeeOrgId)
      .eq('is_active', true)
      .limit(1)

    if (!currentUserInEmployeeOrg || currentUserInEmployeeOrg.length === 0) {
      return NextResponse.json({ error: 'You do not have access to this employee\'s organization' }, { status: 403 })
    }

    // Get employee's leave balances for current year in THEIR organization
    const currentYear = new Date().getFullYear()
    const { data: balances, error: balancesError } = await adminClient
      .from('leave_balances')
      .select(`
        *,
        leave_types (*)
      `)
      .eq('user_id', employeeId)
      .eq('organization_id', employeeOrgId)
      .eq('year', currentYear)

    if (balancesError) {
      console.error('Leave balances query error:', balancesError)
      return NextResponse.json({
        error: 'Database error',
        details: balancesError.message
      }, { status: 500 })
    }

    // Enhance balances with override information for admins/managers
    // Balance Override Hierarchy (from Phase 2 Mandatory Absence Types):
    // 1. Individual override (leave_balances.entitled_days) - highest priority
    // 2. Workspace default (leave_types.days_per_year) - fallback
    // This allows admins to set org-wide defaults while permitting per-employee customization
    const enhancedBalances = balances?.map(balance => {
      const workspaceDefault = balance.leave_types?.days_per_year || 0
      const actualEntitled = balance.entitled_days || 0
      // An override exists when employee's entitled_days differs from workspace default
      const isOverride = actualEntitled !== workspaceDefault

      return {
        ...balance,
        is_override: isOverride,           // True if employee has custom balance
        workspace_default: workspaceDefault, // Org-wide default for reference
        effective_entitled_days: actualEntitled // Actual entitled days (may be override or default)
      }
    }) || []

    return NextResponse.json({
      balances: enhancedBalances,
      count: enhancedBalances.length
    })

  } catch (error) {
    console.error('Leave balances API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}