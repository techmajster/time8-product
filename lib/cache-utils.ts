// Simple in-memory cache for frequently accessed data
// Production should use Redis, but this provides immediate benefits

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Get cache stats for monitoring
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Global cache instance
export const cache = new MemoryCache()

// Cache key generators
export const cacheKeys = {
  leaveTypes: (orgId: string) => `leave_types:${orgId}`,
  organization: (orgId: string) => `organization:${orgId}`,
  userProfile: (userId: string) => `profile:${userId}`,
  userProfileWithOrg: (userId: string) => `profile_with_org:${userId}`,
  teamMembers: (orgId: string) => `team_members:${orgId}`,
  holidays: (countryCode: string, year: number) => `holidays:${countryCode}:${year}`,
  leaveBalances: (userId: string, year: number) => `leave_balances:${userId}:${year}`,
  orgHolidays: (orgId: string, year: number) => `org_holidays:${orgId}:${year}`
}

// Cache TTL constants (in seconds)
export const cacheTTL = {
  leaveTypes: 1800,        // 30 minutes (rarely change)
  organization: 3600,      // 1 hour (rarely change)
  userProfile: 900,        // 15 minutes (can change)
  userProfileWithOrg: 900, // 15 minutes (can change)
  teamMembers: 1800,       // 30 minutes (fairly stable)
  holidays: 86400,         // 24 hours (static data)
  leaveBalances: 300,      // 5 minutes (changes frequently)
  orgHolidays: 86400       // 24 hours (static data)
}

// Helper function to get or set cached data
export async function getOrSetCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  // Try to get from cache first
  const cached = cache.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // If not in cache, fetch data
  const data = await fetchFn()
  
  // Store in cache
  cache.set(key, data, ttlSeconds)
  
  return data
}

/**
 * Cached organization service functions
 */
export async function getOrganizationData(organizationId: string) {
  const cacheKey = cacheKeys.organization(organizationId)
  
  return getOrSetCache(
    cacheKey,
    async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, country_code, default_locale, created_at')
        .eq('id', organizationId)
        .single()

      if (error) {
        throw new Error(`Failed to fetch organization: ${error.message}`)
      }

      return data
    },
    cacheTTL.organization
  )
}

/**
 * Cached team members service
 */
export async function getTeamMembers(organizationId: string) {
  const cacheKey = cacheKeys.teamMembers(organizationId)
  
  return getOrSetCache(
    cacheKey,
    async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, employment_start_date, avatar_url')
        .eq('organization_id', organizationId)
        .order('full_name')

      if (error) {
        throw new Error(`Failed to fetch team members: ${error.message}`)
      }

      return data || []
    },
    cacheTTL.teamMembers
  )
}

/**
 * Cached holidays service
 */
export async function getHolidays(organizationId: string, countryCode: string, year: number) {
  const cacheKey = cacheKeys.orgHolidays(organizationId, year)
  
  return getOrSetCache(
    cacheKey,
    async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('company_holidays')
        .select('id, name, date, type, description')
        .or(`organization_id.eq.${organizationId},and(type.eq.national,country_code.eq.${countryCode})`)
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`)
        .order('date')

      if (error) {
        throw new Error(`Failed to fetch holidays: ${error.message}`)
      }

      return data || []
    },
    cacheTTL.orgHolidays
  )
}

/**
 * Cache invalidation helpers
 */
export function invalidateOrganizationCache(organizationId: string) {
  cache.delete(cacheKeys.organization(organizationId))
  cache.delete(cacheKeys.teamMembers(organizationId))
}

export function invalidateUserCache(userId: string) {
  cache.delete(cacheKeys.userProfile(userId))
  cache.delete(cacheKeys.userProfileWithOrg(userId))
} 