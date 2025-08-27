import { Suspense } from 'react'
import FixWorkspaceOwnersBalancesClient from './components/FixWorkspaceOwnersBalancesClient'

export default function FixWorkspaceOwnersBalancesPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fix Workspace Owners' Balances</h1>
        <p className="text-muted-foreground">
          Initialize leave balances for workspace owners who created their organizations before the balance initialization fix.
        </p>
      </div>
      
      <Suspense fallback={<div>Loading...</div>}>
        <FixWorkspaceOwnersBalancesClient />
      </Suspense>
    </div>
  )
}