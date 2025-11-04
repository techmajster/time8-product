'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TreePalm, UserCheck, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface TeamMember {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  team_id: string | null
  teams?: {
    id: string
    name: string
    color: string
  } | null
}

interface LeaveRequest {
  user_id: string
  profiles: TeamMember
  leaveType: {
    name: string
    color: string
  }
  endDate: string
}

interface Team {
  id: string
  name: string
  color: string
}

interface TeamCardProps {
  allTeamMembers: TeamMember[]
  absentMembers: LeaveRequest[]
  teams: Team[]
  defaultTeamId?: string
  userRole: string
}

export function TeamCard({ allTeamMembers, absentMembers, teams, defaultTeamId, userRole }: TeamCardProps) {
  const t = useTranslations('dashboard')
  const [selectedTeamId, setSelectedTeamId] = useState<string>(defaultTeamId || 'all')

  // Filter members based on selected team
  const filteredMembers = selectedTeamId === 'all' 
    ? allTeamMembers 
    : selectedTeamId === 'no-team'
    ? allTeamMembers.filter(member => !member.team_id)
    : allTeamMembers.filter(member => member.team_id === selectedTeamId)

  // Filter absent members based on team selection
  const filteredAbsentMembers = selectedTeamId === 'all'
    ? absentMembers
    : absentMembers.filter(req => 
        filteredMembers.some(member => member.id === req.user_id)
      )

  // Calculate working members from filtered list
  const absentMemberIds = new Set(filteredAbsentMembers.map(req => req.user_id))
  const workingMembers = filteredMembers.filter(member => !absentMemberIds.has(member.id))

  const selectedTeam = teams.find(team => team.id === selectedTeamId)

  return (
    <Card className="border border-border">
      <CardContent className="py-0">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-foreground">
            {t('teamTitle')}
          </h3>

          {teams.length > 0 && (userRole === 'admin' || teams.length > 1) && (
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="w-fit">
                <SelectValue placeholder="Wybierz zespół" />
              </SelectTrigger>
              <SelectContent>
                {userRole === 'admin' && (
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      {t('allTeam', { count: allTeamMembers.length })}
                    </div>
                  </SelectItem>
                )}
                {teams.map((team) => {
                  const teamMemberCount = allTeamMembers.filter(m => m.team_id === team.id).length
                  return (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-2">
                        {t('teamWithCount', { name: team.name, count: teamMemberCount })}
                      </div>
                    </SelectItem>
                  )
                })}
                {userRole === 'admin' && allTeamMembers.filter(m => !m.team_id).length > 0 && (
                  <SelectItem value="no-team">
                    <div className="flex items-center gap-2">
                      {t('noTeam', { count: allTeamMembers.filter(m => !m.team_id).length })}
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <div className="space-y-6">
          {/* Absent Section - Only show if there are absent members */}
          {filteredAbsentMembers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground pb-6">
                {t('absentCount', { count: filteredAbsentMembers.length })}
              </h4>
              <div className="space-y-4">
                {filteredAbsentMembers.map((request, index) => {
                  const member = request.profiles
                  const initials = member.full_name?.split(' ').map((n: string) => n[0]).join('') || member.email?.charAt(0) || '?'
                  const leaveTypeColor = request.leaveType?.color || '#gray-500'
                  const leaveTypeName = request.leaveType?.name || 'Urlop'
                  // Format date consistently for SSR (use Polish locale to match design)
                  const date = new Date(request.endDate)
                  const day = date.getDate().toString().padStart(2, '0')
                  const month = (date.getMonth() + 1).toString().padStart(2, '0')
                  const endDate = `${day}.${month}`
                  
                  return (
                    <div key={index} className="flex items-center gap-4 w-full">
                      <Avatar className="size-10 rounded-full shrink-0">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex flex-col text-sm whitespace-nowrap">
                        <div className="flex flex-col font-medium justify-center overflow-hidden text-foreground w-full">
                          <p className="overflow-hidden text-ellipsis whitespace-nowrap">
                            {member.full_name}
                          </p>
                        </div>
                        <div className="flex flex-col font-normal justify-center overflow-hidden text-muted-foreground w-full">
                          <p className="overflow-hidden text-ellipsis whitespace-nowrap">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-center text-sm text-right whitespace-nowrap shrink-0">
                        <div className="flex flex-col font-medium justify-center overflow-hidden text-foreground">
                          <p className="overflow-hidden text-ellipsis whitespace-nowrap">
                            {leaveTypeName}
                          </p>
                        </div>
                        <div className="flex flex-col font-normal justify-center overflow-hidden text-muted-foreground">
                          <p className="overflow-hidden text-ellipsis whitespace-nowrap">
                            {t('leaveUntil', { date: endDate })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Working Today Section */}
          <div>
            <h4 className="text-sm font-medium text-foreground pb-6">
              {workingMembers.length > 0 ? t('workingTodayCount', { count: workingMembers.length }) : t('workingTodayTitle')}
            </h4>
            <div className="space-y-4">
              {workingMembers.length > 0 ? (
                workingMembers.map((member, index) => {
                  const initials = member.full_name?.split(' ').map((n: string) => n[0]).join('') || member.email?.charAt(0) || '?'
                  
                  return (
                    <div key={index} className="flex items-center gap-4 w-full">
                      <Avatar className="size-10 rounded-full shrink-0">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex flex-col text-sm whitespace-nowrap">
                        <div className="flex flex-col font-medium justify-center overflow-hidden text-foreground w-full">
                          <p className="overflow-hidden text-ellipsis whitespace-nowrap">
                            {member.full_name}
                          </p>
                        </div>
                        <div className="flex flex-col font-normal justify-center overflow-hidden text-muted-foreground w-full">
                          <p className="overflow-hidden text-ellipsis whitespace-nowrap">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-4">
                  <div className="text-sm text-muted-foreground">{t('noWorkingMembers')}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 