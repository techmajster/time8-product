import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: employeeId } = await params

  try {
    if (!employeeId) {
      console.error('❌ No employee ID provided')
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 })
    }

    // REFACTOR: Use standard auth pattern for workspace isolation
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      return auth.error
    }

    const { context } = auth
    const { organization } = context
    const organizationId = organization.id

    const adminClient = await createAdminClient()

    // Get employee's organization membership in current workspace
    const { data: employeeOrg, error: employeeOrgError } = await adminClient
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', employeeId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (employeeOrgError || !employeeOrg) {
      console.error('❌ Employee not found in current organization:', employeeOrgError)
      return NextResponse.json({ error: 'Employee not found in this organization' }, { status: 404 })
    }

    return NextResponse.json({
      organization_id: employeeOrg.organization_id,
      role: employeeOrg.role
    })

  } catch (error) {
    console.error('❌ API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}