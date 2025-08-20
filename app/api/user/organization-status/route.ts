import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface OrganizationStatusResponse {
  scenario: 'has_organizations' | 'has_invitations' | 'no_invitations'
  hasOrganizations: boolean
  organizations?: Array<{
    organization_id: string
    role: string
    is_default: boolean
    is_active: boolean
    organizations: {
      name: string
      slug?: string
    }
  }>
  defaultOrganization?: {
    id: string
    name: string
    role: string
  }
  pendingInvitations?: Array<{
    id: string
    organization_id: string
    role: string
    team_id?: string | null
    organizations: {
      name: string
    }
    teams?: {
      name: string
    } | null
  }>
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user has any organization memberships
    const { data: userOrganizations, error: orgError } = await supabase
      .from('user_organizations')
      .select(`
        organization_id,
        role,
        is_default,
        is_active,
        organizations!inner(
          name,
          slug
        )
      `)
      .eq('user_id', user.id)

    if (orgError) {
      console.error('Error checking user organizations:', orgError)
      return NextResponse.json(
        { error: 'Failed to check organization status' },
        { status: 500 }
      )
    }

    // If user has organizations, they should go to dashboard
    if (userOrganizations && userOrganizations.length > 0) {
      const defaultOrg = userOrganizations.find(org => org.is_default) || userOrganizations[0]
      
      return NextResponse.json<OrganizationStatusResponse>({
        scenario: 'has_organizations',
        hasOrganizations: true,
        organizations: userOrganizations,
        defaultOrganization: {
          id: defaultOrg.organization_id,
          name: defaultOrg.organizations.name,
          role: defaultOrg.role
        }
      })
    }

    // Check for pending invitations
    const { data: pendingInvitations, error: invitationError } = await supabase
      .from('invitations')
      .select(`
        id,
        organization_id,
        role,
        team_id,
        organizations!inner(
          name
        ),
        teams(
          name
        )
      `)
      .eq('email', user.email?.toLowerCase())
      .eq('status', 'pending')

    if (invitationError) {
      console.error('Error checking pending invitations:', invitationError)
      return NextResponse.json(
        { error: 'Failed to check organization status' },
        { status: 500 }
      )
    }

    // If user has pending invitations, show choice screen
    if (pendingInvitations && pendingInvitations.length > 0) {
      return NextResponse.json<OrganizationStatusResponse>({
        scenario: 'has_invitations',
        hasOrganizations: false,
        pendingInvitations
      })
    }

    // User has no organizations and no invitations - show welcome screen
    return NextResponse.json<OrganizationStatusResponse>({
      scenario: 'no_invitations',
      hasOrganizations: false,
      pendingInvitations: []
    })

  } catch (error) {
    console.error('Organization status API error:', error)
    return NextResponse.json(
      { error: 'Failed to check organization status' },
      { status: 500 }
    )
  }
}