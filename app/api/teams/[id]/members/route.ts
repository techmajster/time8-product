import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { authenticateAndGetOrgContext, isManagerOrAdmin } from '@/lib/auth-utils-v2'

// GET /api/teams/[id]/members - Get team members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      return auth.error
    }

    const { context } = auth
    const { organization, role } = context
    const organizationId = organization.id

    // Only admins and owners can view team members
    if (!['admin', 'owner'].includes(role)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // Fetch team members with user details
    const { data: members, error } = await supabase
      .from('user_organizations')
      .select(`
        user_id,
        role,
        team_id,
        profiles!user_organizations_user_id_fkey (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('team_id', teamId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching team members:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('[API] Fetched members:', {
      teamId,
      count: members?.length,
      members: members
    })

    // Transform data to match expected format
    const transformedMembers = members?.map((m: any) => {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      return {
        id: profile?.id,
        email: profile?.email,
        full_name: profile?.full_name,
        avatar_url: profile?.avatar_url,
        role: m.role
      }
    }) || []

    console.log('[API] Transformed members:', transformedMembers.length)

    return NextResponse.json({ members: transformedMembers })
  } catch (error) {
    console.error('Team members GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/teams/[id]/members - Add member to team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      return auth.error
    }

    const { context } = auth
    const { user, organization, role } = context
    const organizationId = organization.id
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
      .from('user_organizations')
      .update({ team_id: teamId })
      .in('user_id', member_ids)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .select(`
        user_id,
        team_id,
        profiles!user_organizations_user_id_fkey (
          id, full_name, email, role, avatar_url
        )
      `)

    if (error) {
      console.error('Error adding members to team:', error)
      return NextResponse.json({ error: 'Failed to add members to team', details: error.message }, { status: 500 })
    }

    // Transform the response to match expected format
    const transformedMembers = updatedMembers?.map((userOrg: any) => ({
      id: userOrg.profiles?.id,
      full_name: userOrg.profiles?.full_name,
      email: userOrg.profiles?.email,
      role: userOrg.profiles?.role,
      avatar_url: userOrg.profiles?.avatar_url
    })) || []

    return NextResponse.json({
      message: `Successfully added ${transformedMembers.length} member(s) to team`,
      members: transformedMembers
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
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      return auth.error
    }

    const { context } = auth
    const { user, organization, role } = context
    const organizationId = organization.id
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
      .from('user_organizations')
      .update({ team_id: null })
      .in('user_id', member_ids)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .select(`
        user_id,
        profiles!user_organizations_user_id_fkey (
          id, full_name, email, role, avatar_url
        )
      `)

    if (error) {
      console.error('Error removing members from team:', error)
      return NextResponse.json({ error: 'Failed to remove members from team', details: error.message }, { status: 500 })
    }

    // Transform the response to match expected format
    const transformedMembers = updatedMembers?.map((userOrg: any) => ({
      id: userOrg.profiles?.id,
      full_name: userOrg.profiles?.full_name,
      email: userOrg.profiles?.email,
      role: userOrg.profiles?.role,
      avatar_url: userOrg.profiles?.avatar_url
    })) || []

    return NextResponse.json({
      message: `Successfully removed ${transformedMembers.length} member(s) from team`,
      members: transformedMembers
    })

  } catch (error) {
    console.error('Team members DELETE API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 