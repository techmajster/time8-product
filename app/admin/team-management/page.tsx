import { AppLayout } from '@/components/app-layout'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getTranslations } from 'next-intl/server'
import { TeamManagementClient } from './components/TeamManagementClient'

export default async function AdminTeamManagementPage() {
  const t = await getTranslations('admin')
  
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // MULTI-ORG UPDATE: Get user profile and organization via user_organizations
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Get current active organization (respect workspace switching cookie)
  const cookieStore = await cookies()
  const activeOrgId = cookieStore.get('active-organization-id')?.value
  
  let userOrgQuery = supabase
    .from('user_organizations')
    .select(`
      *,
      organizations (
        id,
        name
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    
  // If we have an active org cookie, use that specific org, otherwise use default
  if (activeOrgId) {
    userOrgQuery = userOrgQuery.eq('organization_id', activeOrgId)
    console.log('🍪 Team Management: Using active organization from cookie:', activeOrgId)
  } else {
    userOrgQuery = userOrgQuery.eq('is_default', true)
    console.log('🏠 Team Management: Using default organization (no active cookie)')
  }
  
  const { data: userOrg } = await userOrgQuery.single()

  if (!userOrg) {
    redirect('/onboarding')
  }

  // Add organization context to profile for backward compatibility
  profile.organization_id = userOrg.organization_id
  profile.role = userOrg.role
  profile.organizations = userOrg.organizations

  // Only admins can access this page
  if (userOrg.role !== 'admin') {
    redirect('/dashboard')
  }

  // Get admin client for bypassing RLS issues
  const supabaseAdmin = createAdminClient()
  
  // MULTI-ORG UPDATE: Get all team members via user_organizations instead of profiles
  const { data: rawTeamMembers, error: teamMembersError } = await supabaseAdmin
    .from('user_organizations')
    .select(`
      user_id,
      organization_id,
      role,
      team_id,
      is_active,
      profiles!user_organizations_user_id_fkey (
        id,
        email,
        full_name,
        avatar_url
      ),
      teams!user_organizations_team_id_fkey (
        id,
        name,
        color
      )
    `)
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .order('profiles(full_name)', { ascending: true })

  console.log('👥 Team members query result:', { 
    count: rawTeamMembers?.length || 0, 
    error: teamMembersError,
    organizationId: profile.organization_id 
  })
  console.log('📋 Raw team members data:', rawTeamMembers)
  
  // Debug: Show what users are found
  if (rawTeamMembers) {
    rawTeamMembers.forEach((member: any, index: number) => {
      console.log(`👤 User ${index + 1}:`, {
        user_id: member.user_id,
        email: member.profiles?.email,
        full_name: member.profiles?.full_name,
        role: member.role,
        has_profile: !!member.profiles
      })
    })
  }

  // Get teams data using admin client
  const { data: teams, error: teamsError } = await supabaseAdmin
    .from('teams')
    .select(`
      id,
      name,
      description,
      color,
      created_at,
      manager_id
    `)
    .eq('organization_id', profile.organization_id)
    .order('name')

  console.log('🏢 Teams query result:', { teams, teamsError })

  // Get manager details for teams and member counts
  const teamsWithDetails = teams ? await Promise.all(
    teams.map(async (team) => {
      // Get manager details if manager_id exists
      let manager = null
      if (team.manager_id) {
        const { data: managerProfile } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', team.manager_id)
          .single()
        manager = managerProfile
      }

      // Get member count for this team
      const { count: memberCount } = await supabaseAdmin
        .from('user_organizations')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team.id)
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)

      return {
        ...team,
        manager,
        members: [], // We'll populate this if needed
        member_count: memberCount || 0
      }
    })
  ) : []

  console.log('🏢 Teams with details:', teamsWithDetails)

  // Transform the employee data to match the expected interface and populate team details
  const teamMembers = rawTeamMembers?.map(userOrg => {
    const profile = Array.isArray(userOrg.profiles) ? userOrg.profiles[0] : userOrg.profiles
    
    // Find the team details from our teamsWithDetails array
    const teamDetails = userOrg.team_id ? teamsWithDetails.find(t => t.id === userOrg.team_id) : null
    
    return {
      id: userOrg.user_id, // Use user_id to match what edit page expects
      email: profile?.email || '',
      full_name: profile?.full_name,
      role: userOrg.role,
      avatar_url: profile?.avatar_url,
      team_id: userOrg.team_id,
      teams: teamDetails ? {
        id: teamDetails.id,
        name: teamDetails.name,
        color: teamDetails.color
      } : null
    }
  }) || []

  // Get leave balances for all members using admin client
  const memberIds = teamMembers.map(member => member.id)
  const { data: leaveBalances, error: leaveBalancesError } = await supabaseAdmin
    .from('leave_balances')
    .select(`
      id,
      user_id,
      leave_type_id,
      year,
      entitled_days,
      used_days,
      remaining_days,
      leave_types!inner (
        id,
        name,
        color,
        requires_balance
      )
    `)
    .in('user_id', memberIds)
    .eq('year', new Date().getFullYear())
    .eq('leave_types.requires_balance', true)

  console.log('💰 Team management - leave balances loaded:', { 
    count: leaveBalances?.length || 0, 
    error: leaveBalancesError,
    memberIds: memberIds,
    year: new Date().getFullYear(),
    sampleBalance: leaveBalances?.[0],
    leaveTypeNames: leaveBalances?.map(b => (b.leave_types as any)?.name).filter(Boolean)
  })

  // Get pending invitations with proper serialization
  console.log('🔍 Querying invitations for organization:', profile.organization_id)
  const { data: rawInvitations, error: invitationsError } = await supabaseAdmin
    .from('invitations')
    .select(`
      id,
      email,
      full_name,
      birth_date,
      role,
      status,
      created_at,
      expires_at,
      invitation_code,
      invited_by,
      team_id
    `)
    .eq('organization_id', profile.organization_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    
  console.log('📋 Found raw invitations:', rawInvitations?.length || 0)
  console.log('❌ Invitations error:', invitationsError)

  // Get inviter profiles separately and create simple serializable objects
  const invitations = rawInvitations ? await Promise.all(
    rawInvitations.map(async (invitation) => {
      // Get inviter profile
      const { data: inviterProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', invitation.invited_by)
        .single()

      // Get team name if team_id exists
      let teamName = 'Bez grupy'
      if (invitation.team_id) {
        const { data: team } = await supabaseAdmin
          .from('teams')
          .select('name')
          .eq('id', invitation.team_id)
          .single()
        teamName = team?.name || 'Bez grupy'
      }

      // Create a simple, serializable object
      return {
        id: invitation.id,
        email: invitation.email,
        full_name: invitation.full_name,
        birth_date: invitation.birth_date,
        role: invitation.role,
        status: invitation.status,
        created_at: invitation.created_at,
        expires_at: invitation.expires_at,
        invitation_code: invitation.invitation_code,
        invited_by: invitation.invited_by,
        team_id: invitation.team_id,
        inviter_name: inviterProfile?.full_name || 'Administrator',
        inviter_email: inviterProfile?.email || '',
        team_name: teamName
      }
    })
  ) : []

  console.log('📋 Processed invitations for client:', invitations?.length || 0)
  console.log('📋 Sample invitation:', invitations?.[0])

  // Helper functions
  const getLeaveBalance = (userId: string, leaveTypeName: string): number => {
    const balance = leaveBalances?.find(
      b => b.user_id === userId && (b.leave_types as any).name === leaveTypeName
    )
    return balance?.remaining_days || 0
  }

  const getUserInitials = (member: any): string => {
    if (member.full_name) {
      return member.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    }
    return member.email.charAt(0).toUpperCase()
  }

  const getTeamDisplayName = (member: any): string => {
    return member.teams?.name || 'Bez grupy'
  }



  return (
    <AppLayout>
      <TeamManagementClient 
        teamMembers={teamMembers}
        teams={teamsWithDetails || []}
        leaveBalances={leaveBalances as any || []}
        invitations={invitations || []}
      />
    </AppLayout>
  )
} 