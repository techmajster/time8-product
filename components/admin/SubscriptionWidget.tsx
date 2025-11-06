import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Calendar, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SubscriptionWidgetProps {
  currentSeats: number
  pendingSeats?: number | null
  renewsAt?: string | null
  status?: 'active' | 'on_trial' | 'past_due' | 'cancelled'
  className?: string
}

export function SubscriptionWidget({
  currentSeats,
  pendingSeats,
  renewsAt,
  status = 'active',
  className
}: SubscriptionWidgetProps) {
  const hasPendingChanges = pendingSeats !== null && pendingSeats !== undefined && pendingSeats !== currentSeats
  const isIncrease = hasPendingChanges && pendingSeats! > currentSeats
  const isDecrease = hasPendingChanges && pendingSeats! < currentSeats

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusBadge = () => {
    switch (status) {
      case 'on_trial':
        return <Badge variant="outline" className="border-blue-500/50 bg-blue-50 text-blue-700">Trial</Badge>
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>
      case 'active':
      default:
        return <Badge variant="outline" className="border-green-500/50 bg-green-50 text-green-700">Active</Badge>
    }
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Subscription</CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription>Seat allocation and billing details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Seats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Current Seats</span>
          </div>
          <span className="text-2xl font-bold">{currentSeats}</span>
        </div>

        {/* Pending Changes Alert */}
        {hasPendingChanges && (
          <Alert className={cn(
            'border-orange-500/50',
            isIncrease && 'bg-blue-50 dark:bg-blue-950',
            isDecrease && 'bg-orange-50 dark:bg-orange-950'
          )}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  Changing to <strong>{pendingSeats}</strong> seats at renewal
                </span>
                {isIncrease && <TrendingUp className="h-4 w-4 text-blue-600" />}
                {isDecrease && <TrendingDown className="h-4 w-4 text-orange-600" />}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Renewal Date */}
        {renewsAt && (
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Next Renewal</span>
            </div>
            <span className="text-sm font-medium">{formatDate(renewsAt)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
