'use client'

import { getCLS, getFID, getFCP, getLCP, getTTFB, onCLS, onFID, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'

export interface PerformanceMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  entries: PerformanceEntry[]
}

export interface WebVitalsReport {
  cls: number
  fid: number | null
  fcp: number
  inp: number | null
  lcp: number
  ttfb: number
  timestamp: number
  url: string
  userAgent: string
  connectionType?: string
  organizationId?: string
  userId?: string
}

class WebVitalsMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private reportingEndpoint = '/api/performance/web-vitals'
  private batchSize = 10
  private flushInterval = 30000 // 30 seconds
  private pendingReports: WebVitalsReport[] = []
  private timer: NodeJS.Timeout | null = null
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeMonitoring()
      this.startBatchReporting()
    }
  }

  private initializeMonitoring() {
    // Monitor Core Web Vitals
    onCLS(this.handleMetric.bind(this))
    onFID(this.handleMetric.bind(this))
    onFCP(this.handleMetric.bind(this))
    onINP(this.handleMetric.bind(this))
    onLCP(this.handleMetric.bind(this))
    onTTFB(this.handleMetric.bind(this))

    // Monitor additional performance metrics
    this.monitorResourceTiming()
    this.monitorNavigationTiming()
    this.monitorLongTasks()
  }

  private handleMetric(metric: PerformanceMetric) {
    this.metrics.set(metric.name, metric)
    
    // Log performance issues in development
    if (process.env.NODE_ENV === 'development') {
      const threshold = this.getThreshold(metric.name)
      if (metric.value > threshold) {
        console.warn(`Performance issue detected: ${metric.name}`, {
          value: metric.value,
          threshold,
          rating: metric.rating,
          id: metric.id
        })
      }
    }

    // Queue for reporting
    this.queueReport(metric)
  }

  private getThreshold(metricName: string): number {
    const thresholds: Record<string, number> = {
      'CLS': 0.1,
      'FID': 100,
      'FCP': 1800,
      'INP': 200,
      'LCP': 2500,
      'TTFB': 600
    }
    return thresholds[metricName] || 1000
  }

  private queueReport(metric: PerformanceMetric) {
    const report: WebVitalsReport = {
      cls: metric.name === 'CLS' ? metric.value : this.metrics.get('CLS')?.value || 0,
      fid: metric.name === 'FID' ? metric.value : this.metrics.get('FID')?.value || null,
      fcp: metric.name === 'FCP' ? metric.value : this.metrics.get('FCP')?.value || 0,
      inp: metric.name === 'INP' ? metric.value : this.metrics.get('INP')?.value || null,
      lcp: metric.name === 'LCP' ? metric.value : this.metrics.get('LCP')?.value || 0,
      ttfb: metric.name === 'TTFB' ? metric.value : this.metrics.get('TTFB')?.value || 0,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: this.getConnectionType(),
      organizationId: this.getOrganizationId(),
      userId: this.getUserId()
    }

    this.pendingReports.push(report)

    // Immediate reporting for critical performance issues
    if (this.isCriticalIssue(metric)) {
      this.flushReports()
    }
  }

  private isCriticalIssue(metric: PerformanceMetric): boolean {
    const criticalThresholds: Record<string, number> = {
      'CLS': 0.25,
      'FID': 300,
      'LCP': 4000,
      'INP': 500,
      'TTFB': 1800
    }
    
    const threshold = criticalThresholds[metric.name]
    return threshold ? metric.value > threshold : false
  }

  private getConnectionType(): string | undefined {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    return connection?.effectiveType || connection?.type
  }

  private getOrganizationId(): string | undefined {
    // Extract from URL or local storage
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('org') || localStorage.getItem('currentOrgId') || undefined
  }

  private getUserId(): string | undefined {
    // Extract from localStorage or session
    return localStorage.getItem('userId') || undefined
  }

  private startBatchReporting() {
    this.timer = setInterval(() => {
      this.flushReports()
    }, this.flushInterval)

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flushReports()
    })

    // Flush on visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushReports()
      }
    })
  }

  private async flushReports() {
    if (this.pendingReports.length === 0) return

    const reportsToSend = this.pendingReports.splice(0, this.batchSize)
    
    try {
      await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reports: reportsToSend,
          timestamp: Date.now()
        }),
        keepalive: true // Allows requests to continue even if page is unloading
      })
    } catch (error) {
      console.warn('Failed to send performance reports:', error)
      // Re-queue reports for next flush attempt
      this.pendingReports.unshift(...reportsToSend)
    }
  }

  private monitorResourceTiming() {
    if (!('PerformanceObserver' in window)) return

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming
          
          // Monitor slow resources (>2 seconds)
          if (resourceEntry.duration > 2000) {
            console.warn('Slow resource detected:', {
              name: resourceEntry.name,
              duration: resourceEntry.duration,
              size: resourceEntry.transferSize,
              type: this.getResourceType(resourceEntry.name)
            })
          }

          // Monitor large resources (>1MB)
          if (resourceEntry.transferSize > 1024 * 1024) {
            console.warn('Large resource detected:', {
              name: resourceEntry.name,
              size: resourceEntry.transferSize,
              duration: resourceEntry.duration
            })
          }
        }
      }
    })

    observer.observe({ entryTypes: ['resource'] })
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script'
    if (url.includes('.css')) return 'stylesheet'
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image'
    if (url.includes('api/')) return 'api'
    return 'other'
  }

  private monitorNavigationTiming() {
    if (!('PerformanceObserver' in window)) return

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming
          
          // Calculate key timing metrics
          const metrics = {
            domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
            domComplete: navEntry.domComplete - navEntry.navigationStart,
            loadComplete: navEntry.loadEventEnd - navEntry.navigationStart,
            firstByte: navEntry.responseStart - navEntry.requestStart,
            dnsLookup: navEntry.domainLookupEnd - navEntry.domainLookupStart,
            tcpConnect: navEntry.connectEnd - navEntry.connectStart,
          }

          // Log slow navigation timing
          if (metrics.loadComplete > 3000) {
            console.warn('Slow page load detected:', metrics)
          }
        }
      }
    })

    observer.observe({ entryTypes: ['navigation'] })
  }

  private monitorLongTasks() {
    if (!('PerformanceObserver' in window)) return

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'longtask') {
          console.warn('Long task detected:', {
            duration: entry.duration,
            startTime: entry.startTime,
            name: entry.name
          })
        }
      }
    })

    try {
      observer.observe({ entryTypes: ['longtask'] })
    } catch (error) {
      // Long tasks API not supported
      console.warn('Long tasks monitoring not supported')
    }
  }

  // Public methods
  public getCurrentMetrics(): Record<string, PerformanceMetric> {
    const result: Record<string, PerformanceMetric> = {}
    this.metrics.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  public async getPerformanceReport(): Promise<WebVitalsReport | null> {
    return new Promise((resolve) => {
      // Collect all metrics
      Promise.all([
        new Promise<number>((resolve) => getCLS(resolve)),
        new Promise<number | null>((resolve) => getFID((metric) => resolve(metric?.value || null))),
        new Promise<number>((resolve) => getFCP(resolve)),
        new Promise<number>((resolve) => getLCP(resolve)),
        new Promise<number>((resolve) => getTTFB(resolve)),
      ]).then(([cls, fid, fcp, lcp, ttfb]) => {
        resolve({
          cls,
          fid,
          fcp,
          inp: null, // INP is collected asynchronously
          lcp,
          ttfb,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          connectionType: this.getConnectionType(),
          organizationId: this.getOrganizationId(),
          userId: this.getUserId()
        })
      }).catch(() => {
        resolve(null)
      })
    })
  }

  public markCustomMetric(name: string, startTime?: number) {
    if (!('performance' in window)) return

    const markName = `${name}-start`
    const endMarkName = `${name}-end`
    
    if (startTime) {
      performance.mark(markName, { startTime })
    } else {
      performance.mark(markName)
    }
    
    performance.mark(endMarkName)
    
    try {
      performance.measure(name, markName, endMarkName)
      
      const measure = performance.getEntriesByName(name, 'measure')[0]
      console.log(`Custom metric ${name}: ${measure.duration}ms`)
      
      return measure.duration
    } catch (error) {
      console.warn(`Failed to measure ${name}:`, error)
      return null
    }
  }

  public destroy() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.flushReports()
    this.metrics.clear()
    this.pendingReports = []
  }
}

