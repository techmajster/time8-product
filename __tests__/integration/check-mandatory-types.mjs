import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 Test Query #1: Verify all orgs have 2 mandatory types\n')

// Get all organizations
const { data: orgs, error: orgsError } = await supabase
  .from('organizations')
  .select('id, name')

if (orgsError) {
  console.error('❌ Error fetching organizations:', orgsError)
  process.exit(1)
}

console.log(`Found ${orgs.length} organizations\n`)

// For each org, check mandatory leave types
for (const org of orgs) {
  const { data: mandatoryTypes, error: typesError } = await supabase
    .from('leave_types')
    .select('id, name, is_mandatory, days_per_year')
    .eq('organization_id', org.id)
    .eq('is_mandatory', true)
    .order('name')

  if (typesError) {
    console.error(`❌ Error fetching types for ${org.name}:`, typesError)
    continue
  }

  const hasVacation = mandatoryTypes.some(t => t.name === 'Urlop wypoczynkowy')
  const hasUnpaid = mandatoryTypes.some(t => t.name === 'Urlop bezpłatny')
  const status = (mandatoryTypes.length === 2 && hasVacation && hasUnpaid) ? '✅' : '❌'

  console.log(`${status} Organization: ${org.name}`)
  console.log(`   Mandatory types count: ${mandatoryTypes.length}`)
  mandatoryTypes.forEach(t => {
    const days = t.days_per_year || 'unlimited'
    console.log(`   - ${t.name} (${days} days)`)
  })
  console.log()
}

console.log('✅ Test Query #1 Complete')
process.exit(0)
