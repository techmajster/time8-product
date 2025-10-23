import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { authenticateAndGetOrgContext, isManagerOrAdmin } from '@/lib/auth-utils-v2'

/**
 * TEAM/GROUP DETAIL API ENDPOINTS
 * 
 * Note: While the database table and API endpoints use "teams", 
 * the UI terminology uses "groups" to differentiate from organizational teams.
 * These endpoints manage individual sub-groups within an organization.
 */

// GET /api/teams/[id] - Get specific group details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      return auth.error
    }

    const { context } = auth
    const { organization } = context
    const organizationId = organization.id
    const supabase = await createClient()
    const supabaseAdmin = await createAdminClient()

    const { data: team, error } = await supabaseAdmin
      .from('teams')
      .select(`
        id,
        name,
        description,
        created_at,
        updated_at,
        manager:profiles!teams_manager_id_fkey (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      }
      console.error('Error fetching team:', error)
      return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 })
    }

    // Get team members from user_organizations table
    const { data: members } = await supabaseAdmin
      .from('user_organizations')
      .select(`
        user_id,
        role,
        profiles!user_organizations_user_id_fkey (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('team_id', id)
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    // Add members to team object
    const teamWithMembers = {
      ...team,
      members: members?.map(m => {
        const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
        return {
          id: profile?.id,
          full_name: profile?.full_name,
          email: profile?.email,
          role: m.role,
          avatar_url: profile?.avatar_url
        }
      }) || []
    }

    return NextResponse.json({ team: teamWithMembers })

  } catch (error) {
    console.error('Team GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/teams/[id] - Update group
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      return auth.error
    }

    const { context } = auth
    const { user, organization, role } = context
    const organizationId = organization.id
    const supabase = await createClient()
    const supabaseAdmin = await createAdminClient()

    // Get team to check permissions using admin client
    const { data: existingTeam } = await supabaseAdmin
      .from('teams')
      .select('id, manager_id, organization_id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (!existingTeam) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Check if user can update this team
    const canUpdate = role === 'admin' || 
                     (role === 'manager' && existingTeam.manager_id === user.id)

    if (!canUpdate) {
      return NextResponse.json(
        { error: 'You can only update groups you manage' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, manager_id } = body

    // Validate manager_id if provided
    if (manager_id) {
      // Check user_organizations table for manager role in this organization
      const { data: managerOrg } = await supabaseAdmin
        .from('user_organizations')
        .select('user_id, organization_id, role, is_active')
        .eq('user_id', manager_id)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single()

      if (!managerOrg) {
        return NextResponse.json(
          { error: 'Invalid manager selected' },
          { status: 400 }
        )
      }

      if (managerOrg.role !== 'manager' && managerOrg.role !== 'admin') {
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


    const { data: team, error } = await supabaseAdmin
      .from('teams')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        name,
        description,
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
          { error: 'A group with this name already exists' },
          { status: 409 }
        )
      }
      console.error('Error updating team:', error)
      return NextResponse.json({ error: 'Failed to update group' }, { status: 500 })
    }

    return NextResponse.json({ team, message: 'Group updated successfully' })

  } catch (error) {
    console.error('Team PUT API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/teams/[id] - Delete group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      return auth.error
    }

    const { context } = auth
    const { user, organization, role } = context
    const organizationId = organization.id
    const supabase = await createClient()
    const supabaseAdmin = await createAdminClient()


    // Get team to check permissions and member count using admin client
    // Note: After multi-org migration, team membership is stored in user_organizations table
    const { data: existingTeam, error: queryError } = await supabaseAdmin
      .from('teams')
      .select(`
        id, 
        name,
        manager_id, 
        organization_id
      `)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (!existingTeam) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Check if user can delete this team
    const canDelete = role === 'admin' || 
                     (role === 'manager' && existingTeam.manager_id === user.id)

    if (!canDelete) {
      return NextResponse.json(
        { error: 'You can only delete groups you manage' },
        { status: 403 }
      )
    }

    // Delete the team
    // Note: Members will automatically be removed from the group (team_id set to NULL)
    // due to ON DELETE SET NULL constraint in the database
    const { error } = await supabaseAdmin
      .from('teams')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting team:', error)
      return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `Group "${existingTeam.name}" deleted successfully` 
    })

  } catch (error) {
    console.error('Team DELETE API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 