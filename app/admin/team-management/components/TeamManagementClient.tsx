'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Loader2, Plus, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { PendingInvitationsSection } from './PendingInvitationsSection'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

interface Invitation {
  id: string
  email: string
  full_name?: string | null
  birth_date?: string | null
  role: string
  status: string
  created_at: string
  expires_at: string
  invitation_code?: string
  invited_by: string
  team_id?: string | null
  inviter_name: string
  inviter_email: string
  team_name: string
}

interface TeamManagementClientProps {
  teamMembers: TeamMember[]
  teams: any[]
  leaveBalances: LeaveBalance[]
  invitations: Invitation[]
}

export function TeamManagementClient({ teamMembers, teams, leaveBalances, invitations }: TeamManagementClientProps) {
  const router = useRouter()
  
  // Debug: Log the received data
  console.log('📊 TeamManagementClient received data:', {
    teamMembersCount: teamMembers.length,
    teamsCount: teams.length,
    leaveBalancesCount: leaveBalances.length,
    leaveBalancesSample: leaveBalances.slice(0, 3),
    memberIds: teamMembers.map(m => m.id)
  })
  
  // State for active team filter
  const [activeTeamFilter, setActiveTeamFilter] = useState('Wszyscy')
  const [loading, setLoading] = useState(false)

  // State for employee removal confirmation
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null)

  // Create team filter tabs - "Wszyscy" + actual teams
  const teamTabs = ['Wszyscy', ...teams.map(team => team.name)]
  
    // Filter team members based on active tab
  const filteredTeamMembers = activeTeamFilter === 'Wszyscy' 
    ? teamMembers 
    : teamMembers.filter(member => member.teams?.name === activeTeamFilter)

  const getLeaveBalance = (userId: string, leaveTypeName: string): number => {
    const balance = leaveBalances.find(b => 
      b.user_id === userId && 
      b.leave_types?.name === leaveTypeName
    )
    
    // Debug logging
    if (userId && leaveTypeName === 'Urlop wypoczynkowy') {
      console.log(`🔍 Leave balance for ${userId}:`, {
        leaveTypeName,
        balance,
        allBalances: leaveBalances.filter(b => b.user_id === userId),
        remaining_days: balance?.remaining_days
      })
    }
    
    return balance?.remaining_days || 0
  }

  const getUserInitials = (member: TeamMember): string => {
    if (member.full_name) {
      return member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    }
    return member.email.charAt(0).toUpperCase()
  }

  const getTeamDisplayName = (member: TeamMember): string => {
    return member.teams?.name || 'Brak grupy'
  }

  const getManagerName = (member: TeamMember): string => {
    // Get the manager from the team data
    if (member.teams && member.team_id) {
      const team = teams.find(t => t.id === member.team_id)
      return team?.manager?.full_name || 'Brak menedżera'
    }
    return 'Brak grupy'
  }

  // Employee management functions
  const handleEditEmployee = (member: TeamMember) => {
    // Navigate to edit employee page using Next.js router
    router.push(`/admin/team-management/edit-employee/${member.id}`)
  }

  const handleRemoveEmployee = (member: TeamMember) => {
    setMemberToRemove(member)
    setIsRemoveDialogOpen(true)
  }

  const confirmRemoveEmployee = async () => {
    if (!memberToRemove) return

    setLoading(true)
    try {
      const response = await fetch(`/api/employees/${memberToRemove.id}`, {
        method: 'DELETE'
      })

      let data: any = {}
      
      // Check if response has content before parsing JSON
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text()
        if (text) {
          try {
            data = JSON.parse(text)
          } catch (e) {
            console.error('Failed to parse JSON response:', e)
          }
        }
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to remove employee')
      }

      toast.success(data.message || 'Pracownik został usunięty z organizacji')
      setIsRemoveDialogOpen(false)
      setMemberToRemove(null)
      
      // TODO: Implement proper state refresh instead of page reload
      window.location.reload()

    } catch (error) {
      console.error('Error removing employee:', error)
      toast.error(error instanceof Error ? error.message : 'Wystąpił błąd podczas usuwania pracownika')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Zarządzanie zespołami</h1>
      </div>

      {/* Employees Section (no tabs anymore) */}
      <div className="mt-6">
          {/* Pending Invitations Section */}
          <PendingInvitationsSection invitations={invitations} />
          
          <div className="mb-4 mt-8 min-h-[60px] flex items-center">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-medium">Lista pracowników</h2>
                
                {/* Custom Figma-style tabs for team filtering */}
                <div className="bg-muted relative rounded-lg p-[3px] flex">
                  {teamTabs.map((teamName: string) => (
                    <button
                      key={teamName}
                      onClick={() => setActiveTeamFilter(teamName)}
                      className={`
                        flex items-center justify-center px-2.5 py-2 rounded-lg text-sm font-normal leading-5 transition-all
                        ${activeTeamFilter === teamName 
                          ? 'bg-background text-foreground shadow-sm' 
                          : 'text-muted-foreground hover:bg-background/50'
                        }
                      `}
                    >
                      {teamName}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Export</Button>
                <Button variant="outline" size="sm">Import</Button>
                <Link href="/admin/team-management/add-employee">
                  <Button 
                    size="sm" 
                    className="bg-foreground text-background"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Dodaj pracownika
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium text-muted-foreground w-full min-w-0">Pracownik</TableHead>
                    <TableHead className="font-medium text-muted-foreground min-w-64">Grupa</TableHead>
                    <TableHead className="font-medium text-muted-foreground min-w-64">Manager</TableHead>
                    <TableHead className="font-medium text-muted-foreground text-right min-w-40">Pozostały urlop</TableHead>
                    <TableHead className="font-medium text-muted-foreground text-right min-w-40">Urlop NŻ</TableHead>
                    <TableHead className="font-medium text-muted-foreground text-right min-w-24">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeamMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-16 text-center">
                        <div className="text-muted-foreground">
                          {activeTeamFilter === 'Wszyscy' 
                            ? 'Brak pracowników w organizacji' 
                            : `Brak pracowników w zespole ${activeTeamFilter}`
                          }
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTeamMembers.map((member) => {
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
                            <div className="font-medium text-foreground">
                              {getTeamDisplayName(member)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-foreground">
                              {getManagerName(member)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="text-foreground">
                              {vacationDays > 0 ? `${vacationDays} dni` : 'Brak danych'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="text-foreground">
                              {parentalDays > 0 ? `${parentalDays} dni` : 'Brak danych'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  disabled={loading}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem 
                                  onClick={() => handleEditEmployee(member)}
                                  disabled={loading}
                                  className="cursor-pointer"
                                >
                                  Edytuj pracownika
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleRemoveEmployee(member)}
                                  disabled={loading}
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                  Usuń pracownika
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

      {/* Remove Employee Confirmation Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuń pracownika</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć pracownika {memberToRemove?.full_name || memberToRemove?.email} z organizacji?
              {(memberToRemove?.role === 'Manager' || memberToRemove?.role === 'Admin') && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Uwaga:</strong> Ten użytkownik jest obecnie <strong>{memberToRemove.role}</strong>. 
                    Usunięcie go spowoduje utratę wszystkich jego uprawnień administracyjnych.
                  </p>
                </div>
              )}
              <br />
              <strong className="text-red-600">Ta akcja jest nieodwracalna.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsRemoveDialogOpen(false)}
              disabled={loading}
            >
              Anuluj
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmRemoveEmployee}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Usuń pracownika
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
} 