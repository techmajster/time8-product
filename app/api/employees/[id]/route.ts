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

    // Get user's organization and role using admin client to bypass RLS
    const { data: userOrg, error: userOrgError } = await supabaseAdmin
      .from('user_organizations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('is_default', true)
      .single()

    console.log('🔍 Current user organization lookup:', {
      found: !!userOrg,
      error: userOrgError,
      user_id: user.id,
      role: userOrg?.role
    })

    if (!userOrg) {
      console.error('❌ Could not find user organization:', {
        user_id: user.id,
        error: userOrgError
      })
      return NextResponse.json({ 
        error: 'Could not find your organization membership',
        debug: { user_id: user.id, error: userOrgError?.message }
      }, { status: 404 })
    }

    if (userOrg.role !== 'admin') {
      console.error('❌ Insufficient permissions:', {
        user_id: user.id,
        role: userOrg.role,
        required: 'admin'
      })
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if the employee to be deleted is in the same organization
    console.log('🔍 Looking for employee to delete:', {
      user_id: id,
      organization_id: userOrg.organization_id,
      admin_user: user.id
    })
    
    const { data: employeeOrg, error: employeeOrgError } = await supabaseAdmin
      .from('user_organizations')
      .select('*')
      .eq('user_id', id)
      .eq('organization_id', userOrg.organization_id)
      .single() // Remove is_active filter to allow deletion of inactive members

    console.log('🔍 Employee lookup result:', {
      found: !!employeeOrg,
      error: employeeOrgError,
      data: employeeOrg
    })

    if (!employeeOrg) {
      console.error('❌ Employee not found in organization:', {
        searched_user_id: id,
        organization_id: userOrg.organization_id,
        error: employeeOrgError
      })
      return NextResponse.json({ 
        error: 'Employee not found in your organization',
        debug: {
          user_id: id,
          organization_id: userOrg.organization_id,
          error: employeeOrgError?.message
        }
      }, { status: 404 })
    }

    // Check if employee is already inactive
    if (!employeeOrg.is_active) {
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