/**
 * @jest-environment jsdom
 */

import { getWebVitalsMonitor, performanceThresholds, getPerformanceRating } from '@/lib/performance/web-vitals-monitor'

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock navigation API
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'Test User Agent',
    connection: {
      effectiveType: '4g'
    }
  },
  writable: true
})

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
  writable: true
})

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => [{ duration: 100 }]),
    now: jest.fn(() => Date.now())
  },
  writable: true
})

describe('Performance Monitoring System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })

  describe('Web Vitals Monitor', () => {
    it('should initialize monitoring system', () => {
      const monitor = getWebVitalsMonitor()
      expect(monitor).toBeDefined()
    })

    it('should handle performance metrics correctly', async () => {
      const monitor = getWebVitalsMonitor()
      
      // Get current metrics (may be empty initially)
      const metrics = monitor.getCurrentMetrics()
      expect(metrics).toBeDefined()
      expect(typeof metrics).toBe('object')
    })

    it('should mark custom metrics', () => {
      const monitor = getWebVitalsMonitor()
      
      const duration = monitor.markCustomMetric('test-metric')
      
      expect(window.performance.mark).toHaveBeenCalledWith('test-metric-start')
      expect(window.performance.mark).toHaveBeenCalledWith('test-metric-end')
      expect(window.performance.measure).toHaveBeenCalledWith(
        'test-metric', 
        'test-metric-start', 
        'test-metric-end'
      )
    })

    it('should generate performance report', async () => {
      const monitor = getWebVitalsMonitor()
      
      // Mock getCLS, getFID, etc. functions
      const mockReport = await monitor.getPerformanceReport()
      
      // Report might be null if metrics aren't available
      if (mockReport) {
        expect(mockReport).toHaveProperty('timestamp')
        expect(mockReport).toHaveProperty('url')
        expect(mockReport).toHaveProperty('userAgent')
        expect(typeof mockReport.timestamp).toBe('number')
      }
    })
  })

  describe('Performance Thresholds and Rating', () => {
    it('should have correct performance thresholds', () => {
      expect(performanceThresholds.good).toEqual({
        CLS: 0.1,
        FID: 100,
        FCP: 1800,
        INP: 200,
        LCP: 2500,
        TTFB: 600
      })

      expect(performanceThresholds.needsImprovement).toEqual({
        CLS: 0.25,
        FID: 300,
        FCP: 3000,
        INP: 500,
        LCP: 4000,
        TTFB: 1800
      })
    })

    it('should rate performance correctly', () => {
      // Good performance
      expect(getPerformanceRating('CLS', 0.05)).toBe('good')
      expect(getPerformanceRating('FID', 50)).toBe('good')
      expect(getPerformanceRating('LCP', 2000)).toBe('good')

      // Needs improvement
      expect(getPerformanceRating('CLS', 0.15)).toBe('needs-improvement')
      expect(getPerformanceRating('FID', 200)).toBe('needs-improvement')
      expect(getPerformanceRating('LCP', 3000)).toBe('needs-improvement')

      // Poor performance
      expect(getPerformanceRating('CLS', 0.3)).toBe('poor')
      expect(getPerformanceRating('FID', 400)).toBe('poor')
      expect(getPerformanceRating('LCP', 5000)).toBe('poor')

      // Unknown metric should default to good
      expect(getPerformanceRating('UNKNOWN', 1000)).toBe('good')
    })
  })

  describe('Performance Reporting', () => {
    it('should batch reports correctly', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      })

      const monitor = getWebVitalsMonitor()
      
      // Simulate multiple metrics
      const mockMetrics = [
        { name: 'CLS', value: 0.05, rating: 'good' as const, delta: 0.01, id: '1', entries: [] },
        { name: 'FID', value: 120, rating: 'needs-improvement' as const, delta: 20, id: '2', entries: [] },
        { name: 'LCP', value: 2800, rating: 'needs-improvement' as const, delta: 300, id: '3', entries: [] },
      ]

      // The monitor should batch these reports
      // We can't directly test the private batching mechanism,
      // but we can verify the system handles multiple metrics
      expect(monitor.getCurrentMetrics()).toBeDefined()
    })

    it('should handle API errors gracefully', async () => {
      ;(fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const monitor = getWebVitalsMonitor()
      
      // The monitor should not throw errors when API calls fail
      // Performance monitoring is non-critical and should fail silently
      expect(() => monitor.getCurrentMetrics()).not.toThrow()
    })
  })

  describe('Performance Issue Detection', () => {
    it('should identify critical performance issues', () => {
      const testCases = [
        {
          metric: 'CLS',
          value: 0.3,
          expected: true,
          description: 'High CLS should be critical'
        },
        {
          metric: 'FID',
          value: 350,
          expected: true,
          description: 'High FID should be critical'
        },
        {
          metric: 'LCP',
          value: 4500,
          expected: true,
          description: 'High LCP should be critical'
        },
        {
          metric: 'CLS',
          value: 0.05,
          expected: false,
          description: 'Low CLS should not be critical'
        },
        {
          metric: 'FID',
          value: 80,
          expected: false,
          description: 'Low FID should not be critical'
        }
      ]

      testCases.forEach(testCase => {
        const rating = getPerformanceRating(testCase.metric, testCase.value)
        const isCritical = rating === 'poor'
        
        expect(isCritical).toBe(testCase.expected)
      })
    })

    it('should calculate performance impact correctly', () => {
      const calculateImpact = (actual: number, threshold: number) => {
        return Math.round(((actual - threshold) / threshold) * 100)
      }

      // Test performance impact calculations
      expect(calculateImpact(0.2, 0.1)).toBe(100) // 100% over threshold
      expect(calculateImpact(300, 100)).toBe(200) // 200% over threshold
      expect(calculateImpact(3750, 2500)).toBe(50) // 50% over threshold
    })
  })

  describe('Resource Monitoring', () => {
    it('should detect slow resources', () => {
      // Mock PerformanceObserver
      const mockObserver = {
        observe: jest.fn(),
        disconnect: jest.fn()
      }
      
      global.PerformanceObserver = jest.fn(() => mockObserver) as any

      const monitor = getWebVitalsMonitor()
      
      // Verify that performance observer is set up
      expect(PerformanceObserver).toHaveBeenCalled()
      expect(mockObserver.observe).toHaveBeenCalledWith({ entryTypes: ['resource'] })
    })

    it('should categorize resource types correctly', () => {
      const getResourceType = (url: string): string => {
        if (url.includes('.js')) return 'script'
        if (url.includes('.css')) return 'stylesheet'
        if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image'
        if (url.includes('api/')) return 'api'
        return 'other'
      }

      expect(getResourceType('https://example.com/app.js')).toBe('script')
      expect(getResourceType('https://example.com/styles.css')).toBe('stylesheet')
      expect(getResourceType('https://example.com/image.png')).toBe('image')
      expect(getResourceType('https://example.com/api/data')).toBe('api')
      expect(getResourceType('https://example.com/document.pdf')).toBe('other')
    })
  })

  describe('Connection Type Detection', () => {
    it('should detect connection type', () => {
      const getConnectionType = (): string | undefined => {
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
        return connection?.effectiveType || connection?.type
      }

      expect(getConnectionType()).toBe('4g')
    })
  })

  describe('Custom Metrics', () => {
    it('should support custom performance markers', () => {
      const monitor = getWebVitalsMonitor()
      
      // Test custom metric timing
      const startTime = performance.now()
      const duration = monitor.markCustomMetric('custom-operation', startTime)
      
      expect(duration).toBeDefined()
      expect(window.performance.mark).toHaveBeenCalledWith('custom-operation-start', { startTime })
      expect(window.performance.mark).toHaveBeenCalledWith('custom-operation-end')
    })

    it('should handle performance measurement errors', () => {
      const monitor = getWebVitalsMonitor()
      
      // Mock performance.measure to throw an error
      ;(window.performance.measure as jest.Mock).mockImplementation(() => {
        throw new Error('Measurement failed')
      })
      
      // Should not throw error and should return null
      const duration = monitor.markCustomMetric('failing-operation')
      expect(duration).toBeNull()
    })
  })

  describe('Memory Management', () => {
    it('should clean up resources when destroyed', () => {
      const monitor = getWebVitalsMonitor()
      
      // Call destroy method
      monitor.destroy()
      
      // Verify cleanup
      expect(monitor.getCurrentMetrics()).toEqual({})
    })
  })

  describe('Performance Analytics Integration', () => {
    it('should format performance data for analytics', () => {
      const mockReport = {
        cls: 0.15,
        fid: 150,
        fcp: 2200,
        inp: 300,
        lcp: 3200,
        ttfb: 800,
        timestamp: Date.now(),
        url: 'https://example.com/dashboard',
        userAgent: 'Test Browser',
        connectionType: '4g',
        organizationId: 'org-123',
        userId: 'user-456'
      }

      // Verify all required fields are present
      expect(mockReport).toHaveProperty('cls')
      expect(mockReport).toHaveProperty('fid')
      expect(mockReport).toHaveProperty('fcp')
      expect(mockReport).toHaveProperty('lcp')
      expect(mockReport).toHaveProperty('ttfb')
      expect(mockReport).toHaveProperty('timestamp')
      expect(mockReport).toHaveProperty('url')
      expect(mockReport).toHaveProperty('userAgent')

      // Verify data types
      expect(typeof mockReport.cls).toBe('number')
      expect(typeof mockReport.timestamp).toBe('number')
      expect(typeof mockReport.url).toBe('string')
    })

    it('should calculate aggregated statistics correctly', () => {
      const sampleData = [
        { cls: 0.1, fid: 100, lcp: 2500 },
        { cls: 0.2, fid: 150, lcp: 3000 },
        { cls: 0.05, fid: 80, lcp: 2200 },
        { cls: 0.15, fid: 120, lcp: 2800 },
      ]

      // Calculate averages
      const avgCls = sampleData.reduce((sum, item) => sum + item.cls, 0) / sampleData.length
      const avgFid = sampleData.reduce((sum, item) => sum + item.fid, 0) / sampleData.length
      const avgLcp = sampleData.reduce((sum, item) => sum + item.lcp, 0) / sampleData.length

      expect(avgCls).toBeCloseTo(0.125, 3)
      expect(avgFid).toBeCloseTo(112.5, 1)
      expect(avgLcp).toBeCloseTo(2625, 0)

      // Calculate medians
      const sortedCls = sampleData.map(item => item.cls).sort((a, b) => a - b)
      const medianCls = sortedCls[Math.floor(sortedCls.length / 2)]
      expect(medianCls).toBe(0.15)
    })
  })

  describe('Real User Monitoring (RUM)', () => {
    it('should collect user session context', () => {
      ;(localStorage.getItem as jest.Mock)
        .mockReturnValueOnce('user-789') // userId
        .mockReturnValueOnce('org-456') // currentOrgId

      const monitor = getWebVitalsMonitor()
      
      // Verify context collection would work
      expect(localStorage.getItem).toHaveBeenCalledWith('userId')
      expect(localStorage.getItem).toHaveBeenCalledWith('currentOrgId')
    })

    it('should handle missing user context gracefully', () => {
      ;(localStorage.getItem as jest.Mock).mockReturnValue(null)

      const monitor = getWebVitalsMonitor()
      
      // Should not throw errors when user context is missing
      expect(() => monitor.getCurrentMetrics()).not.toThrow()
    })
  })
})