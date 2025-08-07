import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetOrgContext, isManagerOrAdmin } from '@/lib/auth-utils-v2'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Use optimized auth utility
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) return auth.error
    const { context } = auth
    const { organization } = context
    const organizationId = organization.id

    const supabase = await createClient()

    const resolvedParams = await params
    const employeeId = resolvedParams.id

    // Verify the employee belongs to the organization
    const { data: employee, error: employeeError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', employeeId)
      .eq('organization_id', organizationId)
      .single()

    if (employeeError || !employee) {
      return NextResponse.json({ error: 'Employee not found or not in organization' }, { status: 404 })
    }

    // Get all schedules for this employee
    const { data: schedules, error: schedulesError } = await supabase
      .from('employee_schedules')
      .select('*')
      .eq('user_id', employeeId)
      .eq('organization_id', organizationId)
      .order('date', { ascending: false })

    if (schedulesError) {
      console.error('Get schedules error:', schedulesError)
      return NextResponse.json({ 
        error: 'Failed to get schedules',
        details: schedulesError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      schedules: schedules || [],
      employee_name: employee.full_name,
      total_count: schedules?.length || 0
    })

  } catch (error) {
    console.error('Get employee schedules API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Use optimized auth utility
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) return auth.error
    const { context } = auth
    const { organization, role } = context
    const organizationId = organization.id

    // Only allow admin/manager to delete schedules
    if (!isManagerOrAdmin(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const supabase = await createClient()

    const resolvedParams = await params
    const employeeId = resolvedParams.id

    // Verify the employee belongs to the organization
    const { data: employee, error: employeeError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', employeeId)
      .eq('organization_id', organizationId)
      .single()

    if (employeeError || !employee) {
      return NextResponse.json({ error: 'Employee not found or not in organization' }, { status: 404 })
    }

    // Delete all schedules for this employee
    const { error: deleteError, count } = await supabase
      .from('employee_schedules')
      .delete({ count: 'exact' })
      .eq('user_id', employeeId)
      .eq('organization_id', organizationId)

    if (deleteError) {
      console.error('Delete schedules error:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete schedules',
        details: deleteError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${count || 0} schedules for ${employee.full_name}`,
      schedules_deleted: count || 0,
      employee_name: employee.full_name
    })

  } catch (error) {
    console.error('Delete employee schedules API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 