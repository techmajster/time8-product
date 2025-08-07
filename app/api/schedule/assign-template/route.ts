import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetOrgContext, isManagerOrAdmin } from '@/lib/auth-utils-v2'

export async function POST(request: NextRequest) {
  try {
    // Use optimized auth utility
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) return auth.error
    const { context } = auth
    const { organization, role } = context
    const organizationId = organization.id

    // Only allow admin/manager to assign templates
    if (!isManagerOrAdmin(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const supabase = await createClient()

    const { employee_ids, template_id } = await request.json()

    if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
      return NextResponse.json({ error: 'Employee IDs are required' }, { status: 400 })
    }

    if (!template_id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    // Get the template to verify it exists and belongs to the organization
    const { data: template, error: templateError } = await supabase
      .from('work_schedule_templates')
      .select('*')
      .eq('id', template_id)
      .eq('organization_id', organizationId)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Verify all employees belong to the organization
    const { data: employees, error: employeesError } = await supabase
      .from('profiles')
      .select('id')
      .in('id', employee_ids)
      .eq('organization_id', organizationId)

    if (employeesError || !employees || employees.length !== employee_ids.length) {
      return NextResponse.json({ error: 'Some employees not found or not in organization' }, { status: 400 })
    }

    // Generate schedules for the next 4 weeks based on template
    const schedules = []
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (startDate.getDay() + 6) % 7) // Go to last Monday

    // ✅ OPTIMIZED: Bulk delete existing schedules for all employees at once (was N+1 pattern)
    await supabase
      .from('employee_schedules')
      .delete()
      .in('user_id', employee_ids)
      .eq('organization_id', organizationId)

    // Generate new schedules for all employees
    for (const employeeId of employee_ids) {
      // Generate new schedules
      for (let week = 0; week < 4; week++) {
        for (let day = 0; day < 7; day++) {
          const currentDate = new Date(startDate)
          currentDate.setDate(startDate.getDate() + (week * 7) + day)
          
          const dateStr = currentDate.toISOString().split('T')[0]
          const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][day]
          
          const isWorking = template[`${dayName}_is_working`] as boolean
          const startTime = template[`${dayName}_start`] as string | null
          const endTime = template[`${dayName}_end`] as string | null
          
          schedules.push({
            user_id: employeeId,
            organization_id: organizationId,
            date: dateStr,
            shift_start_time: isWorking ? startTime : null,
            shift_end_time: isWorking ? endTime : null,
            is_working_day: isWorking,
            notes: isWorking ? `Generated from template: ${template.name}` : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      }
    }

    // Insert schedules in batches
    const batchSize = 100
    let insertedCount = 0

    for (let i = 0; i < schedules.length; i += batchSize) {
      const batch = schedules.slice(i, i + batchSize)
      
      const { error: insertError } = await supabase
        .from('employee_schedules')
        .insert(batch)

      if (insertError) {
        console.error('Batch insert error:', insertError)
        return NextResponse.json({ 
          error: 'Failed to create schedules', 
          details: insertError.message,
          batch_start: i
        }, { status: 500 })
      }

      insertedCount += batch.length
    }

    return NextResponse.json({
      success: true,
      message: `Successfully assigned template "${template.name}" to ${employee_ids.length} employees`,
      schedules_created: insertedCount,
      employees_affected: employee_ids.length
    })

  } catch (error) {
    console.error('Assign template API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 