import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

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
    const supabase = await createClient()
    
    // Get user and organization
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Get themes for the organization
    const { data: themes, error } = await supabase
      .from('design_themes')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      // If table doesn't exist, return empty array instead of error
      if (error.code === '42P01') { // table does not exist
        console.log('design_themes table does not exist yet, returning empty array')
        return NextResponse.json([])
      }
      return NextResponse.json({ error: 'Failed to fetch themes' }, { status: 500 })
    }

    // Transform database format to frontend format
    const transformedThemes = themes?.map((theme: any) => ({
      id: theme.id,
      name: theme.name,
      description: theme.description,
      tokens: theme.theme_data,
      createdAt: theme.created_at,
      updatedAt: theme.updated_at,
      isDefault: theme.is_default
    })) || []

    // Find the current/default theme
    const currentTheme = transformedThemes.find((theme: any) => theme.isDefault)

    return NextResponse.json({
      themes: transformedThemes,
      currentTheme: currentTheme || null
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/themes - Create new theme
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get user and organization
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const { name, description, tokens } = await request.json()

    if (!name || !tokens) {
      return NextResponse.json({ error: 'Name and tokens are required' }, { status: 400 })
    }

    // Insert new theme
    const { data: savedTheme, error } = await supabase
      .from('design_themes')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        theme_data: tokens,
        organization_id: profile.organization_id,
        created_by: user.id,
        is_default: false
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to save theme' }, { status: 500 })
    }

    // Transform to frontend format
    const transformedTheme = {
      id: savedTheme.id,
      name: savedTheme.name,
      description: savedTheme.description,
      tokens: savedTheme.theme_data,
      createdAt: savedTheme.created_at,
      updatedAt: savedTheme.updated_at,
      isDefault: savedTheme.is_default
    }

    return NextResponse.json(transformedTheme, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/themes - Delete theme
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get user and organization
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Theme ID is required' }, { status: 400 })
    }

    // Check if theme exists and belongs to organization
    const { data: theme } = await supabase
      .from('design_themes')
      .select('is_default')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!theme) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 })
    }

    if (theme.is_default) {
      return NextResponse.json({ error: 'Cannot delete default theme' }, { status: 400 })
    }

    // Delete theme
    const { error } = await supabase
      .from('design_themes')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.organization_id)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to delete theme' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/themes - Update existing theme or create/update default theme
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get user and organization
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const { id, name, description, tokens, setAsDefault } = await request.json()

    if (!tokens) {
      return NextResponse.json({ error: 'Tokens are required' }, { status: 400 })
    }

    let updatedTheme

    if (id) {
      // Update existing theme
      const { data: theme, error } = await supabase
        .from('design_themes')
        .update({
          name: name?.trim(),
          description: description?.trim() || null,
          theme_data: tokens,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('organization_id', profile.organization_id)
        .select()
        .single()

      if (error) {
        console.error('Database error:', error)
        return NextResponse.json({ error: 'Failed to update theme' }, { status: 500 })
      }

      updatedTheme = theme
    } else {
      // Create new theme or update default
      
      // First, check if there's already a default theme
      const { data: existingDefault } = await supabase
        .from('design_themes')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('is_default', true)
        .single()

      if (existingDefault) {
        // Update existing default theme
        const { data: theme, error } = await supabase
          .from('design_themes')
          .update({
            theme_data: tokens,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingDefault.id)
          .select()
          .single()

        if (error) {
          console.error('Database error:', error)
          return NextResponse.json({ error: 'Failed to update default theme' }, { status: 500 })
        }

        updatedTheme = theme
      } else {
        // Create new default theme
        const { data: theme, error } = await supabase
          .from('design_themes')
          .insert({
            name: name || 'Default Theme',
            description: description?.trim() || 'Default organization theme',
            theme_data: tokens,
            organization_id: profile.organization_id,
            created_by: user.id,
            is_default: true
          })
          .select()
          .single()

        if (error) {
          console.error('Database error:', error)
          return NextResponse.json({ error: 'Failed to create default theme' }, { status: 500 })
        }

        updatedTheme = theme
      }
    }

    // If setAsDefault is true, update the default status
    if (setAsDefault && id) {
      // First, remove default status from all themes
      await supabase
        .from('design_themes')
        .update({ is_default: false })
        .eq('organization_id', profile.organization_id)

      // Then set this theme as default
      await supabase
        .from('design_themes')
        .update({ is_default: true })
        .eq('id', id)
        .eq('organization_id', profile.organization_id)
    }

    // Transform to frontend format
    const transformedTheme = {
      id: updatedTheme.id,
      name: updatedTheme.name,
      description: updatedTheme.description,
      tokens: updatedTheme.theme_data,
      createdAt: updatedTheme.created_at,
      updatedAt: updatedTheme.updated_at,
      isDefault: updatedTheme.is_default
    }

    return NextResponse.json(transformedTheme)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 