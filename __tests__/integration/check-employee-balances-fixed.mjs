import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 Test Query #3 (Fixed): Verify all active employees have mandatory balances\n')
console.log('Note: Only checking leave types where requires_balance = true')
console.log('      (Urlop bezpłatny is unlimited and does not require balance records)\n')

const currentYear = new Date().getFullYear()

// Get all active employees
const { data: employees, error: empError } = await supabase
  .from('user_organizations')
  .select('user_id, organization_id, organizations(name)')
  .eq('is_active', true)

if (empError) {
  console.error('❌ Error fetching employees:', empError)
  process.exit(1)
}

console.log(`Found ${employees.length} active employees\n`)

let totalEmployees = 0
let employeesWithCompleteBalances = 0
let missingBalances = []

for (const emp of employees) {
  totalEmployees++

  // Get mandatory types that REQUIRE balance tracking
  const { data: mandatoryTypes } = await supabase
    .from('leave_types')
    .select('id, name')
    .eq('organization_id', emp.organization_id)
    .eq('is_mandatory', true)
    .eq('requires_balance', true)  // Only check types that require balances

  if (!mandatoryTypes || mandatoryTypes.length === 0) {
    console.log(`⚠️  Org "${emp.organizations.name}" has no mandatory types requiring balances`)
    continue
  }

  // Get employee's balances for mandatory types
  const { data: balances } = await supabase
    .from('leave_balances')
    .select('leave_type_id')
    .eq('user_id', emp.user_id)
    .eq('organization_id', emp.organization_id)
    .eq('year', currentYear)
    .in('leave_type_id', mandatoryTypes.map(t => t.id))

  const hasAllMandatoryBalances = balances && balances.length === mandatoryTypes.length

  if (hasAllMandatoryBalances) {
    employeesWithCompleteBalances++
  } else {
    const missingTypes = mandatoryTypes.filter(
      mt => !balances?.some(b => b.leave_type_id === mt.id)
    )
    missingBalances.push({
      user_id: emp.user_id,
      org: emp.organizations.name,
      missing: missingTypes.map(t => t.name)
    })
  }
}

console.log('Results:')
console.log(`   Total active employees: ${totalEmployees}`)
console.log(`   Employees with complete mandatory balances: ${employeesWithCompleteBalances}`)
console.log(`   Missing balances: ${missingBalances.length}`)

if (missingBalances.length > 0) {
  console.log('\n❌ Employees missing mandatory balances:')
  missingBalances.forEach(mb => {
    console.log(`   - User ${mb.user_id.slice(0, 8)}... in ${mb.org}`)
    console.log(`     Missing: ${mb.missing.join(', ')}`)
  })
} else {
  console.log('\n✅ All employees have complete mandatory balances!')
}

const percentComplete = ((employeesWithCompleteBalances / totalEmployees) * 100).toFixed(1)
console.log(`\nCompletion rate: ${percentComplete}%`)

if (percentComplete === '100.0') {
  console.log('✅ Test Query #3 Complete - 0% missing balances (for types requiring balance tracking)')
} else {
  console.log(`⚠️  Test Query #3 Complete - ${(100 - percentComplete).toFixed(1)}% missing balances`)
}

process.exit(0)
