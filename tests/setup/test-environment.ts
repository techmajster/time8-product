import { createAdminClient } from '@/lib/supabase/server'
import dotenv from 'dotenv'

// Load environment variables for testing
dotenv.config({ path: '.env.local' })

// Test environment configuration
export const TEST_CONFIG = {
  // Performance thresholds in milliseconds
  THRESHOLDS: {
    SIMPLE_QUERY: 50,
    COMPLEX_QUERY: 100,
    SEARCH_QUERY: 80,
    AGGREGATION_QUERY: 150,
    PAGINATION_QUERY: 60,
    RLS_POLICY_QUERY: 100
  },
  
  // Test data configuration
  TEST_DATA: {
    ORGANIZATION_COUNT: 3,
    USERS_PER_ORG: 20,
    LEAVE_REQUESTS_PER_USER: 10,
    TEST_DATE_RANGE: {
      START: '2024-01-01',
      END: '2025-12-31'
    }
  },

  // Query iteration counts for performance tests
  ITERATIONS: {
    DEFAULT: 10,
    QUICK: 5,
    THOROUGH: 20
  }
}

// Test database utilities
export class TestDatabaseUtils {
  private supabaseAdmin = createAdminClient()

  async setupTestEnvironment() {
    console.log('Setting up test environment...')
    
    // Verify database connection
    const { data, error } = await this.supabaseAdmin
      .from('organizations')
      .select('count(*)')
      .limit(1)
      
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`)
    }
    
    console.log('Database connection verified')
    return true
  }

  async cleanupTestData(prefix: string = 'test-') {
    try {
      // Clean up test data in dependency order
      await this.supabaseAdmin
        .from('leave_requests')
        .delete()
        .like('id', `${prefix}%`)

      await this.supabaseAdmin
        .from('leave_balances')
        .delete()
        .like('user_id', `${prefix}%`)

      await this.supabaseAdmin
        .from('user_organizations')
        .delete()
        .like('user_id', `${prefix}%`)

      await this.supabaseAdmin
        .from('organizations')
        .delete()
        .like('id', `${prefix}%`)

      console.log(`Cleaned up test data with prefix: ${prefix}`)
    } catch (error) {
      console.warn('Test cleanup warning:', error)
    }
  }

  async createTestOrganization(id: string, name: string) {
    const { data, error } = await this.supabaseAdmin
      .from('organizations')
      .upsert({
        id,
        name,
        created_at: new Date().toISOString()
      })
      .select()

    if (error) {
      throw new Error(`Failed to create test organization: ${error.message}`)
    }

    return data[0]
  }

  async createTestUser(userId: string, orgId: string, role: string = 'employee') {
    const { data, error } = await this.supabaseAdmin
      .from('user_organizations')
      .upsert({
        user_id: userId,
        organization_id: orgId,
        role,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()

    if (error) {
      throw new Error(`Failed to create test user: ${error.message}`)
    }

    return data[0]
  }

  async createTestLeaveRequest(
    id: string,
    userId: string,
    options: {
      leaveType?: string
      startDate?: string
      endDate?: string
      status?: string
      daysRequested?: number
    } = {}
  ) {
    const {
      leaveType = 'Annual Leave',
      startDate = '2025-01-15',
      endDate = '2025-01-16',
      status = 'approved',
      daysRequested = 1
    } = options

    const { data, error } = await this.supabaseAdmin
      .from('leave_requests')
      .upsert({
        id,
        user_id: userId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        status,
        days_requested: daysRequested,
        created_at: new Date().toISOString()
      })
      .select()

    if (error) {
      throw new Error(`Failed to create test leave request: ${error.message}`)
    }

    return data[0]
  }

  async generateTestDataSet(
    orgCount: number = TEST_CONFIG.TEST_DATA.ORGANIZATION_COUNT,
    usersPerOrg: number = TEST_CONFIG.TEST_DATA.USERS_PER_ORG,
    leaveRequestsPerUser: number = TEST_CONFIG.TEST_DATA.LEAVE_REQUESTS_PER_USER
  ) {
    console.log(`Generating test dataset: ${orgCount} orgs, ${usersPerOrg} users/org, ${leaveRequestsPerUser} requests/user`)
    
    const createdData = {
      organizations: [] as any[],
      users: [] as any[],
      leaveRequests: [] as any[]
    }

    // Create organizations
    for (let i = 0; i < orgCount; i++) {
      const org = await this.createTestOrganization(
        `test-org-${i}`,
        `Test Organization ${i}`
      )
      createdData.organizations.push(org)

      // Create users for each organization
      for (let j = 0; j < usersPerOrg; j++) {
        const role = j === 0 ? 'admin' : j < 3 ? 'manager' : 'employee'
        const user = await this.createTestUser(
          `test-user-${i}-${j}`,
          org.id,
          role
        )
        createdData.users.push(user)

        // Create leave requests for each user
        for (let k = 0; k < leaveRequestsPerUser; k++) {
          const startDate = new Date(2025, 0, (k * 3) + 1).toISOString().split('T')[0]
          const endDate = new Date(2025, 0, (k * 3) + 2).toISOString().split('T')[0]
          const status = ['approved', 'pending', 'rejected'][k % 3]
          
          const leaveRequest = await this.createTestLeaveRequest(
            `test-leave-${i}-${j}-${k}`,
            user.user_id,
            {
              startDate,
              endDate,
              status,
              leaveType: k % 4 === 0 ? 'Sick Leave' : 'Annual Leave'
            }
          )
          createdData.leaveRequests.push(leaveRequest)
        }
      }
    }

    console.log(`Generated ${createdData.organizations.length} orgs, ${createdData.users.length} users, ${createdData.leaveRequests.length} leave requests`)
    return createdData
  }
}

// Performance measurement utilities
export class PerformanceMeasurement {
  static async measureQuery<T>(
    queryFn: () => Promise<T>,
    queryName: string,
    iterations: number = TEST_CONFIG.ITERATIONS.DEFAULT
  ) {
    const times: number[] = []
    let result: T | null = null
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      result = await queryFn()
      const end = performance.now()
      times.push(end - start)
      
      // Small delay between iterations
      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }
    
    const stats = {
      queryName,
      iterations,
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      medianTime: times.sort((a, b) => a - b)[Math.floor(times.length / 2)],
      p95Time: times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)],
      result
    }
    
    console.log(`\n${queryName} Performance (${iterations} iterations):`)
    console.log(`  Average: ${stats.avgTime.toFixed(2)}ms`)
    console.log(`  Median: ${stats.medianTime.toFixed(2)}ms`)
    console.log(`  95th percentile: ${stats.p95Time.toFixed(2)}ms`)
    console.log(`  Min: ${stats.minTime.toFixed(2)}ms`)
    console.log(`  Max: ${stats.maxTime.toFixed(2)}ms`)
    
    return stats
  }

  static assertPerformanceThreshold(
    stats: any,
    threshold: number,
    metric: 'avgTime' | 'medianTime' | 'p95Time' = 'avgTime'
  ) {
    const actualTime = stats[metric]
    const passed = actualTime <= threshold
    
    console.log(`Performance check: ${stats.queryName}`)
    console.log(`  ${metric}: ${actualTime.toFixed(2)}ms (threshold: ${threshold}ms)`)
    console.log(`  Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`)
    
    return passed
  }
}

// Global test setup
export async function setupTestEnvironment() {
  const testDb = new TestDatabaseUtils()
  await testDb.setupTestEnvironment()
  return testDb
}

export async function teardownTestEnvironment(testDb: TestDatabaseUtils) {
  await testDb.cleanupTestData()
}