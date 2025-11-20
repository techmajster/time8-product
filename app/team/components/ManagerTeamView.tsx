'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTeamMembersQuery, useTeamLeaveBalances } from '@/hooks/use-team-queries'
import { useTranslations } from 'next-intl'
import { getInitials } from '@/lib/utils/initials'

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: string
  avatar_url: string | null
  team_id: string | null
  teams?: {
    id: string
    name: string
    color: string
    manager_id: string | null
    manager: {
      id: string
      full_name: string | null
      email: string
    } | null
  } | null
}

interface LeaveBalance {
  id: string
  user_id: string
  leave_type_id: string
  remaining_days: number
  leave_types: {
    id: string
    name: string
    color: string
    requires_balance: boolean
  }
}

interface ManagerTeamViewProps {
  organizationId: string
  teamId: string
  initialTeamMembers: TeamMember[]
  initialLeaveBalances: LeaveBalance[]
  leaveRequests: any[]
  managerName: string
  teamManager: {
    id: string
    full_name: string | null
    email: string
  } | null
}

export function ManagerTeamView({
  organizationId,
  teamId,
  initialTeamMembers,
  initialLeaveBalances,
  teamManager
}: ManagerTeamViewProps) {
  const t = useTranslations('team')

  // Use React Query hooks with initial SSR data
  const { data: teamMembers = initialTeamMembers } = useTeamMembersQuery(
    organizationId,
    teamId,
    initialTeamMembers
  )
  const { data: leaveBalances = initialLeaveBalances } = useTeamLeaveBalances(
    organizationId,
    new Date().getFullYear(),
    initialLeaveBalances
  )

  // Get leave balance for a specific user and leave type
  const getLeaveBalance = (userId: string, leaveTypeName: string): number => {
    const balance = leaveBalances.find(
      b => b.user_id === userId && b.leave_types.name === leaveTypeName
    )
    return balance?.remaining_days || 0
  }

  // Get user initials for avatar fallback
  const getUserInitials = (member: TeamMember): string => {
    return getInitials(member.full_name, member.email.charAt(0).toUpperCase())
  }

  // Get approver for a team member
  const getApprover = (member: TeamMember): string => {
    // If member has a team with a manager, show the manager
    if (member.teams?.manager?.full_name) {
      return member.teams.manager.full_name
    }
    // Otherwise, show the team manager from props
    if (teamManager?.full_name) {
      return teamManager.full_name
    }
    // Fallback
    return t('notAssigned')
  }

  return (
    <div className="py-11 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">{t('myTeam')}</h1>
      </div>

      {/* Table */}
      <div className="border-0">
        <Table>
          <TableHeader>
            <TableRow className="border-b">
              <TableHead className="font-medium text-muted-foreground">{t('employeeColumn')}</TableHead>
              <TableHead className="font-medium text-muted-foreground w-52">{t('teamColumn')}</TableHead>
              <TableHead className="font-medium text-muted-foreground w-[202px]">{t('approverColumn')}</TableHead>
              <TableHead className="font-medium text-muted-foreground w-[131px] text-right">{t('remainingVacation')}</TableHead>
              <TableHead className="font-medium text-muted-foreground w-[161px] text-right">{t('unpaidLeave')}</TableHead>
            </TableRow>
          </TableHeader>
            <TableBody>
              {teamMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 text-center">
                    <div className="text-muted-foreground">
                      {t('notAssigned')}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                teamMembers.map((member) => {
                  const vacationDays = getLeaveBalance(member.id, 'Urlop wypoczynkowy')
                  const unpaidDays = getLeaveBalance(member.id, 'Urlop bezpłatny')
                  const approver = getApprover(member)

                  return (
                    <TableRow key={member.id} className="h-[52px]">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="text-sm font-medium">
                              {getUserInitials(member)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-foreground">
                              {member.full_name || t('noLastName')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {member.teams?.name || t('notAssigned')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {approver}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-foreground">
                          {vacationDays} {t('days')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-foreground">
                          {unpaidDays} {t('days')}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
      </div>
    </div>
  )
} 