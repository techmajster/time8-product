import React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}

export function PageHeader({ 
  title, 
  description, 
  children, 
  className 
}: PageHeaderProps) {
  return (
    <div className={cn("bg-background", className)}>
      <div className="flex flex-col items-center">
        <div className="flex flex-col items-center justify-start px-0 py-8 w-full">
                      <div className="w-full">
              <div className="flex flex-col items-center">
                <div className="flex flex-col items-center justify-start px-6 py-0 w-full">
                <div className="max-w-[1280px] w-full">
                  <div className="flex flex-row items-center justify-between w-full">
                    {/* Title and Description */}
                    <div className="flex-1 max-w-[720px]">
                      <div className="flex flex-col gap-2 items-start justify-start">
                        <h1 className="font-bold text-[30px] leading-[36px] text-foreground">
                          {title}
                        </h1>
                        {description && (
                          <p className="font-normal text-[16px] leading-[24px] text-muted-foreground">
                            {description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    {children && (
                      <div className="flex-1 flex justify-end">
                        <div className="flex flex-row gap-2 items-center">
                          {children}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  )
} 