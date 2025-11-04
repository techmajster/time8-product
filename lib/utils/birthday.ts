/**
 * Utility functions for birthday calculations
 */

export interface NearestBirthday {
  name: string
  date: Date
  daysUntil: number
}

export interface TeamMemberWithBirthday {
  id: string
  full_name: string
  birth_date: string
}

/**
 * Calculate the nearest birthday from a list of team members
 * @param teamMembers - Array of team members with birth dates
 * @returns The nearest birthday or null if no birthdays found
 */
export function calculateNearestBirthday(
  teamMembers: TeamMemberWithBirthday[]
): NearestBirthday | null {
  if (!teamMembers || teamMembers.length === 0) {
    return null
  }

  const today = new Date()
  const currentYear = today.getFullYear()

  let nearestBirthday: NearestBirthday | null = null
  let minDaysUntilBirthday = Infinity

  teamMembers.forEach((member) => {
    if (!member.birth_date) return

    const birthDate = new Date(member.birth_date)
    const thisYearBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate())

    // If birthday already passed this year, use next year's birthday
    if (thisYearBirthday < today) {
      thisYearBirthday.setFullYear(currentYear + 1)
    }

    const daysUntilBirthday = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilBirthday < minDaysUntilBirthday) {
      minDaysUntilBirthday = daysUntilBirthday
      nearestBirthday = {
        name: member.full_name,
        date: thisYearBirthday,
        daysUntil: daysUntilBirthday
      }
    }
  })

  return nearestBirthday
}
