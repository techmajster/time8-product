import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()
    const body = await request.json()
    
    const { reports, timestamp } = body

    if (!reports || !Array.isArray(reports)) {
      return NextResponse.json({ error: 'Invalid reports data' }, { status: 400 })
    }

    // Process and store Web Vitals reports
    const processedReports = reports.map(report => ({
      ...report,
      created_at: new Date().toISOString(),
      session_id: request.headers.get('x-session-id') || 'unknown',
      ip_address: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
    }))

    // Store in database (create table if needed)
    try {
      const { error: insertError } = await supabaseAdmin
        .from('performance_metrics')
        .insert(processedReports)

      if (insertError && insertError.message.includes('does not exist')) {
        // Create the table if it doesn't exist
        await createPerformanceMetricsTable(supabaseAdmin)
        
        // Retry the insert
        const { error: retryError } = await supabaseAdmin
          .from('performance_metrics')
          .insert(processedReports)
          
        if (retryError) {
          console.error('Failed to insert performance metrics after table creation:', retryError)
          return NextResponse.json({ error: 'Failed to store metrics' }, { status: 500 })
        }
      } else if (insertError) {
        console.error('Failed to insert performance metrics:', insertError)
        return NextResponse.json({ error: 'Failed to store metrics' }, { status: 500 })
      }
    } catch (dbError) {
      console.error('Database error while storing performance metrics:', dbError)
      // Don't fail the request - performance monitoring is non-critical
    }

    // Analyze reports for immediate alerts
    const criticalIssues = analyzeCriticalIssues(reports)
    if (criticalIssues.length > 0) {
      // Log critical performance issues
      console.warn('Critical performance issues detected:', criticalIssues)
      
      // In production, you might want to send alerts here
      // await sendPerformanceAlert(criticalIssues)
    }

    return NextResponse.json({ 
      success: true, 
      processed: reports.length,
      criticalIssues: criticalIssues.length 
    })

  } catch (error) {
    console.error('Error processing Web Vitals reports:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function createPerformanceMetricsTable(supabase: any) {
  const { error } = await supabase.rpc('create_performance_metrics_table')
  
  if (error && error.message.includes('does not exist')) {
    // Fallback: create table directly
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS performance_metrics (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          cls float8 DEFAULT 0,
          fid float8,
          fcp float8 DEFAULT 0,
          inp float8,
          lcp float8 DEFAULT 0,
          ttfb float8 DEFAULT 0,
          url text NOT NULL,
          user_agent text,
          connection_type text,
          organization_id text,
          user_id text,
          session_id text,
          ip_address text,
          timestamp bigint NOT NULL,
          created_at timestamptz DEFAULT now()
        );
        
        CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);
        CREATE INDEX IF NOT EXISTS idx_performance_metrics_org_id ON performance_metrics(organization_id);
        CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id);
        CREATE INDEX IF NOT EXISTS idx_performance_metrics_url ON performance_metrics(url);
        CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at);
      `
    })
    
    if (createError) {
      console.error('Failed to create performance_metrics table:', createError)
    }
  }
}

function analyzeCriticalIssues(reports: any[]): any[] {
  const criticalIssues = []

  for (const report of reports) {
    const issues = []

    // Check Core Web Vitals thresholds
    if (report.cls > 0.25) {
      issues.push({
        metric: 'CLS',
        value: report.cls,
        threshold: 0.25,
        severity: 'critical'
      })
    }

    if (report.fid && report.fid > 300) {
      issues.push({
        metric: 'FID',
        value: report.fid,
        threshold: 300,
        severity: 'critical'
      })
    }

    if (report.lcp > 4000) {
      issues.push({
        metric: 'LCP',
        value: report.lcp,
        threshold: 4000,
        severity: 'critical'
      })
    }

    if (report.inp && report.inp > 500) {
      issues.push({
        metric: 'INP',
        value: report.inp,
        threshold: 500,
        severity: 'critical'
      })
    }

    if (report.ttfb > 1800) {
      issues.push({
        metric: 'TTFB',
        value: report.ttfb,
        threshold: 1800,
        severity: 'critical'
      })
    }

    if (issues.length > 0) {
      criticalIssues.push({
        url: report.url,
        organizationId: report.organizationId,
        userId: report.userId,
        timestamp: report.timestamp,
        issues
      })
    }
  }

  return criticalIssues
}

// GET endpoint for retrieving performance analytics
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()
    const searchParams = request.nextUrl.searchParams
    const orgId = searchParams.get('orgId')
    const timeframe = searchParams.get('timeframe') || '24h'
    
    // Calculate time range
    const now = new Date()
    const timeRanges: Record<string, number> = {
      '1h': 1,
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30
    }
    
    const hoursBack = timeRanges[timeframe] || 24
    const startTime = new Date(now.getTime() - (hoursBack * 60 * 60 * 1000))

    let query = supabaseAdmin
      .from('performance_metrics')
      .select('*')
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: false })

    if (orgId) {
      query = query.eq('organization_id', orgId)
    }

    const { data: metrics, error } = await query.limit(1000)

    if (error) {
      console.error('Failed to fetch performance metrics:', error)
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
    }

    // Calculate aggregated statistics
    const analytics = calculatePerformanceAnalytics(metrics || [])

    return NextResponse.json({
      success: true,
      timeframe,
      organizationId: orgId,
      analytics,
      sampleSize: metrics?.length || 0
    })

  } catch (error) {
    console.error('Error fetching performance analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function calculatePerformanceAnalytics(metrics: any[]) {
  if (metrics.length === 0) {
    return {
      averages: {},
      medians: {},
      percentiles: {},
      trends: {},
      issues: []
    }
  }

  const webVitals = ['cls', 'fid', 'fcp', 'inp', 'lcp', 'ttfb']
  const analytics: any = {
    averages: {},
    medians: {},
    percentiles: {},
    trends: {},
    issues: []
  }

  // Calculate statistics for each Web Vital
  for (const vital of webVitals) {
    const values = metrics
      .map(m => m[vital])
      .filter(v => v !== null && v !== undefined && !isNaN(v))
    
    if (values.length === 0) continue

    values.sort((a, b) => a - b)
    
    // Calculate basic statistics
    analytics.averages[vital] = values.reduce((sum, val) => sum + val, 0) / values.length
    analytics.medians[vital] = values[Math.floor(values.length / 2)]
    analytics.percentiles[vital] = {
      p50: values[Math.floor(values.length * 0.5)],
      p75: values[Math.floor(values.length * 0.75)],
      p90: values[Math.floor(values.length * 0.9)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)]
    }
  }

  // Identify performance issues
  const thresholds = {
    cls: { good: 0.1, poor: 0.25 },
    fid: { good: 100, poor: 300 },
    fcp: { good: 1800, poor: 3000 },
    inp: { good: 200, poor: 500 },
    lcp: { good: 2500, poor: 4000 },
    ttfb: { good: 600, poor: 1800 }
  }

  analytics.issues = []
  for (const [vital, threshold] of Object.entries(thresholds)) {
    const average = analytics.averages[vital]
    if (average > threshold.poor) {
      analytics.issues.push({
        metric: vital.toUpperCase(),
        severity: 'critical',
        average,
        threshold: threshold.poor,
        impact: Math.round(((average - threshold.good) / threshold.good) * 100)
      })
    } else if (average > threshold.good) {
      analytics.issues.push({
        metric: vital.toUpperCase(),
        severity: 'warning',
        average,
        threshold: threshold.good,
        impact: Math.round(((average - threshold.good) / threshold.good) * 100)
      })
    }
  }

  return analytics
}