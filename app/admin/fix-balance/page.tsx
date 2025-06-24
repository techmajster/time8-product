'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function FixBalancePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<any>(null)
  const [cleanupError, setCleanupError] = useState<string | null>(null)

  const handleFix = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/admin/fix-urlop-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fix balance')
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleCleanup = async () => {
    setCleanupLoading(true)
    setCleanupError(null)
    setCleanupResult(null)

    try {
      const response = await fetch('/api/admin/remove-duplicate-leave-type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cleanup duplicate leave type')
      }

      setCleanupResult(data)
    } catch (err) {
      setCleanupError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setCleanupLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Admin Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Fix Balance Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Fix "Urlop na żądanie" Balance</h3>
            <p className="text-sm text-muted-foreground">
              This will fix the "Urlop na żądanie" balance by capping used days at 4 per year (annual limit).
            </p>
            
            <Button 
              onClick={handleFix} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Fixing...' : 'Fix Balance'}
            </Button>
          </div>

          {/* Cleanup Section */}
          <div className="space-y-3 border-t pt-6">
            <h3 className="text-lg font-semibold">Remove Duplicate Leave Type</h3>
            <p className="text-sm text-muted-foreground">
              Remove the duplicate "Urlop wychowawczy" leave type. We keep only "Dni wolne wychowawcze" 
              as they serve different purposes in Polish labor law.
            </p>
            
            <Button 
              onClick={handleCleanup} 
              disabled={cleanupLoading} 
              variant="outline"
              className="w-full"
            >
              {cleanupLoading ? 'Checking...' : 'Remove "Urlop wychowawczy"'}
            </Button>
          </div>

          {/* Balance Fix Results */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>Success!</strong> {result.message}</p>
                  {result.before && (
                    <div>
                      <p><strong>Before:</strong></p>
                      <pre className="text-xs bg-muted p-2 rounded">
                        {JSON.stringify(result.before, null, 2)}
                      </pre>
                    </div>
                  )}
                  {result.after && (
                    <div>
                      <p><strong>After:</strong></p>
                      <pre className="text-xs bg-muted p-2 rounded">
                        {JSON.stringify(result.after, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Cleanup Results */}
          {cleanupError && (
            <Alert variant="destructive">
              <AlertDescription>{cleanupError}</AlertDescription>
            </Alert>
          )}

          {cleanupResult && (
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>Cleanup Success!</strong> {cleanupResult.message}</p>
                  {cleanupResult.removed && (
                    <div>
                      <p><strong>Removed:</strong></p>
                      <pre className="text-xs bg-muted p-2 rounded">
                        {JSON.stringify(cleanupResult.removed, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 