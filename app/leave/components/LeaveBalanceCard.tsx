'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Calendar } from 'lucide-react'

interface LeaveBalance {
  id: string
  remaining_days: number
  used_days: number
  entitled_days: number
  leave_types: {
    name: string
    color: string
  } | null
}

interface LeaveBalanceCardProps {
  leaveBalances: LeaveBalance[]
  showDetails?: boolean
  displayMode?: 'grid' | 'vertical'
  className?: string
}

export function LeaveBalanceCard({ 
  leaveBalances, 
  showDetails = false, 
  displayMode = 'grid',
  className = '' 
}: LeaveBalanceCardProps) {
  if (!leaveBalances || leaveBalances.length === 0) {
    if (displayMode === 'grid') {
      return (
        <Card className={`bg-card border-border ${className}`}>
          <CardHeader>
            <CardTitle className="text-base text-foreground">Saldo urlopowe</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Brak skonfigurowanego salda urlopowego</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className={`bg-card border-border ${className}`}>
        <CardHeader>
          <CardTitle className="text-base text-foreground">Saldo urlopowe</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Brak skonfigurowanego salda urlopowego</p>
        </CardContent>
      </Card>
    )
  }

  const vacationBalance = leaveBalances.find(b => b.leave_types?.name === 'Urlop wypoczynkowy')
  const totalRemainingDays = leaveBalances.reduce((total, balance) => total + balance.remaining_days, 0)

  if (!showDetails) {
    return (
      <Card className={`transition-shadow hover:shadow-md ${className}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-gray-700">Pozostały urlop</CardTitle>
          <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {vacationBalance ? `${vacationBalance.remaining_days}` : `${totalRemainingDays}`}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {vacationBalance ? 'dni urlopu' : 'dni wszystkich typów'}
          </p>
        </CardContent>
      </Card>
    )
  }

  // Grid display mode (horizontal)
  if (displayMode === 'grid') {
    return (
      <Card className={`bg-card border-border ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pozostały urlop</CardTitle>
        </CardHeader>
        <CardContent>
          {vacationBalance ? (
            <>
              <div className="text-2xl font-bold text-foreground">
                {vacationBalance.remaining_days} dni
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                z {vacationBalance.entitled_days} przyznanych w tym roku
              </p>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Brak danych</div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Vertical display mode (sidebar)
  return (
    <Card className={`bg-card border-border ${className}`}>
      <CardHeader className="border-b border-border bg-muted/30">
        <CardTitle className="text-foreground">
          <Calendar className="h-4 w-4 mr-2 inline-block" />
          Saldo urlopowe
        </CardTitle>
        <p className="text-sm text-muted-foreground">Twoje dostępne dni urlopowe w {new Date().getFullYear()} roku</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-3 p-4">
          {leaveBalances.map((balance, index) => (
            <div
              key={balance.id}
              className={`p-4 bg-muted/50 border border-border rounded-lg hover:shadow-sm transition-shadow ${
                index === 0 ? '' : ''
              }`}
            >
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-sm text-foreground">{balance.leave_types?.name}</h3>
                </div>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pozostało:</span>
                    <span className="font-semibold text-foreground">{balance.remaining_days} dni</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wykorzystano:</span>
                    <span className="text-muted-foreground">{balance.used_days} dni</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Przyznano:</span>
                    <span className="text-muted-foreground">{balance.entitled_days} dni</span>
                  </div>
                </div>
                <div className="w-full bg-border rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{
                      width: `${Math.min((balance.used_days / balance.entitled_days) * 100, 100)}%`
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Wykorzystano {Math.round((balance.used_days / balance.entitled_days) * 100)}% rocznego limitu
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 