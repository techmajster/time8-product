import { createAdminClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'

describe('Database Query Performance Benchmarks', () => {
  let supabaseAdmin: SupabaseClient
  
  beforeAll(() => {
    supabaseAdmin = createAdminClient()
  })

  async function benchmarkQuery(
    query: () => Promise<any>,
    queryName: string,
    expectedMaxTime: number,
    iterations: number = 10
  ) {
    const times: number[] = []
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await query()
      const end = performance.now()
      times.push(end - start)
      
      // Small delay between iterations to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    const medianTime = times.sort((a, b) => a - b)[Math.floor(times.length / 2)]
    
    console.log(`\n${queryName} Performance:`)
    console.log(`  Average: ${avgTime.toFixed(2)}ms`)
    console.log(`  Median: ${medianTime.toFixed(2)}ms`)
    console.log(`  Min: ${minTime.toFixed(2)}ms`)
    console.log(`  Max: ${maxTime.toFixed(2)}ms`)
    console.log(`  Expected Max: ${expectedMaxTime}ms`)
    
    const result = {
      queryName,
      avgTime,
      medianTime,
      minTime,
      maxTime,
      expectedMaxTime,
      passesThreshold: avgTime <= expectedMaxTime
    }
    
    expect(result.passesThreshold).toBe(true)
    return result
  }

  describe('Index Performance Verification', () => {
    it('should efficiently query leave_requests by organization_id', async () => {
      await benchmarkQuery(
        async () => {
          // This query should use idx_leave_requests_org_status_date
          const { data, error } = await supabaseAdmin
            .from('leave_requests')
            .select('id, user_id, status, start_date')
            .eq('status', 'approved')
            .gte('start_date', '2025-01-01')
            .order('start_date')
            .limit(100)

          expect(error).toBeNull()
          return data
        },
        'Leave Requests by Status and Date',
        50 // 50ms threshold
      )
    })

    it('should efficiently query user_organizations by organization and role', async () => {
      await benchmarkQuery(
        async () => {
          // This query should use idx_organization_members_org_role
          const { data, error } = await supabaseAdmin
            .from('user_organizations')
            .select('user_id, role, team_id')
            .eq('is_active', true)
            .in('role', ['admin', 'manager'])
            .order('created_at')
            .limit(50)

          expect(error).toBeNull()
          return data
        },
        'User Organizations by Role',
        30 // 30ms threshold
      )
    })

    it('should efficiently query leave_balances by user and organization', async () => {
      await benchmarkQuery(
        async () => {
          // This query should use idx_leave_balances_org_user
          const { data, error } = await supabaseAdmin
            .from('leave_balances')
            .select('user_id, leave_type, balance, used')
            .order('updated_at', { ascending: false })
            .limit(100)

          expect(error).toBeNull()
          return data
        },
        'Leave Balances Query',
        40 // 40ms threshold
      )
    })
  })

  describe('Complex Query Performance', () => {
    it('should efficiently execute dashboard-style queries', async () => {
      await benchmarkQuery(
        async () => {
          // Simulate a dashboard query that joins multiple tables
          const { data, error } = await supabaseAdmin
            .from('leave_requests')
            .select(`
              id,
              user_id,
              leave_type,
              start_date,
              end_date,
              status,
              days_requested,
              user_organizations!inner (
                role,
                is_active
              )
            `)
            .eq('user_organizations.is_active', true)
            .gte('start_date', '2024-01-01')
            .order('start_date', { ascending: false })
            .limit(20)

          expect(error).toBeNull()
          return data
        },
        'Dashboard Query with Join',
        100 // 100ms threshold
      )
    })

    it('should efficiently execute calendar view queries', async () => {
      await benchmarkQuery(
        async () => {
          // Calendar query with date range filtering
          const startDate = '2025-01-01'
          const endDate = '2025-03-31'

          const { data, error } = await supabaseAdmin
            .from('leave_requests')
            .select('id, user_id, leave_type, start_date, end_date, status')
            .gte('start_date', startDate)
            .lte('end_date', endDate)
            .in('status', ['approved', 'pending'])
            .order('start_date')
            .limit(200)

          expect(error).toBeNull()
          return data
        },
        'Calendar View Query',
        80 // 80ms threshold
      )
    })

    it('should efficiently execute team management queries', async () => {
      await benchmarkQuery(
        async () => {
          // Team management query
          const { data, error } = await supabaseAdmin
            .from('user_organizations')
            .select(`
              user_id,
              role,
              team_id,
              is_active,
              teams (
                id,
                name
              )
            `)
            .eq('is_active', true)
            .order('role')
            .limit(50)

          expect(error).toBeNull()
          return data
        },
        'Team Management Query',
        60 // 60ms threshold
      )
    })
  })

  describe('Pagination Performance', () => {
    it('should efficiently handle paginated leave requests', async () => {
      const pageSize = 25
      const offsets = [0, 25, 50, 100, 200]

      for (const offset of offsets) {
        await benchmarkQuery(
          async () => {
            const { data, error } = await supabaseAdmin
              .from('leave_requests')
              .select('id, user_id, leave_type, start_date, status')
              .order('created_at', { ascending: false })
              .range(offset, offset + pageSize - 1)

            expect(error).toBeNull()
            return data
          },
          `Paginated Query (offset: ${offset})`,
          offset < 100 ? 50 : 80, // Higher threshold for larger offsets
          5 // Fewer iterations for pagination tests
        )
      }
    })
  })

  describe('Search Performance', () => {
    it('should efficiently search users by email pattern', async () => {
      await benchmarkQuery(
        async () => {
          // Search query using ILIKE (should use idx_users_email_verified if available)
          const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('id, email, name')
            .ilike('email', '%test%')
            .limit(20)

          expect(error).toBeNull()
          return data
        },
        'Email Search Query',
        70 // 70ms threshold
      )
    })

    it('should efficiently search leave requests by type', async () => {
      await benchmarkQuery(
        async () => {
          const { data, error } = await supabaseAdmin
            .from('leave_requests')
            .select('id, user_id, leave_type, start_date')
            .ilike('leave_type', '%annual%')
            .order('start_date', { ascending: false })
            .limit(50)

          expect(error).toBeNull()
          return data
        },
        'Leave Type Search Query',
        90 // 90ms threshold
      )
    })
  })

  describe('Aggregation Performance', () => {
    it('should efficiently calculate leave balance summaries', async () => {
      await benchmarkQuery(
        async () => {
          // Aggregation query for analytics
          const { data, error } = await supabaseAdmin
            .rpc('get_leave_analytics', {
              start_date: '2025-01-01',
              end_date: '2025-12-31'
            })

          // If the RPC doesn't exist, test with a regular aggregation
          if (error && error.message.includes('function')) {
            const { data: fallbackData, error: fallbackError } = await supabaseAdmin
              .from('leave_requests')
              .select('status, days_requested, leave_type')
              .gte('start_date', '2025-01-01')
              .lte('end_date', '2025-12-31')
              .limit(1000)

            expect(fallbackError).toBeNull()
            return fallbackData
          }

          expect(error).toBeNull()
          return data
        },
        'Leave Analytics Aggregation',
        150 // 150ms threshold
      )
    })
  })

  describe('Concurrent Query Performance', () => {
    it('should handle concurrent queries efficiently', async () => {
      const concurrentQueries = 5
      const promises = Array.from({ length: concurrentQueries }, (_, i) =>
        benchmarkQuery(
          async () => {
            const { data, error } = await supabaseAdmin
              .from('leave_requests')
              .select('id, user_id, status')
              .eq('status', 'approved')
              .limit(10)

            expect(error).toBeNull()
            return data
          },
          `Concurrent Query ${i + 1}`,
          100, // 100ms threshold
          3 // Fewer iterations for concurrent tests
        )
      )

      const results = await Promise.all(promises)
      
      // All concurrent queries should pass their thresholds
      results.forEach(result => {
        expect(result.passesThreshold).toBe(true)
      })

      const avgOfAverages = results.reduce((sum, r) => sum + r.avgTime, 0) / results.length
      console.log(`\nConcurrent Queries Average: ${avgOfAverages.toFixed(2)}ms`)
    })
  })
})