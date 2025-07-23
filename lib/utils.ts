import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { pl } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Create a custom Polish locale with capitalized months and weekdays
export const plWithCapitals = {
  ...pl,
  localize: {
    ...pl.localize,
    month: (n: number, options: { width?: string } = {}) => {
      const months = {
        narrow: ['S', 'L', 'M', 'K', 'M', 'C', 'L', 'S', 'W', 'P', 'L', 'G'],
        abbreviated: ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'],
        wide: ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień']
      }
      const width = options.width || 'wide'
      return months[width as keyof typeof months][n]
    },
    day: (n: number, options: { width?: string } = {}) => {
      const days = {
        narrow: ['N', 'P', 'W', 'Ś', 'C', 'P', 'S'],
        short: ['Nie', 'Pon', 'Wto', 'Śro', 'Czw', 'Pią', 'Sob'],
        abbreviated: ['Niedz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'],
        wide: ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota']
      }
      const width = options.width || 'wide'
      return days[width as keyof typeof days][n]
    }
  }
}

/**
 * Get the current app URL dynamically
 * Works with both production (app.time8.io) and development (localhost)
 */
export function getAppUrl(req?: Request): string {
  // If we have a request object, use it to determine the URL
  if (req) {
    const host = req.headers.get('host') || ''
    const protocol = host.includes('localhost') ? 'http' : 'https'
    return `${protocol}://${host}`
  }

  // For server-side without request, use environment or defaults
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }

  // Production fallback
  return 'https://app.time8.io'
}

/**
 * Get invite URL with proper domain
 */
export function getInviteUrl(token: string, req?: Request): string {
  const baseUrl = getAppUrl(req)
  return `${baseUrl}/onboarding/join?token=${token}`
}

/**
 * Get login URL with proper domain
 */
export function getLoginUrl(req?: Request): string {
  const baseUrl = getAppUrl(req)
  return `${baseUrl}/login`
}

/**
 * Get onboarding URL with proper domain
 */
export function getOnboardingUrl(req?: Request): string {
  const baseUrl = getAppUrl(req)
  return `${baseUrl}/onboarding`
}
