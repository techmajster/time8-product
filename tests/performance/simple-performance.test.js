const { performanceThresholds, getPerformanceRating } = require('@/lib/performance/web-vitals-monitor')

describe('Simple Performance Tests', () => {
  describe('Performance Thresholds', () => {
    test('should have correct performance thresholds', () => {
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
  })

  describe('Performance Rating', () => {
    test('should rate good performance correctly', () => {
      expect(getPerformanceRating('CLS', 0.05)).toBe('good')
      expect(getPerformanceRating('FID', 50)).toBe('good')
      expect(getPerformanceRating('LCP', 2000)).toBe('good')
    })

    test('should rate needs improvement correctly', () => {
      expect(getPerformanceRating('CLS', 0.15)).toBe('needs-improvement')
      expect(getPerformanceRating('FID', 200)).toBe('needs-improvement')
      expect(getPerformanceRating('LCP', 3000)).toBe('needs-improvement')
    })

    test('should rate poor performance correctly', () => {
      expect(getPerformanceRating('CLS', 0.3)).toBe('poor')
      expect(getPerformanceRating('FID', 400)).toBe('poor')
      expect(getPerformanceRating('LCP', 5000)).toBe('poor')
    })

    test('should handle unknown metrics', () => {
      expect(getPerformanceRating('UNKNOWN', 1000)).toBe('good')
    })
  })

  describe('Performance Impact Calculation', () => {
    test('should calculate performance impact correctly', () => {
      const calculateImpact = (actual, threshold) => {
        return Math.round(((actual - threshold) / threshold) * 100)
      }

      expect(calculateImpact(0.2, 0.1)).toBe(100) // 100% over threshold
      expect(calculateImpact(300, 100)).toBe(200) // 200% over threshold
      expect(calculateImpact(3750, 2500)).toBe(50) // 50% over threshold
    })
  })

  describe('Resource Type Detection', () => {
    test('should categorize resource types correctly', () => {
      const getResourceType = (url) => {
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

  describe('Performance Data Analytics', () => {
    test('should calculate aggregated statistics correctly', () => {
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

  describe('Critical Issue Detection', () => {
    test('should identify critical performance issues', () => {
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
  })
})