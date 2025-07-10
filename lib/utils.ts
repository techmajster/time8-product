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
