'use client'

import { useEffect } from 'react'
import { onCLS, onFCP, onLCP, onTTFB, onINP, type Metric } from 'web-vitals'

// Send metrics to analytics endpoint
function sendToAnalytics(metric: Metric) {
  // Only send in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Web Vitals]', metric)
    return
  }

  // Send to your analytics endpoint
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
  })

  // Use `navigator.sendBeacon()` if available, falling back to `fetch()`
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/performance/vitals', body)
  } else {
    fetch('/api/performance/vitals', {
      body,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      keepalive: true,
    })
  }
}

export function WebVitals() {
  useEffect(() => {
    // Measure Core Web Vitals
    onCLS(sendToAnalytics) // Cumulative Layout Shift
    onFCP(sendToAnalytics) // First Contentful Paint
    onLCP(sendToAnalytics) // Largest Contentful Paint
    onTTFB(sendToAnalytics) // Time to First Byte
    onINP(sendToAnalytics) // Interaction to Next Paint (replaces deprecated FID)
  }, [])

  return null
}
