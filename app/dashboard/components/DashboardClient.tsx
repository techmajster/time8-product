'use client'

import { useTranslations } from 'next-intl'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { LeaveRequestButton } from './LeaveRequestButton'
import { TeamCard } from './TeamCard'
import { CurrentDayCard } from './CurrentDayCard'
import { BirthdayCard } from './BirthdayCard'
import { DashboardCalendar } from './DashboardCalendar'
import { useLeaveBalances, useTeamMembers, useCurrentLeaveRequests, usePendingRequestsCount } from '@/hooks/use-dashboard-queries'
import { getInitials } from '@/lib/utils/initials'

interface DashboardClientProps {
  profile: any
  organizationId: string
  countryCode: string
  userId: string
  userOrg: any
  teamMemberIds: string[]
  teamScope: any
  teams: any[]
  managedTeam: any
  colleagues: any[]
  initialTeamMembers: any[]
  initialLeaveBalances: any[]
  initialCurrentLeaves: any[]
  initialPendingCount: number
  nearestBirthday: {
    name: string
    date: Date
    daysUntil: number
  } | null
  currentDay: number
  currentMonth: string
  currentDayName: string
  currentYear: number
  monthNames: string[]
}

export function DashboardClient({
  profile,
  organizationId,
  countryCode,
  userId,
  userOrg,
  teamMemberIds,
  teamScope,
  teams,
  managedTeam,
  colleagues,
  initialTeamMembers,
  initialLeaveBalances,
  initialCurrentLeaves,
  initialPendingCount,
  nearestBirthday,
  currentDay,
  currentMonth,
  currentDayName,
  currentYear,
  monthNames,
}: DashboardClientProps) {
  const t = useTranslations('calendar')
  const td = useTranslations('dashboard')

  // Use React Query hooks with initial SSR data
  const { data: leaveBalances = initialLeaveBalances } = useLeaveBalances(userId)
  const { data: allTeamMembers = initialTeamMembers } = useTeamMembers(
    organizationId,
    teamMemberIds,
    initialTeamMembers
  )
  const { data: currentLeaveRequests = initialCurrentLeaves } = useCurrentLeaveRequests(teamMemberIds)
  const { data: pendingRequestsCount = initialPendingCount } = usePendingRequestsCount(teamMemberIds)

  // Find vacation leave balance
  const vacationBalance = leaveBalances?.find((b: any) => b.leave_types?.name === 'Urlop wypoczynkowy')
  const remainingVacationDays = vacationBalance?.remaining_days || 0

  // Check if vacation balance is an override (custom entitled_days)
  const workspaceDefault = vacationBalance?.leave_types?.days_per_year || 0
  const actualEntitled = vacationBalance?.entitled_days || 0
  const isVacationOverride = actualEntitled !== workspaceDefault

  // Split team members into absent and working
  const absentMemberIds = new Set(currentLeaveRequests?.map((req: any) => req.user_id) || [])

  return (
    <>
      {/* Greeting Section */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <span className="text-5xl font-light text-foreground">{td('greeting')}</span>
          <Avatar className="w-12 h-12">
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback>
              {getInitials(profile.full_name, 'U')}
            </AvatarFallback>
          </Avatar>
          <span className="text-5xl font-semibold text-foreground">
            {profile.full_name?.split(' ')[0] || 'User'}!
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 text-xl text-foreground">
            <span className="font-normal">
              {td('vacationBalance', { days: `${remainingVacationDays} ${remainingVacationDays === 1 ? 'dzień' : 'dni'}` })}
            </span>
            {isVacationOverride && (
              <span
                className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full"
                title={td('customBalanceTooltip', { default: workspaceDefault })}
              >
                {td('customBalance')}
              </span>
            )}
          </div>
          <LeaveRequestButton />
        </div>
      </div>

      <div className="flex gap-4">
        {/* Left Column - 30% width */}
        <div className="w-[30%] flex flex-col gap-4">
          {/* Current Day Card */}
          <CurrentDayCard
            todayText={td('todayIs', { dayName: currentDayName })}
            day={currentDay}
            dateText={`${currentDay} ${monthNames[new Date().getMonth()].toLowerCase()}`}
            year={currentYear}
            workStatus={td('workingToday')}
            workHours="9:00 - 15:00"
            organization={profile.organizations}
            currentDayName={currentDayName}
          />

          {/* Birthday Card */}
          <BirthdayCard
            title={td('nearestBirthday')}
            noBirthdaysText={td('noBirthdaysThisMonth')}
            name={nearestBirthday?.name}
            daysText={
              nearestBirthday
                ? nearestBirthday.daysUntil === 0
                  ? `Dzisiaj (${nearestBirthday.date.getDate()} ${monthNames[nearestBirthday.date.getMonth()].toLowerCase()})`
                  : nearestBirthday.daysUntil === 1
                  ? `Jutro (${nearestBirthday.date.getDate()} ${monthNames[nearestBirthday.date.getMonth()].toLowerCase()})`
                  : `Za ${nearestBirthday.daysUntil} dni (${nearestBirthday.date.getDate()} ${monthNames[nearestBirthday.date.getMonth()].toLowerCase()})`
                : undefined
            }
            initials={nearestBirthday?.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
          />

          {/* Leave Requests Card - Only visible to admins and managers with pending requests */}
          {(profile.role === 'admin' || profile.role === 'manager') && pendingRequestsCount > 0 && (
            <Card className="flex-row items-end justify-between">
              <CardContent className="flex-1">
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-medium">{td('leaveRequests')}</div>
                  <div className="text-xl font-semibold">
                    {pendingRequestsCount === 0
                      ? td('noPending')
                      : pendingRequestsCount === 1
                      ? td('pendingOne')
                      : td('pendingCount', { count: pendingRequestsCount })}
                  </div>
                </div>
              </CardContent>
              <CardContent className="flex-shrink-0">
                <Button asChild className="h-8 px-3 text-xs">
                  <Link href="/leave-requests">{td('goToRequests')}</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Team Card */}
          <TeamCard
            allTeamMembers={(allTeamMembers || []).map((member: any) => ({
              ...member,
              teams: Array.isArray(member.teams) ? member.teams[0] : member.teams,
            }))}
            absentMembers={
              currentLeaveRequests?.map((req: any) => ({
                user_id: req.user_id,
                profiles: {
                  ...req.profiles,
                  teams: null,
                  team_id: null,
                },
                leaveType: req.leave_types,
                endDate: req.end_date,
              })) || []
            }
            teams={teams || []}
            defaultTeamId={managedTeam?.id}
            userRole={profile.role}
          />
        </div>

        {/* Right Column - Calendar - 70% width */}
        <div className="w-[70%]">
          <DashboardCalendar
            organizationId={organizationId}
            countryCode={countryCode}
            userId={userId}
            colleagues={colleagues || []}
            teamMemberIds={teamMemberIds}
            teamScope={teamScope}
            calendarTitle={t('calendarTitle')}
            workingDays={profile.organizations?.working_days}
            workScheduleConfig={{
              excludePublicHolidays: profile.organizations?.exclude_public_holidays ?? true,
              dailyStartTime: profile.organizations?.daily_start_time || '09:00',
              dailyEndTime: profile.organizations?.daily_end_time || '17:00'
            }}
          />
        </div>
      </div>
    </>
  )
}
