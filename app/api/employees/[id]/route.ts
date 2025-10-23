import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetOrgContext, requireRole } from '@/lib/auth-utils-v2'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // REFACTOR: Use standard auth pattern for workspace isolation
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      return auth.error
    }

    const { context } = auth
    const { user, organization, role } = context
    const organizationId = organization.id

    // Only admins can delete employees
    const roleCheck = requireRole(context, ['admin'])
    if (roleCheck) {
      return roleCheck
    }

    const supabaseAdmin = await createAdminClient()

    // Check if employee exists and is active in this organization
    const { data: employeeOrg, error: employeeError } = await supabaseAdmin
      .from('user_organizations')
      .select('user_id, role, is_active')
      .eq('user_id', id)
      .eq('organization_id', organizationId)
      .single()

    console.log('🔍 Employee in current organization:', {
      found: !!employeeOrg,
      is_active: employeeOrg?.is_active,
      role: employeeOrg?.role
    })

    if (!employeeOrg) {
      console.error('❌ Employee not found in current organization')
      return NextResponse.json({
        error: 'Employee not found in this organization'
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
      .eq('organization_id', organizationId)

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
    // REFACTOR: Use standard auth pattern for workspace isolation
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      return auth.error
    }

    const { context } = auth
    const { user, organization } = context
    const organizationId = organization.id

    // Only admins can update employees
    const roleCheck = requireRole(context, ['admin'])
    if (roleCheck) {
      return roleCheck
    }

    const supabaseAdmin = await createAdminClient()

    const body = await request.json()
    const { email, full_name, birth_date, role: employeeRole, team_id, leave_balance_overrides } = body

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
    if (employeeRole !== undefined || team_id !== undefined) {
      const orgUpdates: any = {}
      if (employeeRole !== undefined) orgUpdates.role = employeeRole
      if (team_id !== undefined) orgUpdates.team_id = team_id

      const { error: orgError } = await supabaseAdmin
        .from('user_organizations')
        .update(orgUpdates)
        .eq('user_id', id)
        .eq('organization_id', organizationId)
        .eq('is_active', true)

      if (orgError) {
        console.error('Error updating user organization:', orgError)
        return NextResponse.json({ error: 'Failed to update user organization' }, { status: 500 })
      }
    }

    // Update leave balance overrides
    const balanceUpdateResults: any[] = []
    if (leave_balance_overrides && Array.isArray(leave_balance_overrides)) {
      const currentYear = new Date().getFullYear()

      for (const override of leave_balance_overrides) {
        const { leave_type_id, entitled_days } = override

        // Validate entitled_days range (0-50)
        if (entitled_days < 0 || entitled_days > 50) {
          return NextResponse.json({
            error: `Invalid entitled_days: ${entitled_days}. Must be between 0 and 50.`
          }, { status: 400 })
        }

        // Get previous value for audit trail
        const { data: existingBalance } = await supabaseAdmin
          .from('leave_balances')
          .select('entitled_days')
          .eq('user_id', id)
          .eq('leave_type_id', leave_type_id)
          .eq('organization_id', organizationId)
          .eq('year', currentYear)
          .single()

        // Upsert the balance with custom entitled_days
        const { error: balanceError } = await supabaseAdmin
          .from('leave_balances')
          .upsert({
            user_id: id,
            leave_type_id: leave_type_id,
            organization_id: organizationId,
            year: currentYear,
            entitled_days: entitled_days,
            used_days: existingBalance?.used_days || 0
          }, {
            onConflict: 'user_id,leave_type_id,year'
          })

        if (balanceError) {
          console.error('Error updating leave balance:', balanceError)
          return NextResponse.json({ error: 'Failed to update leave balance' }, { status: 500 })
        }

        balanceUpdateResults.push({
          leave_type_id,
          previous_entitled_days: existingBalance?.entitled_days || 0,
          new_entitled_days: entitled_days
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Employee updated successfully',
      balance_updates: balanceUpdateResults.length > 0 ? balanceUpdateResults : undefined
    })

  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}