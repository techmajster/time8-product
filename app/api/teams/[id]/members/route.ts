import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
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

    // Basic permission check
    if (role !== 'admin' && role !== 'manager') {
      return NextResponse.json(
        { error: 'You do not have permission to manage team members' },
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

    // Simply add members to team - no complex validation
    let supabaseAdmin;
    try {
      supabaseAdmin = createAdminClient()
    } catch (adminError) {
      console.error('Admin client creation failed:', adminError)
      return NextResponse.json({ 
        error: 'Admin client not configured. Please add SUPABASE_SERVICE_ROLE_KEY to environment variables.' 
      }, { status: 500 })
    }

    const { data: updatedMembers, error } = await supabaseAdmin
      .from('profiles')
      .update({ team_id: teamId })
      .in('id', member_ids)
      .select('id, full_name, email, role, avatar_url')

    if (error) {
      console.error('Error adding members to team:', error)
      return NextResponse.json({ error: 'Failed to add members to team', details: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: `Successfully added ${updatedMembers?.length || 0} member(s) to team`,
      members: updatedMembers || []
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

    // Basic permission check
    if (role !== 'admin' && role !== 'manager') {
      return NextResponse.json(
        { error: 'You do not have permission to manage team members' },
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

    // Simply remove members from team - no complex validation
    let supabaseAdmin;
    try {
      supabaseAdmin = createAdminClient()
    } catch (adminError) {
      console.error('Admin client creation failed:', adminError)
      return NextResponse.json({ 
        error: 'Admin client not configured. Please add SUPABASE_SERVICE_ROLE_KEY to environment variables.' 
      }, { status: 500 })
    }

    const { data: updatedMembers, error } = await supabaseAdmin
      .from('profiles')
      .update({ team_id: null })
      .in('id', member_ids)
      .select('id, full_name, email, role, avatar_url')

    if (error) {
      console.error('Error removing members from team:', error)
      return NextResponse.json({ error: 'Failed to remove members from team', details: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: `Successfully removed ${updatedMembers?.length || 0} member(s) from team`,
      members: updatedMembers || []
    })

  } catch (error) {
    console.error('Team members DELETE API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 