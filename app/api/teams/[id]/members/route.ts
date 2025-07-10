import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBasicAuth, isManagerOrAdmin } from '@/lib/auth-utils'

// POST /api/teams/[id]/members - Add member to team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params
    const auth = await getBasicAuth()
    if (!auth.success) {
      return auth.error
    }

    const { user, organizationId, role } = auth
    const supabase = await createClient()

    // Check if user can manage this team
    const { data: team } = await supabase
      .from('teams')
      .select('id, name, manager_id, organization_id')
      .eq('id', teamId)
      .eq('organization_id', organizationId)
      .single()

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const canManage = role === 'admin' || 
                     (role === 'manager' && team.manager_id === user.id)

    if (!canManage) {
      return NextResponse.json(
        { error: 'You can only manage teams you are responsible for' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { member_ids } = body

    if (!Array.isArray(member_ids) || member_ids.length === 0) {
      return NextResponse.json(
        { error: 'member_ids must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate all member IDs belong to the organization
    const { data: members } = await supabase
      .from('profiles')
      .select('id, full_name, email, team_id')
      .in('id', member_ids)
      .eq('organization_id', organizationId)

    if (!members || members.length !== member_ids.length) {
      return NextResponse.json(
        { error: 'Some selected members are not valid or not in your organization' },
        { status: 400 }
      )
    }

    // Check if any members are already in other teams
    const membersInOtherTeams = members.filter(m => m.team_id && m.team_id !== teamId)
    if (membersInOtherTeams.length > 0) {
      const names = membersInOtherTeams.map(m => m.full_name || m.email).join(', ')
      return NextResponse.json(
        { error: `These members are already in other teams: ${names}` },
        { status: 400 }
      )
    }

    // Add members to team
    const { data: updatedMembers, error } = await supabase
      .from('profiles')
      .update({ team_id: teamId })
      .in('id', member_ids)
      .select('id, full_name, email, role, avatar_url')

    if (error) {
      console.error('Error adding members to team:', error)
      return NextResponse.json({ error: 'Failed to add members to team' }, { status: 500 })
    }

    return NextResponse.json({
      message: `Successfully added ${updatedMembers.length} member(s) to team "${team.name}"`,
      members: updatedMembers
    })

  } catch (error) {
    console.error('Team members POST API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/teams/[id]/members - Remove member from team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params
    const auth = await getBasicAuth()
    if (!auth.success) {
      return auth.error
    }

    const { user, organizationId, role } = auth
    const supabase = await createClient()

    // Check if user can manage this team
    const { data: team } = await supabase
      .from('teams')
      .select('id, name, manager_id, organization_id')
      .eq('id', teamId)
      .eq('organization_id', organizationId)
      .single()

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const canManage = role === 'admin' || 
                     (role === 'manager' && team.manager_id === user.id)

    if (!canManage) {
      return NextResponse.json(
        { error: 'You can only manage teams you are responsible for' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { member_ids } = body

    if (!Array.isArray(member_ids) || member_ids.length === 0) {
      return NextResponse.json(
        { error: 'member_ids must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate all member IDs are currently in this team
    const { data: members } = await supabase
      .from('profiles')
      .select('id, full_name, email, team_id')
      .in('id', member_ids)
      .eq('organization_id', organizationId)
      .eq('team_id', teamId)

    if (!members || members.length !== member_ids.length) {
      return NextResponse.json(
        { error: 'Some selected members are not in this team' },
        { status: 400 }
      )
    }

    // Remove members from team
    const { data: updatedMembers, error } = await supabase
      .from('profiles')
      .update({ team_id: null })
      .in('id', member_ids)
      .select('id, full_name, email, role, avatar_url')

    if (error) {
      console.error('Error removing members from team:', error)
      return NextResponse.json({ error: 'Failed to remove members from team' }, { status: 500 })
    }

    return NextResponse.json({
      message: `Successfully removed ${updatedMembers.length} member(s) from team "${team.name}"`,
      members: updatedMembers
    })

  } catch (error) {
    console.error('Team members DELETE API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 