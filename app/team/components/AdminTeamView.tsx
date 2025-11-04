'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { useTeamMembersQuery, useTeamLeaveBalances } from '@/hooks/use-team-queries'

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

interface Team {
  id: string
  name: string
  color: string
}

interface AdminTeamViewProps {
  organizationId: string
  initialTeamMembers: TeamMember[]
  initialLeaveBalances: LeaveBalance[]
  teams: Team[]
  currentUser: any
}

export function AdminTeamView({
  organizationId,
  initialTeamMembers,
  initialLeaveBalances,
  teams
}: AdminTeamViewProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all')

  // Use React Query hooks with initial SSR data
  const { data: teamMembers = initialTeamMembers } = useTeamMembersQuery(
    organizationId,
    undefined,
    initialTeamMembers
  )
  const { data: leaveBalances = initialLeaveBalances } = useTeamLeaveBalances(
    organizationId,
    new Date().getFullYear(),
    initialLeaveBalances
  )

  // Filter team members based on selected team
  const filteredMembers = selectedTeamId === 'all'
    ? teamMembers
    : selectedTeamId === 'no-team'
    ? teamMembers.filter(member => !member.team_id)
    : teamMembers.filter(member => member.team_id === selectedTeamId)

  // Get leave balance for a specific user and leave type
  const getLeaveBalance = (userId: string, leaveTypeName: string): number => {
    const balance = leaveBalances.find(
      b => b.user_id === userId && b.leave_types.name === leaveTypeName
    )
    return balance?.remaining_days || 0
  }

  // Get user initials for avatar fallback
  const getUserInitials = (member: TeamMember): string => {
    if (member.full_name) {
      return member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    }
    return member.email.charAt(0).toUpperCase()
  }

  return (
    <div className="py-11 space-y-6">
      {/* Header with Team Selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-foreground">Mój zespół</h1>
        <div className="flex items-center gap-3">
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-fit">
              <SelectValue placeholder="Wybierz zespół" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  Wszyscy ({teamMembers.length})
                </div>
              </SelectItem>
              {teams.map((team) => {
                const teamMemberCount = teamMembers.filter(m => m.team_id === team.id).length
                return (
                  <SelectItem key={team.id} value={team.id}>
                    <div className="flex items-center gap-2">
                      {team.name} ({teamMemberCount})
                    </div>
                  </SelectItem>
                )
              })}
              {teamMembers.filter(m => !m.team_id).length > 0 && (
                <SelectItem value="no-team">
                  <div className="flex items-center gap-2">
                    Bez zespołu ({teamMembers.filter(m => !m.team_id).length})
                  </div>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Link href="/admin/team-management/add-employee">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Dodaj pracownika
            </Button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-medium text-muted-foreground">Wnioskujący</TableHead>
                <TableHead className="font-medium text-muted-foreground w-52">Zespół</TableHead>
                <TableHead className="font-medium text-muted-foreground w-[202px]">Akceptujący</TableHead>
                <TableHead className="font-medium text-muted-foreground w-[131px] text-right">Pozostały urlop</TableHead>
                <TableHead className="font-medium text-muted-foreground w-[161px] text-right">Urlop NŻ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 text-center">
                    <div className="text-muted-foreground">
                      {selectedTeamId === 'all' 
                        ? 'Brak pracowników w organizacji' 
                        : 'Brak pracowników w wybranym zespole'
                      }
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => {
                  const vacationDays = getLeaveBalance(member.id, 'Urlop wypoczynkowy')
                  const parentalDays = getLeaveBalance(member.id, 'Urlop NŻ') || getLeaveBalance(member.id, 'Urlop na żądanie')
                  
                  return (
                    <TableRow key={member.id} className="h-[72px]">
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
                              {member.full_name || 'Bez nazwiska'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-foreground">
                            {member.teams?.name || 'Bez zespołu'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          Paweł Chróściak
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-foreground">
                          {vacationDays} dni
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-foreground">
                          {parentalDays} dni
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}


    </div>
  )
}