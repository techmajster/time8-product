import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBasicAuth, isManagerOrAdmin } from '@/lib/auth-utils'

// GET /api/teams - List all teams in organization
export async function GET() {
  try {
    const auth = await getBasicAuth()
    if (!auth.success) {
      return auth.error
    }

    const { organizationId } = auth
    const supabase = await createClient()

    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        description,
        color,
        created_at,
        updated_at,
        manager:profiles!teams_manager_id_fkey (
          id,
          full_name,
          email
        ),
        members:profiles!profiles_team_id_fkey (
          id,
          full_name,
          email,
          role,
          avatar_url
        )
      `)
      .eq('organization_id', organizationId)
      .order('name')

    if (error) {
      console.error('Error fetching teams:', error)
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
    }

    return NextResponse.json({ teams })

  } catch (error) {
    console.error('Teams API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/teams - Create new team
export async function POST(request: NextRequest) {
  try {
    const auth = await getBasicAuth()
    if (!auth.success) {
      return auth.error
    }

    const { user, organizationId, role } = auth

    // Only managers and admins can create teams
    if (!isManagerOrAdmin(role)) {
      return NextResponse.json(
        { error: 'Only managers and admins can create teams' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, manager_id, color } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Validate manager_id if provided
    if (manager_id) {
      const { data: manager } = await supabase
        .from('profiles')
        .select('id, role, organization_id')
        .eq('id', manager_id)
        .eq('organization_id', organizationId)
        .single()

      if (!manager) {
        return NextResponse.json(
          { error: 'Invalid manager selected' },
          { status: 400 }
        )
      }

      if (manager.role !== 'manager' && manager.role !== 'admin') {
        return NextResponse.json(
          { error: 'Selected user is not a manager or admin' },
          { status: 400 }
        )
      }
    }

    // Create the team
    const { data: team, error } = await supabase
      .from('teams')
      .insert({
        organization_id: organizationId,
        name: name.trim(),
        description: description?.trim() || null,
        manager_id: manager_id || null,
        color: color || '#6366f1'
      })
      .select(`
        id,
        name,
        description,
        color,
        created_at,
        updated_at,
        manager:profiles!teams_manager_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'A team with this name already exists' },
          { status: 409 }
        )
      }
      console.error('Error creating team:', error)
      return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
    }

    // Automatically assign the manager to their team if manager_id is provided
    if (manager_id && team?.id) {
      const { error: assignError } = await supabase
        .from('profiles')
        .update({ team_id: team.id })
        .eq('id', manager_id)
        .eq('organization_id', organizationId)

      if (assignError) {
        console.error('Error assigning manager to team:', assignError)
        // Don't fail the team creation, just log the error
      }
    }

    return NextResponse.json({ team, message: 'Team created successfully' }, { status: 201 })

  } catch (error) {
    console.error('Teams API POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 