'use client'

import * as React from 'react'
import Image from 'next/image'
import { useTheme } from 'next-themes'

interface OnboardingLogoProps {
  width?: number
  height?: number
  className?: string
}

export function OnboardingLogo({ width = 108, height = 30, className }: OnboardingLogoProps) {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const currentTheme = mounted ? (theme === 'system' ? resolvedTheme : theme) : 'light'
  const logoSrc = currentTheme === 'dark'
    ? '/assets/d3f530002ae26d599cf2faed0610c5a23d7487ae.svg'  // White logo for dark mode
    : '/auth-assets/30f1f246576f6427b3a9b511194297cbba4d7ec6.svg'  // Black logo for light mode

  if (!mounted) {
    return <div className={className} style={{ width: `${width}px`, height: `${height}px` }} />
  }

  return (
    <div className={className}>
      <Image
        src={logoSrc}
        alt="time8"
        width={width}
        height={height}
        priority
      />
    </div>
  )
}
