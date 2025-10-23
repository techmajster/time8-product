import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 })
    }

    // REFACTOR: Use standard auth pattern for workspace isolation
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      return auth.error
    }

    const { context } = auth
    const { user, organization } = context
    const organizationId = organization.id

    const adminClient = await createAdminClient()

    // Verify employee exists in current organization
    const { data: employeeOrg } = await adminClient
      .from('user_organizations')
      .select('user_id')
      .eq('user_id', employeeId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (!employeeOrg) {
      return NextResponse.json({ error: 'Employee not found in this organization' }, { status: 404 })
    }

    // Get employee's leave balances for current year in current organization
    const currentYear = new Date().getFullYear()
    const { data: balances, error: balancesError } = await adminClient
      .from('leave_balances')
      .select(`
        *,
        leave_types (*)
      `)
      .eq('user_id', employeeId)
      .eq('organization_id', organizationId)
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