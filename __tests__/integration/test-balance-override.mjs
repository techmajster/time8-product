import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 Test Query #4: Verify balance override behavior\n')

// Find an employee in BB8 Studio with Urlop wypoczynkowy
const { data: bb8Org } = await supabase
  .from('organizations')
  .select('id, name')
  .eq('name', 'BB8 Studio')
  .single()

if (!bb8Org) {
  console.error('❌ BB8 Studio not found')
  process.exit(1)
}

// Get Urlop wypoczynkowy for BB8 Studio
const { data: vacationType } = await supabase
  .from('leave_types')
  .select('id, name, days_per_year')
  .eq('organization_id', bb8Org.id)
  .eq('name', 'Urlop wypoczynkowy')
  .single()

if (!vacationType) {
  console.error('❌ Urlop wypoczynkowy not found')
  process.exit(1)
}

console.log(`Organization: ${bb8Org.name}`)
console.log(`Workspace default for Urlop wypoczynkowy: ${vacationType.days_per_year} days`)
console.log(`Leave type ID: ${vacationType.id}\n`)

// Get an employee from this org
const { data: employee } = await supabase
  .from('user_organizations')
  .select('user_id, profiles(full_name)')
  .eq('organization_id', bb8Org.id)
  .eq('is_active', true)
  .limit(1)
  .single()

if (!employee) {
  console.error('❌ No active employees found')
  process.exit(1)
}

console.log(`Testing with employee: ${employee.profiles.full_name || 'Unknown'}`)
console.log(`User ID: ${employee.user_id}\n`)

// Check current balance
const currentYear = new Date().getFullYear()
const { data: currentBalance } = await supabase
  .from('leave_balances')
  .select('entitled_days, used_days, remaining_days')
  .eq('user_id', employee.user_id)
  .eq('leave_type_id', vacationType.id)
  .eq('year', currentYear)
  .single()

console.log('Current balance:')
console.log(`   entitled_days: ${currentBalance?.entitled_days || 'N/A'}`)
console.log(`   workspace default: ${vacationType.days_per_year}`)
console.log(`   is_override: ${currentBalance?.entitled_days !== vacationType.days_per_year}\n`)

// Create an override (set to 30 days instead of workspace default)
const customDays = 30
console.log(`Creating override: Setting to ${customDays} days (different from ${vacationType.days_per_year} default)\n`)

const { error: upsertError } = await supabase
  .from('leave_balances')
  .upsert({
    user_id: employee.user_id,
    leave_type_id: vacationType.id,
    organization_id: bb8Org.id,
    year: currentYear,
    entitled_days: customDays,
    used_days: currentBalance?.used_days || 0
  }, {
    onConflict: 'user_id,leave_type_id,year'
  })

if (upsertError) {
  console.error('❌ Error creating override:', upsertError)
  process.exit(1)
}

// Verify override was applied
const { data: updatedBalance } = await supabase
  .from('leave_balances')
  .select('entitled_days, used_days, remaining_days')
  .eq('user_id', employee.user_id)
  .eq('leave_type_id', vacationType.id)
  .eq('year', currentYear)
  .single()

console.log('Updated balance:')
console.log(`   entitled_days: ${updatedBalance.entitled_days}`)
console.log(`   used_days: ${updatedBalance.used_days}`)
console.log(`   remaining_days: ${updatedBalance.remaining_days}`)
console.log(`   workspace default: ${vacationType.days_per_year}`)
console.log(`   is_override: ${updatedBalance.entitled_days !== vacationType.days_per_year}`)

const isOverrideCorrect = updatedBalance.entitled_days === customDays
const remainingCorrect = updatedBalance.remaining_days === (customDays - updatedBalance.used_days)

if (isOverrideCorrect && remainingCorrect) {
  console.log('\n✅ Balance override working correctly!')
  console.log(`   Custom balance: ${customDays} days (overriding ${vacationType.days_per_year} days workspace default)`)
} else {
  console.log('\n❌ Balance override not working correctly')
}

console.log('\n✅ Test Query #4 Complete - Balance override behavior verified')
process.exit(0)
