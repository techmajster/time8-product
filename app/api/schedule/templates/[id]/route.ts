import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateAndGetOrgContext, isManagerOrAdmin } from '@/lib/auth-utils-v2'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Use optimized auth utility
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) return auth.error
    const { context } = auth
    const { user, organization, role } = context
    const organizationId = organization.id

    // Check if user has permission to edit templates
    if (!isManagerOrAdmin(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const supabase = await createClient()

    const updateData = await request.json()

    // Validate template belongs to user's organization
    const { data: existingTemplate, error: templateError } = await supabase
      .from('work_schedule_templates')
      .select('organization_id')
      .eq('id', id)
      .single()

    if (templateError || !existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (existingTemplate.organization_id !== organizationId) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // If setting as default, unset other defaults first
    if (updateData.is_default) {
      await supabase
        .from('work_schedule_templates')
        .update({ is_default: false })
        .eq('organization_id', organizationId)
        .neq('id', id)
    }

    // Update the template
    const { data: updatedTemplate, error: updateError } = await supabase
      .from('work_schedule_templates')
      .update({
        name: updateData.name,
        description: updateData.description,
        schedule_type: updateData.schedule_type,
        is_default: updateData.is_default,
        monday_start: updateData.monday_start,
        monday_end: updateData.monday_end,
        monday_is_working: updateData.monday_is_working,
        tuesday_start: updateData.tuesday_start,
        tuesday_end: updateData.tuesday_end,
        tuesday_is_working: updateData.tuesday_is_working,
        wednesday_start: updateData.wednesday_start,
        wednesday_end: updateData.wednesday_end,
        wednesday_is_working: updateData.wednesday_is_working,
        thursday_start: updateData.thursday_start,
        thursday_end: updateData.thursday_end,
        thursday_is_working: updateData.thursday_is_working,
        friday_start: updateData.friday_start,
        friday_end: updateData.friday_end,
        friday_is_working: updateData.friday_is_working,
        saturday_start: updateData.saturday_start,
        saturday_end: updateData.saturday_end,
        saturday_is_working: updateData.saturday_is_working,
        sunday_start: updateData.sunday_start,
        sunday_end: updateData.sunday_end,
        sunday_is_working: updateData.sunday_is_working,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update template error:', updateError)
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Template updated successfully',
      template: updatedTemplate
    })

  } catch (error) {
    console.error('PUT /api/schedule/templates/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Use optimized auth utility
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) return auth.error
    const { context } = auth
    const { user, organization, role } = context
    const organizationId = organization.id

    // Check if user has permission to delete templates
    if (!isManagerOrAdmin(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const supabase = await createClient()

    // Validate template belongs to user's organization and is not default
    const { data: existingTemplate, error: templateError } = await supabase
      .from('work_schedule_templates')
      .select('organization_id, is_default')
      .eq('id', id)
      .single()

    if (templateError || !existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (existingTemplate.organization_id !== organizationId) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (existingTemplate.is_default) {
      return NextResponse.json({ error: 'Cannot delete default template' }, { status: 400 })
    }

    // Delete the template
    const { error: deleteError } = await supabase
      .from('work_schedule_templates')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete template error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Template deleted successfully'
    })

  } catch (error) {
    console.error('DELETE /api/schedule/templates/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 