'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'

/**
 * Hero section component for authentication pages
 * Features a purple gradient background with marketing copy
 * and decorative abstract elements
 * Based on Figma design: Linkedin post - 13
 */
export function HeroSection() {
  const t = useTranslations('auth')
  return (
    <div className="bg-[#9650fb] h-full overflow-clip relative w-full">
      {/* Rotated abstract background */}
      <div className="absolute flex h-full items-center justify-center left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full">
        <div className="flex-none rotate-[270deg]" style={{ width: '100vh', height: '100vw' }}>
          <div className="bg-[#c592ff] h-full overflow-clip relative w-full">
            {/* Abstract decorative element 1 */}
            <div className="absolute inset-[-37.66%_-32.04%_24.03%_31.46%]">
              <div className="absolute inset-[-22.12%_-17.58%]">
                <Image
                  alt=""
                  className="block max-w-none size-full"
                  src="/assets/auth/b9a853cee9d0402653214ed8a439cf017d1acb9f.svg"
                  width={1500}
                  height={1500}
                  priority
                />
              </div>
            </div>

            {/* Abstract decorative element 2 */}
            <div className="absolute h-[345.333px] left-[1044.56px] top-[-176.56px] w-[355.185px]">
              <div className="absolute inset-[-76.43%_-74.31%]">
                <Image
                  alt=""
                  className="block max-w-none size-full"
                  src="/assets/auth/498600296d006a3d5b35e0018b1b6dfe0841f228.svg"
                  width={1000}
                  height={1000}
                  priority
                />
              </div>
            </div>

            {/* Abstract decorative element 3 */}
            <div className="absolute inset-[24.35%_38.72%_-21.75%_-24.93%]">
              <div className="absolute inset-[-27.73%_-22.04%]">
                <Image
                  alt=""
                  className="block max-w-none size-full"
                  src="/assets/auth/5cfca2605fed82d4415eee187761a1b7ae59e233.svg"
                  width={1000}
                  height={1000}
                  priority
                />
              </div>
            </div>

            {/* Noise texture overlay */}
            <div
              className="absolute bg-repeat bg-[length:233.333px_233.333px] bg-[position:0_0] bottom-[-50%] left-0 mix-blend-color-burn opacity-50 right-[-50%] top-0"
              style={{
                backgroundImage: "url('/assets/auth/a8f3fbe5b79280c3b93294ff3d6f0599355a660a.png')"
              }}
            />
          </div>
        </div>
      </div>

      {/* Hero image */}
      <div className="absolute bottom-[-74px] h-[880px] right-[-177.6px] w-[706px]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Image
            alt="Smiling woman"
            className="absolute h-[106.31%] left-[-74.23%] max-w-none top-[-6.29%] w-[198.97%]"
            src="/assets/auth/3cffeb594b7dc8e3c17becdd9922d223f819e507.png"
            width={1404}
            height={935}
            priority
          />
        </div>
      </div>

      {/* Marketing text */}
      <div className="absolute font-bold leading-[1.05] left-[100px] text-[70px] text-white top-[120px] tracking-[-2.1px] w-[728px] z-10" style={{ fontFamily: "'Figtree', sans-serif" }}>
        <p className="mb-0">{t('heroLine1')}</p>
        <p className="mb-0">{t('heroLine2')}</p>
        <div className="relative inline-block">
          <p className="mb-0">{t('heroLine3')}</p>
          {/* Decorative rounded badge - responsive to text width */}
          <div 
            className="absolute left-[-11px] bottom-[-3px] h-[75.86px] rounded-[16.8px] -z-10"
            style={{ 
              transform: 'rotate(357.68deg)',
              width: 'calc(100% + 22px)',
              background: '#AB7BF5'
            }} 
          />
        </div>
      </div>
    </div>
  )
}