// Singleton instance
let webVitalsMonitor: WebVitalsMonitor | null = null

export function getWebVitalsMonitor(): WebVitalsMonitor {
  if (!webVitalsMonitor) {
    webVitalsMonitor = new WebVitalsMonitor()
  }
  return webVitalsMonitor
}

// React hook for Web Vitals monitoring
export function useWebVitals() {
  const monitor = getWebVitalsMonitor()
  
  return {
    getCurrentMetrics: () => monitor.getCurrentMetrics(),
    getPerformanceReport: () => monitor.getPerformanceReport(),
    markCustomMetric: (name: string, startTime?: number) => monitor.markCustomMetric(name, startTime),
  }
}

// Utility functions for performance thresholds
export const performanceThresholds = {
  good: {
    CLS: 0.1,
    FID: 100,
    FCP: 1800,
    INP: 200,
    LCP: 2500,
    TTFB: 600
  },
  needsImprovement: {
    CLS: 0.25,
    FID: 300,
    FCP: 3000,
    INP: 500,
    LCP: 4000,
    TTFB: 1800
  }
}

export function getPerformanceRating(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const good = performanceThresholds.good[metricName as keyof typeof performanceThresholds.good]
  const needsImprovement = performanceThresholds.needsImprovement[metricName as keyof typeof performanceThresholds.needsImprovement]
  
  if (!good || !needsImprovement) return 'good'
  
  if (value <= good) return 'good'
  if (value <= needsImprovement) return 'needs-improvement'
  return 'poor'
}