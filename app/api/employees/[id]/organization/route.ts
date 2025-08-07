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

    // Use admin client to bypass RLS for organization lookup
    const { createAdminClient } = await import('@/lib/supabase/server')
    const adminClient = await createAdminClient()
    
    // Get current user's organization first (for verification)
    const { data: currentUserOrg, error: currentUserOrgError } = await adminClient
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
    
    console.log('🔍 Current user org:', { currentUserOrg, error: currentUserOrgError })
    
    if (currentUserOrgError || !currentUserOrg || currentUserOrg.length === 0) {
      console.error('❌ Current user has no organization:', currentUserOrgError)
      return NextResponse.json({ error: 'Current user has no organization' }, { status: 400 })
    }

    const currentOrgId = currentUserOrg[0].organization_id

    // Get employee's organization (must be same as current user for security)
    const { data: employeeOrg, error: employeeOrgError } = await adminClient
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', employeeId)
      .eq('organization_id', currentOrgId) // Same org only
      .eq('is_active', true)
      .limit(1)
    
    console.log('🔍 Employee org lookup:', { employeeOrg, error: employeeOrgError, currentOrgId })
    
    if (employeeOrgError) {
      console.error('❌ Employee org lookup error:', employeeOrgError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!employeeOrg || employeeOrg.length === 0) {
      // Employee not in same organization or doesn't exist - use current user's org as fallback
      console.log('⚠️ Employee not found in same org, using current user org as fallback')
      return NextResponse.json({ 
        organization_id: currentOrgId,
        role: 'employee' 
      })
    }

    console.log('✅ Employee org found:', employeeOrg[0])
    return NextResponse.json({
      organization_id: employeeOrg[0].organization_id,
      role: employeeOrg[0].role
    })

  } catch (error) {
    console.error('❌ API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}