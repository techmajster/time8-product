import { Skeleton } from '@/components/ui/skeleton'

export function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      {/* Month navigation skeleton */}
      <div className="flex items-center justify-between h-8">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-8" />
      </div>

      {/* Day headers skeleton */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center justify-center h-8">
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>

      {/* Calendar grid skeleton (6 weeks × 7 days = 42 cells) */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 42 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
