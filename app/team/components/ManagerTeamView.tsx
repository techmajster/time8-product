'use client'

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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'
import { useTranslations } from 'next-intl'

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

interface ManagerTeamViewProps {
  teamMembers: TeamMember[]
  leaveBalances: LeaveBalance[]
  leaveRequests: any[]
  managerName: string
}

export function ManagerTeamView({ teamMembers, leaveBalances }: ManagerTeamViewProps) {
  const t = useTranslations('permissions')

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
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Mój zespół</h1>
      </div>

      {/* READ-ONLY Alert Banner */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>{t('readOnlyMode')}:</strong> {t('readOnlyModeDescription')}
        </AlertDescription>
      </Alert>

      {/* Table */}
      <Card className="shadow-sm py-2">
        <CardContent className="px-4 py-0">
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
              {teamMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 text-center">
                    <div className="text-muted-foreground">
                      Brak członków w zespole
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                teamMembers.map((member) => {
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
                          {member.teams?.name || 'UX'}
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
    </div>
  )
} 