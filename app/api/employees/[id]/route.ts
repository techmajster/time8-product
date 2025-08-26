import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const supabaseAdmin = await createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to detect current organization from query params or headers, or find the organization the employee belongs to
    const url = new URL(request.url)
    const orgIdFromQuery = url.searchParams.get('org') || url.searchParams.get('organization_id')
    const orgIdFromHeader = request.headers.get('x-current-organization') || request.headers.get('x-organization-id')
    
    // First, find which organization this employee belongs to
    const { data: employeeOrgs } = await supabaseAdmin
      .from('user_organizations')
      .select('organization_id, role, is_active')
      .eq('user_id', id)
      .eq('is_active', true)
    
    console.log('🔍 Employee organizations:', { employeeOrgs, employee_id: id })
    
    // Get current user's organizations where they are admin
    const { data: userAdminOrgs } = await supabaseAdmin
      .from('user_organizations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('role', 'admin')
    
    console.log('🔍 User admin organizations:', { userAdminOrgs, user_id: user.id })
    
    // Find the organization where:
    // 1. The employee exists 
    // 2. Current user is admin
    const validOrg = employeeOrgs?.find(empOrg => 
      userAdminOrgs?.some(userOrg => userOrg.organization_id === empOrg.organization_id)
    )
    
    if (!validOrg) {
      console.error('❌ No valid organization found where user is admin and employee exists')
      return NextResponse.json({ 
        error: 'Employee not found in any organization where you have admin access',
        debug: {
          employee_id: id,
          employee_orgs: employeeOrgs,
          user_admin_orgs: userAdminOrgs?.map(o => o.organization_id)
        }
      }, { status: 404 })
    }
    
    // Get the user's organization record for the valid org
    const userOrg = userAdminOrgs?.find(org => org.organization_id === validOrg.organization_id)
    const userOrgError = null

    console.log('🔍 Selected organization for deletion:', {
      found: !!userOrg,
      organization_id: userOrg?.organization_id,
      user_role: userOrg?.role,
      employee_id: id
    })

    // The employee organization record (we already know it exists from validOrg)
    const employeeOrg = employeeOrgs?.find(emp => emp.organization_id === userOrg?.organization_id)
    
    console.log('🔍 Employee in selected organization:', {
      found: !!employeeOrg,
      is_active: employeeOrg?.is_active,
      role: employeeOrg?.role
    })

    // Check if employee is already inactive
    if (!employeeOrg?.is_active) {
      console.log('⚠️ Employee is already inactive in this organization')
      return NextResponse.json({ 
        success: true, 
        message: 'Employee was already removed from organization',
        already_inactive: true
      })
    }

    // Prevent self-deletion
    if (id === user.id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
    }

    // Set the employee as inactive instead of deleting
    const { error: updateError } = await supabaseAdmin
      .from('user_organizations')
      .update({ is_active: false })
      .eq('user_id', id)
      .eq('organization_id', userOrg.organization_id)

    if (updateError) {
      console.error('Error removing employee:', updateError)
      return NextResponse.json({ error: 'Failed to remove employee from organization' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Employee successfully removed from organization' 
    })

  } catch (error) {
    console.error('Error in DELETE /api/employees/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const supabaseAdmin = await createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin access
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get user's organization and role
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('is_default', true)
      .single()

    if (!userOrg || userOrg.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { email, full_name, birth_date, role, team_id } = body

    // Update profile in profiles table
    if (email || full_name || birth_date) {
      const profileUpdates: any = {}
      if (email) profileUpdates.email = email
      if (full_name) profileUpdates.full_name = full_name
      if (birth_date) profileUpdates.birth_date = birth_date

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdates)
        .eq('id', id)

      if (profileError) {
        console.error('Error updating profile:', profileError)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
      }
    }

    // Update user organization data
    if (role !== undefined || team_id !== undefined) {
      const orgUpdates: any = {}
      if (role !== undefined) orgUpdates.role = role
      if (team_id !== undefined) orgUpdates.team_id = team_id

      const { error: orgError } = await supabaseAdmin
        .from('user_organizations')
        .update(orgUpdates)
        .eq('user_id', id)
        .eq('organization_id', userOrg.organization_id)
        .eq('is_active', true)

      if (orgError) {
        console.error('Error updating user organization:', orgError)
        return NextResponse.json({ error: 'Failed to update user organization' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, message: 'Employee updated successfully' })

  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}