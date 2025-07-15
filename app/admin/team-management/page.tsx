import { AppLayout } from '@/components/app-layout'
import { createClient } from '@/lib/supabase/server'
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

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      *,
      organizations (
        id,
        name
      )
    `)
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    redirect('/onboarding')
  }

  // Only admins can access this page
  if (profile.role !== 'admin') {
    redirect('/dashboard')
  }

  // Get all team members with team info and leave balances
  const { data: rawTeamMembers } = await supabase
    .from('profiles')
    .select(`
      id, 
      email, 
      full_name, 
      role, 
      avatar_url,
      team_id,
      teams!profiles_team_id_fkey (
        id,
        name,
        color
      )
    `)
    .eq('organization_id', profile.organization_id)
    .order('full_name', { ascending: true })

  // Transform the data to match interface
  const teamMembers = rawTeamMembers?.map(member => ({
    ...member,
    teams: Array.isArray(member.teams) ? member.teams[0] : member.teams
  })) || []

  // Get leave balances for all members
  const memberIds = teamMembers.map(member => member.id)
  const { data: leaveBalances } = await supabase
    .from('leave_balances')
    .select(`
      *,
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

  // Get teams data
  const { data: teams } = await supabase
    .from('teams')
    .select(`
      id,
      name,
      description,
      color,
      created_at,
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
    .eq('organization_id', profile.organization_id)
    .order('name')

  // Helper functions
  const getLeaveBalance = (userId: string, leaveTypeName: string): number => {
    const balance = leaveBalances?.find(
      b => b.user_id === userId && b.leave_types.name === leaveTypeName
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
    return member.teams?.name || 'Bez zespołu'
  }

  const getManagerName = (member: any): string => {
    // For now, return static manager name as shown in Figma
    // This should be dynamically determined based on team structure
    return 'Paweł Chróściak'
  }

  return (
    <AppLayout>
      <TeamManagementClient 
        teamMembers={teamMembers}
        teams={teams || []}
        leaveBalances={leaveBalances || []}
      />
    </AppLayout>
  )
} 