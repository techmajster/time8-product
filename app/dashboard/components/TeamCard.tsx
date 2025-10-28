'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { TreePalm, UserCheck, Users } from 'lucide-react'

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
      <CardContent className="p-6 py-0">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-foreground">
            Twój zespół
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
                      Wszyscy ({allTeamMembers.length})
                    </div>
                  </SelectItem>
                )}
                {teams.map((team) => {
                  const teamMemberCount = allTeamMembers.filter(m => m.team_id === team.id).length
                  return (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-2">
                        {team.name} ({teamMemberCount})
                      </div>
                    </SelectItem>
                  )
                })}
                {userRole === 'admin' && allTeamMembers.filter(m => !m.team_id).length > 0 && (
                  <SelectItem value="no-team">
                    <div className="flex items-center gap-2">
                      Bez zespołu ({allTeamMembers.filter(m => !m.team_id).length})
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
                Nieobecni ({filteredAbsentMembers.length})
              </h4>
              <div className="space-y-4">
                {filteredAbsentMembers.map((request, index) => {
                  const member = request.profiles
                  const initials = member.full_name?.split(' ').map((n: string) => n[0]).join('') || member.email?.charAt(0) || '?'
                  const leaveTypeColor = request.leaveType?.color || '#gray-500'
                  const leaveTypeName = request.leaveType?.name || 'Urlop'
                  const endDate = new Date(request.endDate).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
                  
                  return (
                    <div key={index} className="flex items-center gap-4">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">{member.full_name}</div>
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-foreground">{leaveTypeName}</div>
                        <div className="text-sm text-muted-foreground">do {endDate}</div>
                      </div>
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${leaveTypeColor}33` }}
                      >
                        <TreePalm className="w-6 h-6 text-foreground" />
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
              Dziś pracują {workingMembers.length > 0 && `(${workingMembers.length})`}
            </h4>
            <div className="space-y-4">
              {workingMembers.length > 0 ? (
                workingMembers.slice(0, 5).map((member, index) => {
                  const initials = member.full_name?.split(' ').map((n: string) => n[0]).join('') || member.email?.charAt(0) || '?'
                  
                  return (
                    <div key={index} className="flex items-center gap-4">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-foreground">{member.full_name}</div>
                          {member.teams && (
                            <Badge variant="outline" className="text-xs">
                              {member.teams.name}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      </div>
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                        <UserCheck className="w-6 h-6 text-foreground" />
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-4">
                  <div className="text-sm text-muted-foreground">Brak pracowników w pracy</div>
                </div>
              )}
              {workingMembers.length > 5 && (
                <div className="text-center py-2">
                  <div className="text-sm text-muted-foreground">
                    i jeszcze {workingMembers.length - 5} osób...
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 