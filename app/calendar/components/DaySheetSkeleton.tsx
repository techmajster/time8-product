import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export function DaySheetSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-7 w-32" />
      </div>

      {/* Date card */}
      <Card className="border border-border">
        <CardContent className="flex gap-6 items-start p-6">
          <div className="flex flex-1 flex-col gap-4">
            {/* Day name and year */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-7 w-16" />
            </div>

            {/* Day and month */}
            <div className="flex items-end justify-between">
              <Skeleton className="h-12 w-40" />
              <Skeleton className="h-6 w-24" />
            </div>

            <Separator />

            {/* Status message */}
            <div className="flex flex-col gap-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional sections skeleton */}
      <Card>
        <CardContent className="p-6">
          <CardHeader className="p-0 pb-3">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
