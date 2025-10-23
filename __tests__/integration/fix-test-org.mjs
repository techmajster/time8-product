import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔧 Fixing Test Org New - adding mandatory types\n')

// Get Test Org New ID
const { data: org } = await supabase
  .from('organizations')
  .select('id')
  .eq('name', 'Test Org New')
  .single()

if (!org) {
  console.error('❌ Test Org New not found')
  process.exit(1)
}

console.log(`Found org ID: ${org.id}`)

// Call the ensure function
const { data, error } = await supabase
  .rpc('ensure_mandatory_leave_types', { org_id: org.id })

if (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}

console.log('✅ Mandatory types created for Test Org New')

// Verify
const { data: types } = await supabase
  .from('leave_types')
  .select('name, is_mandatory, days_per_year')
  .eq('organization_id', org.id)
  .eq('is_mandatory', true)

console.log('\nVerification:')
types.forEach(t => {
  const days = t.days_per_year || 'unlimited'
  console.log(`   - ${t.name} (${days} days)`)
})

process.exit(0)
