'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertCircle, User, Building2, Calendar, Play, Eye } from 'lucide-react'

interface OwnerResult {
  owner_name: string
  owner_email: string
  organization_name: string
  balances_created: Array<{
    leave_type_name: string
    days_per_year: number
  }>
  already_had_balances: Array<{
    leave_type_name: string
    leave_type_id: string
  }>
  errors: string[]
}

interface MigrationResults {
  dryRun: boolean
  ownersProcessed: number
  balancesCreated: number
  totalOwnersFound: number
  details: OwnerResult[]
}

export default function FixWorkspaceOwnersBalancesClient() {
  const [results, setResults] = useState<MigrationResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runMigration = async (dryRun: boolean) => {
    setIsLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/admin/fix-workspace-owners-balances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run migration')
      }

      setResults(data.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Workspace Owner Balance Migration
          </CardTitle>
          <CardDescription>
            This tool finds workspace owners who created their organizations before the balance initialization fix 
            and creates their missing leave balances. You can run a dry run first to see what would be changed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={() => runMigration(true)}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {isLoading ? 'Running...' : 'Preview (Dry Run)'}
            </Button>
            <Button 
              onClick={() => runMigration(false)}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isLoading ? 'Running...' : 'Run Migration'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Migration Results {results.dryRun && '(Preview)'}
            </CardTitle>
            <CardDescription>
              Summary of workspace owner balance initialization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{results.totalOwnersFound}</div>
                <div className="text-sm text-blue-600">Workspace Owners Found</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{results.ownersProcessed}</div>
                <div className="text-sm text-green-600">Owners Processed</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{results.balancesCreated}</div>
                <div className="text-sm text-purple-600">Balances {results.dryRun ? 'To Create' : 'Created'}</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {results.details.filter(d => d.errors.length > 0).length}
                </div>
                <div className="text-sm text-orange-600">Errors</div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Detailed Results</h3>
              {results.details.map((owner, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-gray-500" />
                        <div>
                          <div className="font-medium">{owner.owner_name}</div>
                          <div className="text-sm text-gray-500">{owner.owner_email}</div>
                          <div className="text-sm text-gray-500">{owner.organization_name}</div>
                        </div>
                      </div>
                      {owner.errors.length > 0 && (
                        <Badge variant="destructive">Errors</Badge>
                      )}
                      {owner.balances_created.length > 0 && (
                        <Badge variant="default">
                          {owner.balances_created.length} Balance{owner.balances_created.length !== 1 ? 's' : ''} {results.dryRun ? 'To Create' : 'Created'}
                        </Badge>
                      )}
                      {owner.balances_created.length === 0 && owner.errors.length === 0 && (
                        <Badge variant="secondary">No Action Needed</Badge>
                      )}
                    </div>

                    {owner.balances_created.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Balances {results.dryRun ? 'To Create' : 'Created'}:
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {owner.balances_created.map((balance, balanceIndex) => (
                            <div key={balanceIndex} className="bg-green-50 p-2 rounded text-sm">
                              <div className="font-medium text-green-800">{balance.leave_type_name}</div>
                              <div className="text-green-600">{balance.days_per_year} days per year</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {owner.already_had_balances.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-blue-700 mb-2">Already Had Balances:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {owner.already_had_balances.map((balance, balanceIndex) => (
                            <div key={balanceIndex} className="bg-blue-50 p-2 rounded text-sm">
                              <div className="text-blue-800">{balance.leave_type_name}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {owner.errors.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-red-700 mb-2">Errors:</h4>
                        <div className="space-y-1">
                          {owner.errors.map((error, errorIndex) => (
                            <div key={errorIndex} className="bg-red-50 p-2 rounded text-sm text-red-700">
                              {error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}