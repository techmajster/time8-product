export function canUseCalendarIntegration(authProvider: string | null): boolean {
    return authProvider === 'google'
  }
  
  export function canUseDomainRestriction(authProvider: string | null): boolean {
    return authProvider === 'google'
  }