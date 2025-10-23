import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 Test Query #2: Verify deletion prevention works\n')

// Get a mandatory leave type
const { data: mandatoryType } = await supabase
  .from('leave_types')
  .select('id, name, organization_id')
  .eq('is_mandatory', true)
  .eq('name', 'Urlop wypoczynkowy')
  .limit(1)
  .single()

if (!mandatoryType) {
  console.error('❌ No mandatory type found for testing')
  process.exit(1)
}

console.log(`Testing deletion of: ${mandatoryType.name}`)
console.log(`Organization ID: ${mandatoryType.organization_id}\n`)

// Try to delete it (should fail)
const { data, error } = await supabase
  .from('leave_types')
  .delete()
  .eq('id', mandatoryType.id)

if (error) {
  console.log('✅ Deletion correctly prevented!')
  console.log(`   Error message: "${error.message}"`)
  console.log(`   Error code: ${error.code}`)
} else {
  console.log('❌ CRITICAL: Deletion was allowed! This should not happen!')
  process.exit(1)
}

// Verify the type still exists
const { data: stillExists } = await supabase
  .from('leave_types')
  .select('id, name')
  .eq('id', mandatoryType.id)
  .single()

if (stillExists) {
  console.log(`\n✅ Type still exists: ${stillExists.name}`)
} else {
  console.log('\n❌ CRITICAL: Type was deleted!')
  process.exit(1)
}

console.log('\n✅ Test Query #2 Complete - Deletion prevention working')
process.exit(0)
