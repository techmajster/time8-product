// Flag utilities for proper flag display
export interface FlagData {
  code: string
  name: string
  flag: string // SVG path or emoji
}

export const COUNTRY_FLAGS: FlagData[] = [
  {
    code: 'PL',
    name: 'Polska',
    flag: '🇵🇱'
  },
  {
    code: 'IE', 
    name: 'Irlandia',
    flag: '🇮🇪'
  },
  {
    code: 'US',
    name: 'Stany Zjednoczone', 
    flag: '🇺🇸'
  }
]

export const LANGUAGE_FLAGS: FlagData[] = [
  {
    code: 'pl',
    name: 'Polski',
    flag: '🇵🇱'
  },
  {
    code: 'en',
    name: 'English',
    flag: '🇺🇸'
  }
]

export function getCountryFlag(code: string): FlagData | undefined {
  return COUNTRY_FLAGS.find(flag => flag.code === code)
}

export function getLanguageFlag(code: string): FlagData | undefined {
  return LANGUAGE_FLAGS.find(flag => flag.code === code)
} 