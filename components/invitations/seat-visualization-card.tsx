'use client'

import * as React from 'react'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface UserMarkedForRemoval {
  email: string
  effectiveDate: string
}

interface SeatVisualizationCardProps {
  variant?: 'default' | 'compact'
  totalSeats: number
  occupiedSeats: number
  availableSeats: number
  pendingSeats?: number
  planName: string
  utilizationPercentage?: number
  usersMarkedForRemoval?: UserMarkedForRemoval[]
  renewalDate?: string | null
  className?: string
}

interface SeatIndicatorProps {
  status: 'occupied' | 'reserved' | 'available'
  label: string
}

interface SeatPillProps {
  status: 'occupied' | 'available'
  count: number
  children: React.ReactNode
}

const SeatIndicator = ({ status, label }: SeatIndicatorProps) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'occupied':
        return 'bg-green-100 border-green-500'
      case 'reserved':
        return 'bg-gray-100 border-gray-300'
      case 'available':
        return 'bg-white border-dashed border-purple-500'
    }
  }

  const getBadgeStyles = () => {
    switch (status) {
      case 'occupied':
        return 'bg-green-500 text-white'
      case 'reserved':
        return 'bg-gray-500 text-white'
      case 'available':
        return 'bg-purple-500 text-white'
    }
  }

  return (
    <div className="flex flex-col items-center gap-1 sm:gap-2">
      <div
        className={cn(
          'flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg border-2 transition-all',
          getStatusStyles()
        )}
        role="img"
        aria-label={`Seat ${label}`}
      >
        <User className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
      </div>
      <Badge
        className={cn('text-xs px-1.5 py-0.5 sm:px-2', getBadgeStyles())}
        aria-label={`Status: ${label}`}
      >
        {label}
      </Badge>
    </div>
  )
}

const SeatPill = ({ status, count, children }: SeatPillProps) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'occupied':
        return 'bg-green-500 text-white border-green-500'
      case 'available':
        return 'bg-white text-gray-700 border-dashed border-gray-300'
    }
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2 sm:px-4 sm:py-3 transition-all',
        getStatusStyles()
      )}
      role="status"
      aria-label={`${children}: ${count} seats`}
    >
      <span className="text-xs sm:text-sm font-semibold">{children}</span>
      <span className="text-base sm:text-lg font-bold">{count}</span>
    </div>
  )
}

export function SeatVisualizationCard({
  variant = 'default',
  totalSeats,
  occupiedSeats,
  availableSeats,
  pendingSeats = 0,
  planName,
  utilizationPercentage,
  usersMarkedForRemoval = [],
  renewalDate,
  className
}: SeatVisualizationCardProps) {
  // Auto-switch to compact mode for larger plans (5+ seats)
  const displayVariant = totalSeats > 5 ? 'compact' : variant

  // Calculate actual reserved seats (occupied + pending invitations)
  const reservedSeats = occupiedSeats + pendingSeats
  const trulyAvailableSeats = availableSeats - pendingSeats

  // Determine if showing warning state (80%+ utilization)
  const isHighUtilization = utilizationPercentage && utilizationPercentage >= 80
  const isAtCapacity = availableSeats === 0

  return (
    <Card
      className={cn('border-border', className)}
      role="region"
      aria-label="Seat visualization"
    >
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header text */}
          <p
            className={cn(
              'text-xs sm:text-sm font-medium',
              isAtCapacity && 'text-red-600',
              isHighUtilization && !isAtCapacity && 'text-orange-600'
            )}
            role="status"
            aria-live="polite"
          >
            Masz {trulyAvailableSeats}/{totalSeats} wolne zaproszenia w Twoim planie {planName}
            {isAtCapacity && ' (pełna pojemność)'}
            {isHighUtilization && !isAtCapacity && ' (wysoka wykorzystanie)'}
          </p>

          {/* Seat indicators */}
          {displayVariant === 'default' ? (
            <div className="flex flex-wrap items-center justify-start gap-2 sm:gap-3">
              {/* Show occupied seat (You) */}
              <SeatIndicator status="occupied" label="Ty" />

              {/* Show reserved seats (pending invitations) */}
              {Array.from({ length: pendingSeats }).map((_, i) => (
                <SeatIndicator key={`reserved-${i}`} status="reserved" label="Zajęty" />
              ))}

              {/* Show available seats */}
              {Array.from({ length: trulyAvailableSeats }).map((_, i) => (
                <SeatIndicator key={`available-${i}`} status="available" label="Wolny" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <SeatPill status="occupied" count={reservedSeats}>
                Zajęte
              </SeatPill>
              <SeatPill status="available" count={trulyAvailableSeats}>
                Wolne
              </SeatPill>
            </div>
          )}

          {/* Progress bar (visual indicator) */}
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  isAtCapacity && 'bg-red-500',
                  isHighUtilization && !isAtCapacity && 'bg-orange-500',
                  !isHighUtilization && 'bg-green-500'
                )}
                style={{ width: `${(reservedSeats / totalSeats) * 100}%` }}
                role="progressbar"
                aria-valuenow={reservedSeats}
                aria-valuemin={0}
                aria-valuemax={totalSeats}
                aria-label={`Seat utilization: ${reservedSeats} out of ${totalSeats} seats used`}
              />
            </div>
            {utilizationPercentage !== undefined && (
              <p className="text-xs text-gray-500 text-right">
                {utilizationPercentage}% wykorzystane
              </p>
            )}
          </div>

          {/* Pending Removals Section */}
          {usersMarkedForRemoval.length > 0 && (
            <div
              className="rounded-lg border border-blue-200 bg-blue-50 p-2 sm:p-3"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium text-blue-900">
                    {usersMarkedForRemoval.length} {usersMarkedForRemoval.length === 1 ? 'miejsce' : 'miejsca'} zostaną zwolnione
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {usersMarkedForRemoval.length === 1 ? 'Ten użytkownik zostanie' : 'Ci użytkownicy zostaną'} usunięci {renewalDate && `w dniu ${new Date(renewalDate).toLocaleDateString('pl-PL')}`}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {usersMarkedForRemoval.map((user, index) => (
                      <li key={index} className="text-xs text-blue-800 break-all sm:break-normal">
                        • {user.email}
                        {user.effectiveDate && ` (${new Date(user.effectiveDate).toLocaleDateString('pl-PL')})`}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Export sub-components for flexibility
export { SeatIndicator, SeatPill }
