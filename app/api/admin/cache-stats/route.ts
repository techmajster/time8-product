import { NextResponse } from 'next/server'
import { authenticateAndGetOrgContext, requireRole } from '@/lib/auth-utils-v2'
import { cache } from '@/lib/cache-utils'

export async function GET() {
  try {
    // Authenticate and check admin permissions
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      return auth.error
    }

    const { context } = auth
    
    // Only allow admins to view cache stats
    const roleCheck = requireRole(context, ['admin'])
    if (roleCheck) {
      return roleCheck
    }

    // Get cache statistics
    const stats = cache.getStats()
    
    return NextResponse.json({
      cache_stats: stats,
      cache_info: {
        type: 'in-memory',
        description: 'Development cache - production should use Redis',
        ttl_info: {
          leave_types: '30 minutes',
          organization: '1 hour', 
          user_profile: '15 minutes',
          holidays: '24 hours'
        }
      },
      performance_notes: [
        'Cache hits avoid database queries',
        'Cache misses trigger fresh data fetch',
        'TTL ensures data freshness',
        'Invalidation available for immediate updates'
      ]
    })

  } catch (error) {
    console.error('Cache stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 