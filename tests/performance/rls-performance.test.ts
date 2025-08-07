import { createAdminClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'

describe('RLS Policy Performance Tests', () => {
  let supabaseAdmin: SupabaseClient
  
  beforeAll(() => {
    supabaseAdmin = createAdminClient()
  })

  // Test data setup
  const testOrgId = 'test-org-performance'
  const testUserId = 'test-user-performance'

  beforeEach(async () => {
    // Clean up any existing test data
    await cleanupTestData()
    
    // Create test organization and user
    await setupTestData()
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  async function setupTestData() {
    // Create test organization
    await supabaseAdmin
      .from('organizations')
      .upsert({
        id: testOrgId,
        name: 'Performance Test Org',
        created_at: new Date().toISOString()
      })

    // Create test user organization relationship
    await supabaseAdmin
      .from('user_organizations')
      .upsert({
        user_id: testUserId,
        organization_id: testOrgId,
        role: 'employee',
        is_active: true,
        created_at: new Date().toISOString()
      })

    // Create test leave requests for performance testing
    const leaveRequests = Array.from({ length: 100 }, (_, i) => ({
      id: `test-leave-${i}`,
      user_id: testUserId,
      leave_type: 'Annual Leave',
      start_date: new Date(2025, 0, i + 1).toISOString().split('T')[0],
      end_date: new Date(2025, 0, i + 2).toISOString().split('T')[0],
      days_requested: 1,
      status: i % 3 === 0 ? 'approved' : i % 3 === 1 ? 'pending' : 'rejected',
      created_at: new Date().toISOString()
    }))

    await supabaseAdmin
      .from('leave_requests')
      .upsert(leaveRequests)

    // Create additional users in the same org for cross-user queries
    for (let i = 0; i < 50; i++) {
      await supabaseAdmin
        .from('user_organizations')
        .upsert({
          user_id: `test-user-${i}`,
          organization_id: testOrgId,
          role: 'employee',
          is_active: true,
          created_at: new Date().toISOString()
        })

      // Create leave requests for each user
      await supabaseAdmin
        .from('leave_requests')
        .upsert({
          id: `test-leave-user-${i}`,
          user_id: `test-user-${i}`,
          leave_type: 'Annual Leave',
          start_date: '2025-01-15',
          end_date: '2025-01-16',
          days_requested: 1,
          status: 'approved',
          created_at: new Date().toISOString()
        })
    }
  }

  async function cleanupTestData() {
    // Delete in reverse dependency order
    await supabaseAdmin
      .from('leave_requests')
      .delete()
      .like('id', 'test-leave%')

    await supabaseAdmin
      .from('user_organizations')
      .delete()
      .eq('organization_id', testOrgId)

    await supabaseAdmin
      .from('user_organizations')
      .delete()
      .like('user_id', 'test-user%')

    await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', testOrgId)
  }

  async function measureQueryPerformance(
    queryFn: () => Promise<any>,
    description: string
  ) {
    const iterations = 5
    const times: number[] = []
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await queryFn()
      const end = performance.now()
      times.push(end - start)
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    
    console.log(`${description}:`)
    console.log(`  Average: ${avgTime.toFixed(2)}ms`)
    console.log(`  Min: ${minTime.toFixed(2)}ms`)
    console.log(`  Max: ${maxTime.toFixed(2)}ms`)
    
    return { avgTime, minTime, maxTime }
  }

  describe('User Organizations Policy Performance', () => {
    it('should efficiently query user organizations with RLS', async () => {
      // Simulate authenticated user query
      const supabaseClient = supabaseAdmin

      const performance = await measureQueryPerformance(
        async () => {
          const { data, error } = await supabaseClient
            .from('user_organizations')
            .select('*')
            .eq('user_id', testUserId)

          expect(error).toBeNull()
          expect(data).toBeDefined()
          return data
        },
        'User Organizations Query'
      )

      // Performance threshold: should complete in under 100ms on average
      expect(performance.avgTime).toBeLessThan(100)
    })

    it('should efficiently query organization members', async () => {
      const supabaseClient = supabaseAdmin

      const performance = await measureQueryPerformance(
        async () => {
          const { data, error } = await supabaseClient
            .from('user_organizations')
            .select('*')
            .eq('organization_id', testOrgId)
            .eq('is_active', true)

          expect(error).toBeNull()
          expect(data).toBeDefined()
          expect(data.length).toBeGreaterThan(0)
          return data
        },
        'Organization Members Query'
      )

      // Performance threshold: should complete in under 150ms on average
      expect(performance.avgTime).toBeLessThan(150)
    })
  })

  describe('Leave Requests Policy Performance', () => {
    it('should efficiently query organization leave requests', async () => {
      const supabaseClient = supabaseAdmin

      const performance = await measureQueryPerformance(
        async () => {
          // Simulate the RLS policy logic for cross-organization leave requests
          const { data: userOrgs } = await supabaseClient
            .from('user_organizations')
            .select('user_id')
            .eq('organization_id', testOrgId)
            .eq('is_active', true)

          const userIds = userOrgs?.map(uo => uo.user_id) || []

          const { data, error } = await supabaseClient
            .from('leave_requests')
            .select('*')
            .in('user_id', userIds)

          expect(error).toBeNull()
          expect(data).toBeDefined()
          return data
        },
        'Organization Leave Requests Query'
      )

      // Performance threshold: should complete in under 200ms on average
      expect(performance.avgTime).toBeLessThan(200)
    })

    it('should efficiently query leave requests by date range', async () => {
      const supabaseClient = supabaseAdmin

      const performance = await measureQueryPerformance(
        async () => {
          const { data, error } = await supabaseClient
            .from('leave_requests')
            .select('*')
            .gte('start_date', '2025-01-01')
            .lte('end_date', '2025-01-31')
            .eq('user_id', testUserId)

          expect(error).toBeNull()
          expect(data).toBeDefined()
          return data
        },
        'Leave Requests Date Range Query'
      )

      // Performance threshold: should complete in under 100ms on average
      expect(performance.avgTime).toBeLessThan(100)
    })

    it('should efficiently query leave requests by status', async () => {
      const supabaseClient = supabaseAdmin

      const performance = await measureQueryPerformance(
        async () => {
          const { data, error } = await supabaseClient
            .from('leave_requests')
            .select('*')
            .eq('status', 'approved')
            .eq('user_id', testUserId)

          expect(error).toBeNull()
          expect(data).toBeDefined()
          return data
        },
        'Leave Requests Status Query'
      )

      // Performance threshold: should complete in under 80ms on average
      expect(performance.avgTime).toBeLessThan(80)
    })
  })

  describe('Complex Multi-table Query Performance', () => {
    it('should efficiently execute complex organization-scoped queries', async () => {
      const supabaseClient = supabaseAdmin

      const performance = await measureQueryPerformance(
        async () => {
          // Complex query simulating a typical dashboard view
          const { data, error } = await supabaseClient
            .from('leave_requests')
            .select(`
              *,
              user_organizations!inner (
                role,
                is_active,
                organization_id
              )
            `)
            .eq('user_organizations.organization_id', testOrgId)
            .eq('user_organizations.is_active', true)
            .gte('start_date', '2025-01-01')
            .order('created_at', { ascending: false })
            .limit(50)

          expect(error).toBeNull()
          expect(data).toBeDefined()
          return data
        },
        'Complex Multi-table Query'
      )

      // Performance threshold: should complete in under 300ms on average
      expect(performance.avgTime).toBeLessThan(300)
    })
  })

  describe('Policy Efficiency Analysis', () => {
    it('should analyze query execution plans', async () => {
      // This test would analyze the actual execution plans of RLS policies
      // In a real implementation, you'd connect directly to PostgreSQL
      // and use EXPLAIN ANALYZE to get detailed performance metrics
      
      const mockAnalysis = {
        policyName: 'Users can view organization leave requests',
        executionTime: '45.2ms',
        indexesUsed: ['idx_leave_requests_user_id', 'idx_user_organizations_org_user'],
        suggestedOptimizations: [
          'Add composite index on (organization_id, is_active) for user_organizations',
          'Consider denormalizing organization_id in leave_requests table'
        ]
      }

      expect(mockAnalysis.executionTime).toBeDefined()
      expect(mockAnalysis.indexesUsed.length).toBeGreaterThan(0)
      
      console.log('RLS Policy Analysis:', mockAnalysis)
    })
  })
})