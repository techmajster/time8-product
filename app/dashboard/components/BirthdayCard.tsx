'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

interface BirthdayCardProps {
  title: string
  noBirthdaysText: string
  name?: string
  daysText?: string
  initials?: string
}

export function BirthdayCard({ title, noBirthdaysText, name, daysText, initials }: BirthdayCardProps) {
  if (!name) {
    return (
      <Card className="bg-card border border-border rounded-lg p-0 relative overflow-hidden">
        <CardContent className="px-6 py-5">
          <div className="flex gap-6 items-start">
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="flex-1 text-sm font-medium text-card-foreground">
                  {title}
                </p>
              </div>
              <div className="text-xl font-semibold text-foreground">
                {noBirthdaysText}
              </div>
            </div>
          </div>
        </CardContent>

        {/* Cake decoration */}
        <div className="absolute bottom-0 right-0 w-[149px] h-[95px] overflow-hidden pointer-events-none">
          <div>
            <div className="w-[149px] h-[95px]">
              <img 
                src="/birthday-cake.png" 
                alt=""
                className="absolute"
              />
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="bg-card border border-border rounded-lg p-0 relative overflow-hidden">
      <CardContent className="px-6 py-5">
        <div className="flex gap-6 items-start">
          {/* Main content */}
          <div className="flex-1 flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="flex-1 text-sm font-medium text-card-foreground">
                {title}
              </p>
            </div>

            {/* Birthday person info */}
            <div className="flex gap-4 items-center w-full">
              <Avatar className="size-10 rounded-full shrink-0">
                <AvatarImage src="" />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>

              <div className="flex-1 flex flex-col text-sm whitespace-nowrap">
                <div className="flex flex-col font-semibold justify-center overflow-hidden text-foreground w-full">
                  <p className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {name}
                  </p>
                </div>
                <div className="flex flex-col font-normal justify-center overflow-hidden text-muted-foreground w-full">
                  <p className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {daysText}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Cake decoration */}
      <div className="absolute bottom-0 right-0 w-[149px] h-[95px] overflow-hidden pointer-events-none">
          <div>
            <div className="w-[149px] h-[95px]">
              <img 
                src="/birthday-cake.png" 
                alt=""
                className="absolute"
              />
            </div>
          </div>
        </div>
    </Card>
  )
}

