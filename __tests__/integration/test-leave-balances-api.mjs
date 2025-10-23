import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const userId = 'eb8feca9-1617-484c-8b80-4ae352a1e4f0' // Szymon

// Get user's current active org (would come from cookie in real scenario)
const { data: currentUserOrg } = await adminClient
  .from('user_organizations')
  .select('organization_id')
  .eq('user_id', userId)
  .eq('is_active', true)
  .limit(1)

console.log('Current user org:', currentUserOrg)

if (!currentUserOrg || currentUserOrg.length === 0) {
  console.log('ERROR: Current user has no organization')
  process.exit(1)
}

const currentOrgId = currentUserOrg[0].organization_id
console.log('Using org ID:', currentOrgId)

// Verify employee is in same organization
const { data: employeeOrg } = await adminClient
  .from('user_organizations')
  .select('organization_id')
  .eq('user_id', userId)
  .eq('organization_id', currentOrgId)
  .eq('is_active', true)
  .limit(1)

console.log('Employee org check:', employeeOrg)

if (!employeeOrg || employeeOrg.length === 0) {
  console.log('ERROR: Employee not in same organization')
  process.exit(1)
}

// Get leave balances - THIS IS THE PROBLEMATIC QUERY
const currentYear = new Date().getFullYear()
const { data: balances, error: balancesError } = await adminClient
  .from('leave_balances')
  .select(`
    *,
    leave_types (*)
  `)
  .eq('user_id', userId)
  .eq('year', currentYear)

if (balancesError) {
  console.error('Leave balances query error:', balancesError)
  process.exit(1)
}

console.log('\n✅ Found balances:', balances?.length || 0)
console.log('Balances org IDs:', [...new Set(balances?.map(b => b.organization_id))])

// The issue: balances contain records from MULTIPLE orgs!
console.log('\nProblem: The query does NOT filter by organization_id!')
console.log('Current org:', currentOrgId)
console.log('Balances from orgs:', balances?.map(b => ({
  org_id: b.organization_id,
  leave_type: b.leave_types.name,
  entitled: b.entitled_days
})))
