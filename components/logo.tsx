import * as React from 'react'
import Image from 'next/image'

export function Logo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Image
        src="/assets/d3f530002ae26d599cf2faed0610c5a23d7487ae.svg"
        alt="time8"
        width={78}
        height={22}
        priority
      />
    </div>
  )
}
