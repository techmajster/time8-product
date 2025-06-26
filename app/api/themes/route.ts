import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getBasicAuth } from '@/lib/auth-utils'

export interface DesignTheme {
  id?: string
  name: string
  description?: string
  organization_id: string
  created_by: string
  theme_data: {
    colors: Record<string, string>
    typography: Record<string, string>
    spacing: Record<string, string>
    borderRadius: Record<string, string>
    shadows: Record<string, string>
  }
  is_default?: boolean
  is_active?: boolean
  version?: number
  created_at?: string
  updated_at?: string
}

// GET /api/themes - List all themes for organization
export async function GET() {
  try {
    const auth = await getBasicAuth()
    if (!auth.success) return auth.error
    const { organizationId } = auth

    const supabase = await createClient()
    
    const { data: themes, error } = await supabase
      .from('design_themes')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching themes:', error)
      return NextResponse.json({ error: 'Failed to fetch themes' }, { status: 500 })
    }

    return NextResponse.json({ themes })
  } catch (error) {
    console.error('Themes GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/themes - Create new theme
export async function POST(request: NextRequest) {
  try {
    const auth = await getBasicAuth()
    if (!auth.success) return auth.error
    const { organizationId, user } = auth

    const body = await request.json()
    const { name, description, theme_data, is_default = false } = body

    if (!name || !theme_data) {
      return NextResponse.json({ error: 'Name and theme_data are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // If this is being set as default, unset other defaults first
    if (is_default) {
      await supabase
        .from('design_themes')
        .update({ is_default: false })
        .eq('organization_id', organizationId)
        .eq('is_default', true)
    }

    const themeToCreate: Partial<DesignTheme> = {
      name,
      description,
      organization_id: organizationId,
      created_by: user.id,
      theme_data,
      is_default,
      is_active: true,
      version: 1
    }

    const { data: theme, error } = await supabase
      .from('design_themes')
      .insert(themeToCreate)
      .select()
      .single()

    if (error) {
      console.error('Error creating theme:', error)
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'Theme name already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create theme' }, { status: 500 })
    }

    return NextResponse.json({ theme }, { status: 201 })
  } catch (error) {
    console.error('Themes POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/themes - Update existing theme (used for setting default)
export async function PUT(request: NextRequest) {
  try {
    const auth = await getBasicAuth()
    if (!auth.success) return auth.error
    const { organizationId } = auth

    const body = await request.json()
    const { id, is_default } = body

    if (!id) {
      return NextResponse.json({ error: 'Theme ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // If setting as default, unset other defaults first
    if (is_default) {
      await supabase
        .from('design_themes')
        .update({ is_default: false })
        .eq('organization_id', organizationId)
        .eq('is_default', true)
    }

    const { data: theme, error } = await supabase
      .from('design_themes')
      .update({ is_default })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('Error updating theme:', error)
      return NextResponse.json({ error: 'Failed to update theme' }, { status: 500 })
    }

    return NextResponse.json({ theme })
  } catch (error) {
    console.error('Themes PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/themes - Delete theme
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getBasicAuth()
    if (!auth.success) return auth.error
    const { organizationId } = auth

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Theme ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if theme exists and belongs to organization
    const { data: existingTheme } = await supabase
      .from('design_themes')
      .select('is_default')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (!existingTheme) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 })
    }

    if (existingTheme.is_default) {
      return NextResponse.json({ error: 'Cannot delete default theme' }, { status: 400 })
    }

    const { error } = await supabase
      .from('design_themes')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error deleting theme:', error)
      return NextResponse.json({ error: 'Failed to delete theme' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Themes DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 