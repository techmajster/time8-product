export interface HolidayCalendar {
  code: string
  name: string
  flag: string
  description: string
  holidayCount: number
}

export const AVAILABLE_CALENDARS: HolidayCalendar[] = [
  {
    code: 'PL',
    name: 'Polska',
    flag: '🇵🇱',
    description: 'Kalendarz polskich świąt narodowych i religijnych',
    holidayCount: 13
  },
  {
    code: 'IE',
    name: 'Irlandia',
    flag: '🇮🇪',
    description: 'Kalendarz irlandzkich świąt narodowych i bank holidays',
    holidayCount: 9
  },
  {
    code: 'US',
    name: 'Stany Zjednoczone',
    flag: '🇺🇸',
    description: 'Kalendarz amerykańskich świąt federalnych',
    holidayCount: 0 // Not yet implemented
  },
  {
    code: 'UK',
    name: 'Wielka Brytania',
    flag: '🇬🇧',
    description: 'Kalendarz brytyjskich bank holidays i świąt narodowych',
    holidayCount: 0 // Not yet implemented
  },
  {
    code: 'DE',
    name: 'Niemcy',
    flag: '🇩🇪',
    description: 'Kalendarz niemieckich świąt narodowych',
    holidayCount: 0 // Not yet implemented
  },
  {
    code: 'FR',
    name: 'Francja',
    flag: '🇫🇷',
    description: 'Kalendarz francuskich świąt narodowych',
    holidayCount: 0 // Not yet implemented
  }
]

// Get only calendars that are currently available (have holidays)
export const getAvailableCalendars = () => {
  return AVAILABLE_CALENDARS.filter(calendar => calendar.holidayCount > 0)
}

// Get calendar by country code
export const getCalendarByCode = (code: string) => {
  return AVAILABLE_CALENDARS.find(calendar => calendar.code === code)
} 