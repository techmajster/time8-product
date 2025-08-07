'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  Clock, 
  Database, 
  Gauge, 
  RefreshCw, 
  TrendingDown, 
  TrendingUp,
  Zap
} from 'lucide-react'
import { useWebVitals } from '@/lib/performance/web-vitals-monitor'
// Performance data fetched via API endpoints

interface PerformanceMetrics {
  averages: Record<string, number>
  medians: Record<string, number>
  percentiles: Record<string, any>
  issues: Array<{
    metric: string
    severity: 'warning' | 'critical'
    average: number
    threshold: number
    impact: number
  }>
}

interface DatabaseAnalysis {
  slowQueries: any[]
  indexUsage: any[]
  tableStats: any[]
  recommendations: string[]
}

export function PerformanceDashboard() {
  const [timeframe, setTimeframe] = useState('24h')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [dbAnalysis, setDbAnalysis] = useState<DatabaseAnalysis | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  
  const webVitals = useWebVitals()

  useEffect(() => {
    loadPerformanceData()
  }, [timeframe])

  const loadPerformanceData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load web vitals data
      const webVitalsResponse = await fetch(`/api/performance/web-vitals?timeframe=${timeframe}`)
      if (!webVitalsResponse.ok) {
        throw new Error('Failed to fetch Web Vitals data')
      }
      const webVitalsData = await webVitalsResponse.json()
      setMetrics(webVitalsData.analytics)

      // Load database analysis via API
      const dbResponse = await fetch('/api/performance/database-analysis')
      if (dbResponse.ok) {
        const analysis = await dbResponse.json()
        setDbAnalysis(analysis)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performance data')
    } finally {
      setLoading(false)
    }
  }

  const refresh = async () => {
    setRefreshing(true)
    await loadPerformanceData()
    setRefreshing(false)
  }

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading performance data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          variant="outline" 
          onClick={refresh} 
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="web-vitals" className="space-y-6">
        <TabsList>
          <TabsTrigger value="web-vitals">Web Vitals</TabsTrigger>
          <TabsTrigger value="database">Database Performance</TabsTrigger>
          <TabsTrigger value="issues">Performance Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="web-vitals" className="space-y-6">
          {/* Web Vitals Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <WebVitalCard 
              title="CLS"
              description="Cumulative Layout Shift"
              value={metrics?.averages?.cls || 0}
              threshold={{ good: 0.1, poor: 0.25 }}
              unit=""
              icon={<Gauge className="h-4 w-4" />}
            />
            <WebVitalCard 
              title="FID"
              description="First Input Delay"
              value={metrics?.averages?.fid || 0}
              threshold={{ good: 100, poor: 300 }}
              unit="ms"
              icon={<Zap className="h-4 w-4" />}
            />
            <WebVitalCard 
              title="FCP"
              description="First Contentful Paint"
              value={metrics?.averages?.fcp || 0}
              threshold={{ good: 1800, poor: 3000 }}
              unit="ms"
              icon={<Activity className="h-4 w-4" />}
            />
            <WebVitalCard 
              title="LCP"
              description="Largest Contentful Paint"
              value={metrics?.averages?.lcp || 0}
              threshold={{ good: 2500, poor: 4000 }}
              unit="ms"
              icon={<BarChart3 className="h-4 w-4" />}
            />
            <WebVitalCard 
              title="INP"
              description="Interaction to Next Paint"
              value={metrics?.averages?.inp || 0}
              threshold={{ good: 200, poor: 500 }}
              unit="ms"
              icon={<Clock className="h-4 w-4" />}
            />
            <WebVitalCard 
              title="TTFB"
              description="Time to First Byte"
              value={metrics?.averages?.ttfb || 0}
              threshold={{ good: 600, poor: 1800 }}
              unit="ms"
              icon={<TrendingUp className="h-4 w-4" />}
            />
          </div>

          {/* Performance Percentiles */}
          {metrics?.percentiles && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Percentiles</CardTitle>
                <CardDescription>
                  Distribution of performance metrics across all users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(metrics.percentiles).map(([vital, percentiles]: [string, any]) => (
                    <div key={vital} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium uppercase">{vital}</span>
                        <span className="text-sm text-muted-foreground">
                          P95: {formatMetricValue(percentiles.p95, vital)}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-2 text-xs">
                        <div className="text-center">
                          <div className="text-muted-foreground">P50</div>
                          <div>{formatMetricValue(percentiles.p50, vital)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">P75</div>
                          <div>{formatMetricValue(percentiles.p75, vital)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">P90</div>
                          <div>{formatMetricValue(percentiles.p90, vital)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">P95</div>
                          <div>{formatMetricValue(percentiles.p95, vital)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">P99</div>
                          <div>{formatMetricValue(percentiles.p99, vital)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="database" className="space-y-6">
          {/* Database Performance */}
          {dbAnalysis && (
            <>
              {/* Slow Queries */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="h-5 w-5 mr-2" />
                    Slow Queries
                  </CardTitle>
                  <CardDescription>
                    Queries with execution time above performance thresholds
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dbAnalysis.slowQueries.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        No slow queries detected
                      </p>
                    ) : (
                      dbAnalysis.slowQueries.map((query, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{query.queryId}</span>
                            <Badge variant={query.avgExecutionTime > 200 ? 'destructive' : 'secondary'}>
                              {query.avgExecutionTime.toFixed(1)}ms avg
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {query.queryText.substring(0, 100)}...
                          </p>
                          <div className="text-xs space-x-4 text-muted-foreground">
                            <span>Executions: {query.totalExecutions}</span>
                            <span>Min: {query.minExecutionTime.toFixed(1)}ms</span>
                            <span>Max: {query.maxExecutionTime.toFixed(1)}ms</span>
                          </div>
                          {query.suggestions && query.suggestions.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-orange-600 mb-1">Suggestions:</p>
                              <ul className="text-xs space-y-1">
                                {query.suggestions.map((suggestion: string, i: number) => (
                                  <li key={i} className="text-muted-foreground">• {suggestion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Index Usage */}
              <Card>
                <CardHeader>
                  <CardTitle>Index Usage Statistics</CardTitle>
                  <CardDescription>
                    Database index efficiency and usage patterns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dbAnalysis.indexUsage.slice(0, 10).map((index, i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{index.indexName}</div>
                          <div className="text-xs text-muted-foreground">{index.tableName}</div>
                        </div>
                        <div className="flex items-center space-x-4 text-sm">
                          <span>{index.indexScans.toLocaleString()} scans</span>
                          <Badge 
                            variant={index.usageEfficiency > 90 ? 'default' : index.usageEfficiency > 70 ? 'secondary' : 'destructive'}
                          >
                            {index.usageEfficiency.toFixed(1)}% efficient
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="issues" className="space-y-6">
          {/* Performance Issues */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Performance Issues
              </CardTitle>
              <CardDescription>
                Critical and warning-level performance issues requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Web Vitals Issues */}
                {metrics?.issues && metrics.issues.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Web Vitals Issues</h4>
                    <div className="space-y-3">
                      {metrics.issues.map((issue, index) => (
                        <Alert key={index} variant={issue.severity === 'critical' ? 'destructive' : 'default'}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle className="flex items-center justify-between">
                            <span>{issue.metric} Performance Issue</span>
                            <Badge variant={issue.severity === 'critical' ? 'destructive' : 'secondary'}>
                              {issue.severity}
                            </Badge>
                          </AlertTitle>
                          <AlertDescription>
                            Average {issue.metric.toLowerCase()} is {formatMetricValue(issue.average, issue.metric.toLowerCase())}, 
                            which is {issue.impact}% above the recommended threshold of {formatMetricValue(issue.threshold, issue.metric.toLowerCase())}.
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}

                {/* Database Issues */}
                {dbAnalysis?.recommendations && dbAnalysis.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Database Recommendations</h4>
                    <div className="space-y-2">
                      {dbAnalysis.recommendations.map((rec, index) => (
                        <Alert key={index}>
                          <Database className="h-4 w-4" />
                          <AlertDescription>{rec}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}

                {(!metrics?.issues || metrics.issues.length === 0) && 
                 (!dbAnalysis?.recommendations || dbAnalysis.recommendations.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No performance issues detected</p>
                    <p className="text-sm">Your application is performing well!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface WebVitalCardProps {
  title: string
  description: string
  value: number
  threshold: { good: number; poor: number }
  unit: string
  icon: React.ReactNode
}

function WebVitalCard({ title, description, value, threshold, unit, icon }: WebVitalCardProps) {
  const getRating = (value: number) => {
    if (value <= threshold.good) return 'good'
    if (value <= threshold.poor) return 'needs-improvement'
    return 'poor'
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good': return 'text-green-600'
      case 'needs-improvement': return 'text-yellow-600'
      case 'poor': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getProgressValue = (value: number) => {
    return Math.min((value / threshold.poor) * 100, 100)
  }

  const rating = getRating(value)
  const progressValue = getProgressValue(value)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatMetricValue(value, title.toLowerCase())}
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          {description}
        </p>
        <div className="space-y-1">
          <Progress 
            value={progressValue} 
            className={`h-2 ${rating === 'good' ? '[&>div]:bg-green-600' : 
                               rating === 'needs-improvement' ? '[&>div]:bg-yellow-600' : 
                               '[&>div]:bg-red-600'}`}
          />
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              Good: ≤{formatMetricValue(threshold.good, title.toLowerCase())}
            </span>
            <span className={getRatingColor(rating)}>
              {rating.replace('-', ' ')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function formatMetricValue(value: number, metric: string): string {
  if (value === null || value === undefined) return 'N/A'
  
  if (metric === 'cls') {
    return value.toFixed(3)
  }
  
  if (['fid', 'fcp', 'inp', 'lcp', 'ttfb'].includes(metric)) {
    return Math.round(value) + 'ms'
  }
  
  return value.toFixed(1)
}