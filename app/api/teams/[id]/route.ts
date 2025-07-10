import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBasicAuth, isManagerOrAdmin } from '@/lib/auth-utils'

// GET /api/teams/[id] - Get specific team details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getBasicAuth()
    if (!auth.success) {
      return auth.error
    }

    const { organizationId } = auth
    const supabase = await createClient()

    const { data: team, error } = await supabase
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
          email,
          avatar_url
        ),
        members:profiles!profiles_team_id_fkey (
          id,
          full_name,
          email,
          role,
          avatar_url
        )
      `)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 })
      }
      console.error('Error fetching team:', error)
      return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 })
    }

    return NextResponse.json({ team })

  } catch (error) {
    console.error('Team GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/teams/[id] - Update team
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getBasicAuth()
    if (!auth.success) {
      return auth.error
    }

    const { user, organizationId, role } = auth
    const supabase = await createClient()

    // Get team to check permissions
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id, manager_id, organization_id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (!existingTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Check if user can update this team
    const canUpdate = role === 'admin' || 
                     (role === 'manager' && existingTeam.manager_id === user.id)

    if (!canUpdate) {
      return NextResponse.json(
        { error: 'You can only update teams you manage' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, manager_id, color } = body

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

    // Update the team
    const updateData: any = {}
    if (name?.trim()) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (manager_id !== undefined) updateData.manager_id = manager_id
    if (color) updateData.color = color

    const { data: team, error } = await supabase
      .from('teams')
      .update(updateData)
      .eq('id', id)
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
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A team with this name already exists' },
          { status: 409 }
        )
      }
      console.error('Error updating team:', error)
      return NextResponse.json({ error: 'Failed to update team' }, { status: 500 })
    }

    return NextResponse.json({ team, message: 'Team updated successfully' })

  } catch (error) {
    console.error('Team PUT API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/teams/[id] - Delete team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getBasicAuth()
    if (!auth.success) {
      return auth.error
    }

    const { user, organizationId, role } = auth
    const supabase = await createClient()

    // Get team to check permissions and member count
    const { data: existingTeam } = await supabase
      .from('teams')
      .select(`
        id, 
        name,
        manager_id, 
        organization_id,
        members:profiles!profiles_team_id_fkey (id)
      `)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (!existingTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Check if user can delete this team
    const canDelete = role === 'admin' || 
                     (role === 'manager' && existingTeam.manager_id === user.id)

    if (!canDelete) {
      return NextResponse.json(
        { error: 'You can only delete teams you manage' },
        { status: 403 }
      )
    }

    // Check if team has members
    const memberCount = Array.isArray(existingTeam.members) ? existingTeam.members.length : 0
    if (memberCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete team with members. Remove all members first.' },
        { status: 400 }
      )
    }

    // Delete the team
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting team:', error)
      return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `Team "${existingTeam.name}" deleted successfully` 
    })

  } catch (error) {
    console.error('Team DELETE API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 