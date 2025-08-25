import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Enhanced response interface for new onboarding flow
export interface OrganizationStatusResponse {
  scenario: 'welcome' | 'choice' | 'multi-option' | 'invitation'
  userWorkspaces: Array<{
    id: string
    name: string
    initials: string
    memberCount: number
    memberAvatars: Array<{
      id: string
      full_name: string
      avatar_url: string | null
    }>
    role: string
  }>
  pendingInvitations: Array<{
    id: string
    organizationName: string
    organizationInitials: string
    inviterName: string
    inviterEmail: string
    token: string
  }>
  canCreateWorkspace: boolean
}

// Helper function to calculate organization initials
function calculateInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  if (words.length === 1 && words[0].length >= 2) {
    return (words[0][0] + words[0][1]).toUpperCase()
  }
  return (words[0][0] + words[0][0]).toUpperCase()
}


export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Organization status API called')
    
    // Get authenticated user
    const supabase = await createClient()
    console.log('✅ Supabase client created')
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('👤 User check result:', { hasUser: !!user, error: userError?.message })
    
    if (userError || !user) {
      console.log('❌ User not authenticated')
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    console.log('✅ User authenticated:', user.email)

    // Check if user has any organization memberships 
    console.log('🏢 Checking user organizations...')
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
      .eq('is_active', true)

    if (orgError) {
      console.error('❌ Error checking user organizations:', orgError)
      // Don't fail completely - continue with empty organizations
      console.log('⚠️ Continuing with empty organizations due to error')
    }
    
    console.log('🏢 User organizations result:', { count: userOrganizations?.length || 0, orgError: orgError?.message })

    // Check for pending invitations with inviter details - use admin client to avoid RLS issues
    console.log('📧 Checking pending invitations...')
    const { data: pendingInvitations, error: invitationError } = await createAdminClient()
      .from('invitations')
      .select(`
        id,
        organization_id,
        role,
        team_id,
        invited_by,
        token,
        organizations!inner(
          name
        ),
        teams(
          name
        ),
        invited_by_profiles:profiles!invited_by(
          full_name,
          email
        )
      `)
      .eq('email', user.email?.toLowerCase())
      .eq('status', 'pending')

    if (invitationError) {
      console.error('❌ Error checking pending invitations:', invitationError)
      // Don't fail completely - continue with empty invitations
      console.log('⚠️ Continuing with empty invitations due to error')
    }
    
    console.log('📧 Pending invitations result:', { count: pendingInvitations?.length || 0, invitationError: invitationError?.message })

    // Get member counts for each organization (if user has workspaces)
    let memberCounts: { [orgId: string]: number } = {}
    if (userOrganizations && userOrganizations.length > 0) {
      const orgIds = userOrganizations.map(org => org.organization_id)
      const { data: memberCountsData } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .in('organization_id', orgIds)
        .eq('is_active', true)
      
      // Count members per organization
      if (memberCountsData) {
        memberCountsData.forEach(item => {
          memberCounts[item.organization_id] = (memberCounts[item.organization_id] || 0) + 1
        })
      }
    }

    // Get member avatars for each organization
    let memberAvatarsData: { [orgId: string]: any[] } = {}
    if (userOrganizations && userOrganizations.length > 0) {
      const orgIds = userOrganizations.map(org => org.organization_id)
      // Query user_organizations and join profiles using admin client to get ALL members
      const { data: membersData, error: membersError } = await createAdminClient()
        .from('user_organizations')
        .select(`
          organization_id,
          user_id,
          profiles!user_organizations_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .in('organization_id', orgIds)
        .eq('is_active', true)
        
      console.log('👥 Members query error:', membersError)
      console.log('👥 Members query orgIds:', orgIds)
        
      if (membersData) {
        console.log('👥 Members data from database:', JSON.stringify(membersData, null, 2))
        // Group members by organization_id (back to original structure)
        membersData.forEach(member => {
          if (!memberAvatarsData[member.organization_id]) {
            memberAvatarsData[member.organization_id] = []
          }
          if (member.profiles) {
            memberAvatarsData[member.organization_id].push({
              id: member.profiles.id,
              full_name: member.profiles.full_name,
              avatar_url: member.profiles.avatar_url
            })
          }
        })
        console.log('👥 Grouped member avatars data:', JSON.stringify(memberAvatarsData, null, 2))
      }
    }

    // Format user workspaces (handle errors gracefully)
    const userWorkspaces = (userOrganizations || []).map(org => ({
      id: org.organization_id,
      name: org.organizations.name,
      initials: calculateInitials(org.organizations.name),
      memberCount: memberCounts[org.organization_id] || 1,
      memberAvatars: memberAvatarsData[org.organization_id] || [],
      role: org.role
    }))

    // Format pending invitations (handle errors gracefully)
    const formattedInvitations = (pendingInvitations || []).map(inv => ({
      id: inv.id,
      organizationId: inv.organization_id,
      organizationName: inv.organizations.name,
      organizationInitials: calculateInitials(inv.organizations.name),
      inviterName: inv.invited_by_profiles?.full_name || 'Unknown',
      inviterEmail: inv.invited_by_profiles?.email || 'unknown@email.com',
      token: inv.token // Use the actual database token, not a generated one
    }))

    // Determine scenario based on business rules
    let scenario: 'welcome' | 'choice' | 'multi-option' | 'invitation'

    if (userWorkspaces.length === 0 && formattedInvitations.length === 0) {
      // Scenario 1: No workspaces, no invitations -> Welcome screen
      scenario = 'welcome'
    } else if (userWorkspaces.length === 0 && formattedInvitations.length === 1) {
      // Scenario 2: No workspaces, single invitation -> Choice screen  
      scenario = 'choice'
    } else {
      // Scenario 3: Has workspaces OR multiple invitations -> Multi-option screen
      scenario = 'multi-option'
    }
    
    console.log('✅ Scenario determined:', { 
      scenario, 
      workspaceCount: userWorkspaces.length, 
      invitationCount: formattedInvitations.length 
    })

    const response = {
      scenario,
      userWorkspaces,
      pendingInvitations: formattedInvitations,
      canCreateWorkspace: true // Users can always create new workspaces
    }
    
    console.log('📤 Sending response:', response)
    return NextResponse.json<OrganizationStatusResponse>(response)

  } catch (error) {
    console.error('Organization status API error:', error)
    return NextResponse.json(
      { error: 'Failed to check organization status' },
      { status: 500 }
    )
  }
}