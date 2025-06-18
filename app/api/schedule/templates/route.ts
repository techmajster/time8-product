import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile for organization_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get all templates for the organization
    const { data: templates, error: templatesError } = await supabase
      .from('work_schedule_templates')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    if (templatesError) {
      console.error('Get templates error:', templatesError)
      return NextResponse.json({ 
        error: 'Failed to get templates',
        details: templatesError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      templates: templates || []
    })

  } catch (error) {
    console.error('Get templates API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile for organization_id and role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check if user can manage templates
    const canManage = profile.role === 'admin' || profile.role === 'manager'
    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      description,
      schedule_type,
      is_default,
      monday_start,
      monday_end,
      monday_is_working,
      tuesday_start,
      tuesday_end,
      tuesday_is_working,
      wednesday_start,
      wednesday_end,
      wednesday_is_working,
      thursday_start,
      thursday_end,
      thursday_is_working,
      friday_start,
      friday_end,
      friday_is_working,
      saturday_start,
      saturday_end,
      saturday_is_working,
      sunday_start,
      sunday_end,
      sunday_is_working
    } = body

    if (!name?.trim()) {
      return NextResponse.json({ 
        error: 'Template name is required' 
      }, { status: 400 })
    }

    // If this template is set as default, unset other defaults
    if (is_default) {
      const { error: updateError } = await supabase
        .from('work_schedule_templates')
        .update({ is_default: false })
        .eq('organization_id', profile.organization_id)
        .eq('is_default', true)

      if (updateError) {
        console.error('Error unsetting default templates:', updateError)
      }
    }

    // Create the template
    const { data: template, error: insertError } = await supabase
      .from('work_schedule_templates')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        schedule_type: schedule_type || 'fixed',
        is_default: is_default || false,
        organization_id: profile.organization_id,
        created_by: user.id,
        monday_start,
        monday_end,
        monday_is_working: monday_is_working || false,
        tuesday_start,
        tuesday_end,
        tuesday_is_working: tuesday_is_working || false,
        wednesday_start,
        wednesday_end,
        wednesday_is_working: wednesday_is_working || false,
        thursday_start,
        thursday_end,
        thursday_is_working: thursday_is_working || false,
        friday_start,
        friday_end,
        friday_is_working: friday_is_working || false,
        saturday_start,
        saturday_end,
        saturday_is_working: saturday_is_working || false,
        sunday_start,
        sunday_end,
        sunday_is_working: sunday_is_working || false
      })
      .select()
      .single()

    if (insertError) {
      console.error('Create template error:', insertError)
      return NextResponse.json({ 
        error: 'Failed to create template',
        details: insertError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      template,
      message: 'Template created successfully'
    })

  } catch (error) {
    console.error('Create template API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 