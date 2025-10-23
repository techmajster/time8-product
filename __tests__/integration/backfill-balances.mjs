import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔧 Running backfill function to create missing mandatory balances\n')

// Get all organizations
const { data: orgs, error: orgsError } = await supabase
  .from('organizations')
  .select('id, name')

if (orgsError) {
  console.error('❌ Error fetching organizations:', orgsError)
  process.exit(1)
}

console.log(`Found ${orgs.length} organizations\n`)

let totalBalancesCreated = 0

// Run backfill for each organization
for (const org of orgs) {
  console.log(`Processing: ${org.name}`)

  const { data, error } = await supabase
    .rpc('backfill_mandatory_leave_balances', { org_id: org.id })

  if (error) {
    console.error(`❌ Error for ${org.name}:`, error)
    continue
  }

  const created = data?.[0]?.balances_created || 0
  totalBalancesCreated += created
  console.log(`   Balances created: ${created}`)
}

console.log(`\n✅ Backfill complete`)
console.log(`   Total balances created: ${totalBalancesCreated}`)

// Re-run the verification
console.log('\n🔍 Re-checking employee balances...\n')

const currentYear = new Date().getFullYear()

const { data: employees } = await supabase
  .from('user_organizations')
  .select('user_id, organization_id')
  .eq('is_active', true)

let totalEmployees = 0
let employeesWithCompleteBalances = 0

for (const emp of employees) {
  totalEmployees++

  const { data: mandatoryTypes } = await supabase
    .from('leave_types')
    .select('id')
    .eq('organization_id', emp.organization_id)
    .eq('is_mandatory', true)

  if (!mandatoryTypes || mandatoryTypes.length === 0) continue

  const { data: balances } = await supabase
    .from('leave_balances')
    .select('leave_type_id')
    .eq('user_id', emp.user_id)
    .eq('organization_id', emp.organization_id)
    .eq('year', currentYear)
    .in('leave_type_id', mandatoryTypes.map(t => t.id))

  if (balances && balances.length === mandatoryTypes.length) {
    employeesWithCompleteBalances++
  }
}

const percentComplete = ((employeesWithCompleteBalances / totalEmployees) * 100).toFixed(1)
console.log(`Results:`)
console.log(`   Total employees: ${totalEmployees}`)
console.log(`   Complete balances: ${employeesWithCompleteBalances}`)
console.log(`   Completion rate: ${percentComplete}%`)

if (percentComplete === '100.0') {
  console.log('\n✅ All employees now have complete mandatory balances!')
} else {
  console.log(`\n⚠️  Still ${(100 - percentComplete).toFixed(1)}% missing`)
}

process.exit(0)
