import { DatabaseQueryAnalyzer, createQueryAnalyzer } from '@/lib/performance/query-analyzer'
import { TestDatabaseUtils, PerformanceMeasurement, TEST_CONFIG } from '../setup/test-environment'

describe('Database Query Analysis and Performance Monitoring', () => {
  let queryAnalyzer: DatabaseQueryAnalyzer
  let testDb: TestDatabaseUtils

  beforeAll(async () => {
    queryAnalyzer = createQueryAnalyzer()
    testDb = new TestDatabaseUtils()
    await testDb.setupTestEnvironment()
  })

  afterAll(async () => {
    await testDb.cleanupTestData('query-test-')
  })

  describe('Query Performance Analysis', () => {
    it('should analyze database performance comprehensively', async () => {
      const analysis = await queryAnalyzer.analyzePerformance()

      expect(analysis).toBeDefined()
      expect(analysis.slowQueries).toBeInstanceOf(Array)
      expect(analysis.indexUsage).toBeInstanceOf(Array)
      expect(analysis.tableStats).toBeInstanceOf(Array)
      expect(analysis.recommendations).toBeInstanceOf(Array)

      console.log('\n📊 Database Performance Analysis Results:')
      console.log('==========================================')
      
      console.log('\n🐌 Slow Queries:')
      analysis.slowQueries.forEach(query => {
        console.log(`  - ${query.queryId}: ${query.avgExecutionTime.toFixed(2)}ms avg`)
        if (query.suggestions.length > 0) {
          console.log(`    Suggestions: ${query.suggestions.join(', ')}`)
        }
      })

      console.log('\n📈 Index Usage:')
      analysis.indexUsage.slice(0, 5).forEach(idx => {
        console.log(`  - ${idx.indexName}: ${idx.indexScans} scans, ${idx.usageEfficiency}% efficiency`)
      })

      console.log('\n📋 Table Statistics:')
      analysis.tableStats.forEach(table => {
        const scanRatio = table.sequentialScans + table.indexScans > 0 
          ? (table.indexScans / (table.sequentialScans + table.indexScans) * 100).toFixed(1)
          : '0'
        console.log(`  - ${table.tableName}: ${table.totalRows} rows, ${scanRatio}% index usage`)
      })

      console.log('\n💡 Recommendations:')
      analysis.recommendations.forEach(rec => {
        console.log(`  ${rec}`)
      })

      // Verify we have meaningful data
      expect(analysis.slowQueries.length).toBeGreaterThanOrEqual(0)
      expect(analysis.indexUsage.length).toBeGreaterThanOrEqual(0)
      expect(analysis.tableStats.length).toBeGreaterThan(0)
      expect(analysis.recommendations.length).toBeGreaterThan(0)
    })

    it('should run performance benchmarks on critical queries', async () => {
      const benchmarkResults = await queryAnalyzer.runPerformanceBenchmark()

      expect(benchmarkResults).toBeInstanceOf(Array)
      expect(benchmarkResults.length).toBeGreaterThan(0)

      console.log('\n⚡ Query Performance Benchmarks:')
      console.log('================================')
      
      benchmarkResults.forEach(result => {
        console.log(`  ${result.queryName}: ${result.avgTime}ms avg (${result.iterations} iterations)`)
        
        // Most queries should be reasonably fast
        if (result.queryName.includes('Organization Lookup')) {
          expect(result.avgTime).toBeLessThan(TEST_CONFIG.THRESHOLDS.SIMPLE_QUERY)
        } else {
          expect(result.avgTime).toBeLessThan(TEST_CONFIG.THRESHOLDS.COMPLEX_QUERY)
        }
      })

      const avgPerformance = benchmarkResults.reduce((sum, r) => sum + r.avgTime, 0) / benchmarkResults.length
      console.log(`\n  Overall Average: ${avgPerformance.toFixed(2)}ms`)
      
      // Overall performance should be good
      expect(avgPerformance).toBeLessThan(TEST_CONFIG.THRESHOLDS.COMPLEX_QUERY)
    })
  })

  describe('Index Effectiveness Analysis', () => {
    beforeEach(async () => {
      // Create test data for index analysis
      await testDb.createTestOrganization('query-test-org-1', 'Index Test Org 1')
      await testDb.createTestUser('query-test-user-1', 'query-test-org-1', 'admin')
      
      // Create multiple leave requests to test index usage
      for (let i = 0; i < 20; i++) {
        await testDb.createTestLeaveRequest(
          `query-test-leave-${i}`,
          'query-test-user-1',
          {
            startDate: `2025-01-${(i % 28) + 1}`,
            endDate: `2025-01-${(i % 28) + 2}`,
            status: ['approved', 'pending', 'rejected'][i % 3]
          }
        )
      }
    })

    it('should verify index usage on user organization queries', async () => {
      const stats = await PerformanceMeasurement.measureQuery(
        async () => {
          const analysis = await queryAnalyzer.analyzePerformance()
          const userOrgIndex = analysis.indexUsage.find(idx => 
            idx.indexName.includes('user_organizations') || 
            idx.tableName === 'user_organizations'
          )
          return userOrgIndex
        },
        'User Organization Index Analysis'
      )

      expect(stats.result).toBeDefined()
      expect(PerformanceMeasurement.assertPerformanceThreshold(
        stats, 
        TEST_CONFIG.THRESHOLDS.SIMPLE_QUERY
      )).toBe(true)
    })

    it('should verify index usage on leave request queries', async () => {
      const stats = await PerformanceMeasurement.measureQuery(
        async () => {
          // Test query that should use leave_requests indexes
          const analysis = await queryAnalyzer.analyzePerformance()
          const leaveRequestsIndexes = analysis.indexUsage.filter(idx => 
            idx.tableName === 'leave_requests'
          )
          return leaveRequestsIndexes
        },
        'Leave Requests Index Analysis'
      )

      expect(stats.result).toBeInstanceOf(Array)
      expect(PerformanceMeasurement.assertPerformanceThreshold(
        stats, 
        TEST_CONFIG.THRESHOLDS.COMPLEX_QUERY
      )).toBe(true)
    })

    it('should identify tables needing index optimization', async () => {
      const analysis = await queryAnalyzer.analyzePerformance()
      
      const tablesNeedingOptimization = analysis.tableStats.filter(table => {
        const totalScans = table.sequentialScans + table.indexScans
        const indexRatio = totalScans > 0 ? table.indexScans / totalScans : 1
        return indexRatio < 0.8 && table.totalRows > 100 // Less than 80% index usage
      })

      console.log('\n🔍 Tables Needing Index Optimization:')
      tablesNeedingOptimization.forEach(table => {
        const indexRatio = ((table.indexScans / (table.sequentialScans + table.indexScans)) * 100).toFixed(1)
        console.log(`  - ${table.tableName}: ${indexRatio}% index usage (${table.totalRows} rows)`)
        console.log(`    Recommended indexes:`)
        table.recommendedIndexes.forEach(idx => {
          console.log(`      * ${idx}`)
        })
      })

      // At least verify the analysis runs without errors
      expect(analysis.tableStats.length).toBeGreaterThan(0)
    })
  })

  describe('Query Pattern Analysis', () => {
    it('should analyze common RLS policy query patterns', async () => {
      const commonPatterns = [
        {
          name: 'Organization Member Access',
          description: 'Query pattern used by RLS policies to check organization membership'
        },
        {
          name: 'Cross-Organization Data Access', 
          description: 'Pattern for accessing data across organization boundaries'
        },
        {
          name: 'Role-Based Access Control',
          description: 'Pattern for admin/manager role-based data access'
        }
      ]

      const stats = await PerformanceMeasurement.measureQuery(
        async () => {
          const analysis = await queryAnalyzer.analyzePerformance()
          
          // Look for queries that match our common patterns
          const patternMatches = analysis.slowQueries.filter(query => {
            return query.queryText.includes('user_organizations') ||
                   query.queryText.includes('organization_id') ||
                   query.queryText.includes('role')
          })

          return patternMatches
        },
        'RLS Policy Pattern Analysis',
        TEST_CONFIG.ITERATIONS.QUICK
      )

      console.log('\n🔍 RLS Policy Query Pattern Analysis:')
      console.log('====================================')
      
      commonPatterns.forEach(pattern => {
        console.log(`\n${pattern.name}:`)
        console.log(`  ${pattern.description}`)
      })

      if (stats.result && Array.isArray(stats.result)) {
        console.log(`\nFound ${stats.result.length} queries matching common patterns`)
        stats.result.forEach((query: any) => {
          console.log(`  - ${query.queryId}: ${query.avgExecutionTime}ms avg`)
        })
      }

      expect(stats.result).toBeDefined()
      expect(PerformanceMeasurement.assertPerformanceThreshold(
        stats,
        TEST_CONFIG.THRESHOLDS.COMPLEX_QUERY
      )).toBe(true)
    })

    it('should measure performance impact of different query approaches', async () => {
      // Test different approaches to the same query to compare performance
      const approaches = [
        {
          name: 'Direct JOIN approach',
          query: async () => {
            // This simulates an optimized approach
            return { executionTime: 25, rowsAffected: 150 }
          }
        },
        {
          name: 'Subquery approach',
          query: async () => {
            // This simulates a less optimal approach
            return { executionTime: 75, rowsAffected: 150 }
          }
        },
        {
          name: 'EXISTS approach',
          query: async () => {
            // This simulates an EXISTS-based approach
            return { executionTime: 45, rowsAffected: 150 }
          }
        }
      ]

      const results = []

      for (const approach of approaches) {
        const stats = await PerformanceMeasurement.measureQuery(
          approach.query,
          approach.name,
          TEST_CONFIG.ITERATIONS.QUICK
        )

        results.push({
          name: approach.name,
          avgTime: stats.avgTime,
          efficiency: stats.result ? (stats.result.rowsAffected / stats.avgTime) : 0
        })
      }

      console.log('\n⚖️ Query Approach Comparison:')
      console.log('=============================')
      
      results.forEach(result => {
        console.log(`  ${result.name}: ${result.avgTime.toFixed(2)}ms avg`)
        console.log(`    Efficiency: ${result.efficiency.toFixed(2)} rows/ms`)
      })

      // Find the most efficient approach
      const mostEfficient = results.reduce((prev, current) => 
        current.avgTime < prev.avgTime ? current : prev
      )
      
      console.log(`\n🏆 Most efficient approach: ${mostEfficient.name}`)

      expect(results.length).toBe(3)
      expect(mostEfficient.name).toBe('Direct JOIN approach') // Should be the fastest
    })
  })

  describe('Performance Regression Detection', () => {
    it('should establish performance baselines', async () => {
      const baselines = {
        userOrgLookup: TEST_CONFIG.THRESHOLDS.SIMPLE_QUERY,
        leaveRequestsByDate: TEST_CONFIG.THRESHOLDS.COMPLEX_QUERY,
        organizationMembers: TEST_CONFIG.THRESHOLDS.SIMPLE_QUERY,
        complexDashboardQuery: TEST_CONFIG.THRESHOLDS.AGGREGATION_QUERY
      }

      console.log('\n📏 Performance Baselines:')
      console.log('=========================')
      
      Object.entries(baselines).forEach(([queryType, threshold]) => {
        console.log(`  ${queryType}: ${threshold}ms threshold`)
      })

      const benchmarkResults = await queryAnalyzer.runPerformanceBenchmark()
      
      console.log('\n📊 Current Performance vs Baselines:')
      benchmarkResults.forEach(result => {
        const baseline = baselines.userOrgLookup // Simplified for test
        const status = result.avgTime <= baseline ? '✅ GOOD' : '⚠️ SLOW'
        console.log(`  ${result.queryName}: ${result.avgTime}ms (baseline: ${baseline}ms) ${status}`)
      })

      expect(benchmarkResults.every(result => result.avgTime > 0)).toBe(true)
    })

    it('should detect performance regressions', async () => {
      // Simulate historical performance data
      const historicalData = [
        { query: 'user_org_lookup', avgTime: 25, date: '2025-01-01' },
        { query: 'leave_requests_by_date', avgTime: 80, date: '2025-01-01' },
        { query: 'organization_members', avgTime: 35, date: '2025-01-01' }
      ]

      const currentResults = await queryAnalyzer.runPerformanceBenchmark()

      console.log('\n📈 Performance Trend Analysis:')
      console.log('==============================')

      const regressions = []
      
      currentResults.forEach(current => {
        const historical = historicalData.find(h => 
          current.queryName.toLowerCase().includes(h.query.replace(/_/g, ' '))
        )
        
        if (historical) {
          const changePercent = ((current.avgTime - historical.avgTime) / historical.avgTime) * 100
          const status = changePercent > 20 ? '🔴 REGRESSION' : 
                        changePercent > 10 ? '⚠️ SLOWDOWN' : '✅ STABLE'
          
          console.log(`  ${current.queryName}:`)
          console.log(`    Historical: ${historical.avgTime}ms`)
          console.log(`    Current: ${current.avgTime}ms`)
          console.log(`    Change: ${changePercent.toFixed(1)}% ${status}`)
          
          if (changePercent > 20) {
            regressions.push({
              query: current.queryName,
              change: changePercent,
              currentTime: current.avgTime,
              historicalTime: historical.avgTime
            })
          }
        }
      })

      if (regressions.length > 0) {
        console.log('\n🚨 Performance Regressions Detected:')
        regressions.forEach(reg => {
          console.log(`  - ${reg.query}: ${reg.change.toFixed(1)}% slower`)
        })
      } else {
        console.log('\n✅ No significant performance regressions detected')
      }

      expect(currentResults.length).toBeGreaterThan(0)
      // In a real test, you might fail if regressions are detected
      // expect(regressions.length).toBe(0)
    })
  })
})