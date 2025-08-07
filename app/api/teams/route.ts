import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { authenticateAndGetOrgContext, isManagerOrAdmin } from '@/lib/auth-utils-v2'
import { revalidatePath } from 'next/cache'

/**
 * TEAMS API ENDPOINTS
 * 
 * Note: While the database table and API endpoints use "teams", 
 * the UI terminology uses "groups" to differentiate from organizational teams.
 * These endpoints manage sub-groups within an organization.
 */

// GET /api/teams - List all groups in organization
export async function GET() {
  try {
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      return auth.error
    }

    const { context } = auth
    const { organization } = context
    const organizationId = organization.id
    const supabase = await createClient()
    const supabaseAdmin = await createAdminClient()

    const { data: teams, error } = await supabaseAdmin
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
          email
        )
      `)
      .eq('organization_id', organizationId)
      .order('name')

    if (error) {
      console.error('Error fetching teams:', error)
      return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 })
    }

    return NextResponse.json({ teams })

  } catch (error) {
    console.error('Teams API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/teams - Create new group
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      return auth.error
    }

    const { context } = auth
    const { user, organization, role } = context
    const organizationId = organization.id

    // Only managers and admins can create teams
    if (!isManagerOrAdmin(role)) {
      return NextResponse.json(
        { error: 'Only managers and admins can create groups' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, manager_id } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    // Validate manager_id if provided
    if (manager_id) {
      console.log('🔍 Validating manager:', { manager_id, organizationId })
      
      // MULTI-ORG UPDATE: Check user_organizations instead of profiles for role and organization
      // Use admin client to bypass RLS policies for validation
      const { data: managerOrg, error: managerError } = await supabaseAdmin
        .from('user_organizations')
        .select('user_id, organization_id, role, is_active')
        .eq('user_id', manager_id)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single()

      console.log('👤 Manager lookup result:', { managerOrg, managerError })

      if (!managerOrg) {
        console.log('❌ Manager not found in user_organizations table')
        return NextResponse.json(
          { error: 'Invalid manager selected' },
          { status: 400 }
        )
      }

      if (managerOrg.role !== 'manager' && managerOrg.role !== 'admin') {
        console.log('❌ Selected user is not a manager or admin, role:', managerOrg.role)
        return NextResponse.json(
          { error: 'Selected user is not a manager or admin' },
          { status: 400 }
        )
      }
    }

    // Create the team
    console.log('🏢 Creating team with data:', {
      organization_id: organizationId,
      name: name.trim(),
      description: description?.trim() || null,
      manager_id: manager_id || null
    })

    const { data: team, error } = await supabaseAdmin
      .from('teams')
      .insert({
        organization_id: organizationId,
        name: name.trim(),
        description: description?.trim() || null,
        manager_id: manager_id || null
      })
      .select(`
        id,
        name,
        description,
        created_at,
        updated_at,
        manager_id
      `)
      .single()

    console.log('🏢 Team creation result:', { team, error })

    if (error) {
      console.error('❌ Team creation error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'A group with this name already exists' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
    }

    // Automatically assign the manager to their team if manager_id is provided
    if (manager_id && team?.id) {
      console.log('👤 Assigning manager to team:', { manager_id, team_id: team.id })
      
      // MULTI-ORG UPDATE: Update user_organizations instead of profiles
      const { error: assignError } = await supabaseAdmin
        .from('user_organizations')
        .update({ team_id: team.id })
        .eq('user_id', manager_id)
        .eq('organization_id', organizationId)
        .eq('is_active', true)

      if (assignError) {
        console.error('❌ Error assigning manager to team:', assignError)
        // Don't fail the team creation, just log the error
      } else {
        console.log('✅ Manager assigned to team successfully')
      }
    }

    // Revalidate the add-employee page cache to show the new team
    revalidatePath('/admin/team-management/add-employee')
    revalidatePath('/admin/team-management')

    return NextResponse.json({ team, message: 'Group created successfully' }, { status: 201 })

  } catch (error) {
    console.error('Teams API POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 