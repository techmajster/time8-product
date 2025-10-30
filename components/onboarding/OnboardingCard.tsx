'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

export type CardVariant = 'invitation' | 'workspace' | 'create'

interface OnboardingCardProps {
  variant: CardVariant
  icon: ReactNode
  title: string | ReactNode
  organizationName?: string
  avatars?: Array<{ id: string; full_name: string; avatar_url?: string }>
  memberCount?: number
  onAction: () => void
  actionLabel: string
  actionIcon?: ReactNode
  isLoading?: boolean
  freeText?: string
  userLimitText?: string
}

export function OnboardingCard({
  variant,
  icon,
  title,
  organizationName,
  avatars,
  memberCount = 0,
  onAction,
  actionLabel,
  actionIcon,
  isLoading = false,
  freeText = "It's free!",
  userLimitText = "up to 3 users"
}: OnboardingCardProps) {
  // Card background styling based on variant
  const cardBgClass = {
    invitation: 'bg-violet-100',
    workspace: 'bg-muted',
    create: 'bg-card'
  }[variant]

  // Button variant based on card type
  const buttonVariant = variant === 'create' ? 'outline' : 'default'

  return (
    <div 
      className={`${cardBgClass} border border-[rgba(2,2,2,0.2)] box-border flex flex-col h-[300px] items-start justify-between max-w-[384px] p-[32px] rounded-xl shrink-0 w-[384px]`}
    >
      <div className="flex flex-col gap-[32px] flex-1 items-start min-h-0 min-w-0 w-full">
        {/* Top section - header and content */}
        <div className="flex flex-col flex-1 items-start justify-between min-h-0 min-w-0 w-full">
          {/* Header with icon */}
          <div className="flex gap-[8px] items-start w-full">
            <div className="flex-1 font-semibold h-[56px] leading-[28px] min-h-0 min-w-0 text-[18px] text-foreground whitespace-pre-wrap" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
              {title}
            </div>
            <div className="overflow-clip shrink-0 size-[24px]">
              {icon}
            </div>
          </div>

          {/* Content section - varies by variant */}
          {variant === 'invitation' && organizationName && (
            <div className="flex gap-[10px] items-center justify-center w-full">
              <p className="flex-1 font-semibold leading-[36px] min-h-0 min-w-0 text-[30px] text-foreground whitespace-pre-wrap" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
                {organizationName}
              </p>
            </div>
          )}

          {variant === 'workspace' && (
            <div className="flex flex-col gap-[10px] items-start w-full">
              {/* Avatar group */}
              {avatars && avatars.length > 0 && (
                <div className="box-border flex items-center pl-0 pr-[8px] py-0">
                  {avatars.slice(0, 3).map((member, index) => (
                    <Avatar
                      key={member.id}
                      className="border-white border-2 size-[48px] mr-[-8px]"
                      style={{ zIndex: 3 - index }}
                    >
                      <AvatarImage
                        src={member.avatar_url || undefined}
                        alt={member.full_name}
                      />
                      <AvatarFallback className="text-sm">
                        {member.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {memberCount > 3 && (
                    <Avatar className="border-2 border-white size-[48px] mr-[-8px]">
                      <AvatarFallback className="text-sm">
                        +{memberCount - 3}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )}
              {/* Workspace name */}
              {organizationName && (
                <p className="font-semibold leading-[36px] min-w-full text-[30px] text-foreground w-[min-content] whitespace-pre-wrap" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
                  {organizationName}
                </p>
              )}
            </div>
          )}

          {variant === 'create' && (
            <div className="flex items-end justify-between w-full">
              <p className="font-semibold leading-[36px] text-[30px] text-foreground" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>
                {freeText}
              </p>
              <p className="font-normal leading-[20px] text-[14px] text-muted-foreground" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 400 }}>
                {userLimitText}
              </p>
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="flex flex-col gap-[10px] items-start w-full">
          <Button
            onClick={onAction}
            disabled={isLoading}
            variant={buttonVariant}
            className={`w-full h-[40px] gap-[8px] ${variant !== 'create' ? 'bg-[#7c3aed] hover:bg-[#6d32d4]' : ''}`}
          >
            {actionIcon && (
              <div className="overflow-clip shrink-0 size-[16px]">
                {actionIcon}
              </div>
            )}
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

