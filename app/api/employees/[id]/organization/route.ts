import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: employeeId } = await params
  console.log('🔍 Employee organization API called for:', employeeId)
  
  try {
    
    if (!employeeId) {
      console.error('❌ No employee ID provided')
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 })
    }
    
    // Verify current user is authenticated
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('🔍 Auth check:', { user: user?.id, authError })
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active organization from cookie (multi-workspace support)
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const activeOrgId = cookieStore.get('active-organization-id')?.value
    console.log('🍪 Active org from cookie:', activeOrgId)

    // Use admin client to bypass RLS for organization lookup
    const { createAdminClient } = await import('@/lib/supabase/server')
    const adminClient = await createAdminClient()

    // Get employee's organization in the ACTIVE workspace context
    let employeeOrgQuery = adminClient
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', employeeId)
      .eq('is_active', true)

    // If we have an active org cookie, prefer that organization
    if (activeOrgId) {
      employeeOrgQuery = employeeOrgQuery.eq('organization_id', activeOrgId)
    }

    const { data: employeeOrg, error: employeeOrgError } = await employeeOrgQuery.limit(1)

    console.log('🔍 Employee org lookup:', { employeeOrg, error: employeeOrgError })

    if (employeeOrgError) {
      console.error('❌ Employee org lookup error:', employeeOrgError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!employeeOrg || employeeOrg.length === 0) {
      console.error('❌ Employee has no organization')
      return NextResponse.json({ error: 'Employee has no organization' }, { status: 400 })
    }

    const employeeOrgId = employeeOrg[0].organization_id

    // Verify current user has access to employee's organization (security check)
    const { data: currentUserInEmployeeOrg } = await adminClient
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', employeeOrgId)
      .eq('is_active', true)
      .limit(1)

    if (!currentUserInEmployeeOrg || currentUserInEmployeeOrg.length === 0) {
      console.error('❌ Current user does not have access to employee\'s organization')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    console.log('✅ Employee org found and access verified:', employeeOrg[0])
    return NextResponse.json({
      organization_id: employeeOrg[0].organization_id,
      role: employeeOrg[0].role
    })

  } catch (error) {
    console.error('❌ API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}