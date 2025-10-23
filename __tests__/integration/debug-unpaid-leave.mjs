import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 Debugging Urlop bezpłatny leave type\n')

const { data: unpaidTypes, error } = await supabase
  .from('leave_types')
  .select('id, name, organization_id, is_mandatory, requires_balance, organizations(name)')
  .eq('name', 'Urlop bezpłatny')

if (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}

console.log(`Found ${unpaidTypes.length} "Urlop bezpłatny" types:\n`)

unpaidTypes.forEach(t => {
  console.log(`Organization: ${t.organizations.name}`)
  console.log(`   ID: ${t.id}`)
  console.log(`   is_mandatory: ${t.is_mandatory}`)
  console.log(`   requires_balance: ${t.requires_balance}`)
  console.log()
})

// Check what the backfill function would see
console.log('🔍 Checking what backfill function sees for BB8 Studio:\n')

const bb8Org = unpaidTypes.find(t => t.organizations.name === 'BB8 Studio')?.organization_id

if (bb8Org) {
  const { data: mandatoryTypes } = await supabase
    .from('leave_types')
    .select('id, name, is_mandatory, requires_balance')
    .eq('organization_id', bb8Org)
    .eq('is_mandatory', true)

  console.log('Mandatory types in BB8 Studio:')
  mandatoryTypes.forEach(t => {
    console.log(`   - ${t.name}`)
    console.log(`     is_mandatory: ${t.is_mandatory}`)
    console.log(`     requires_balance: ${t.requires_balance}`)
  })
}

process.exit(0)
