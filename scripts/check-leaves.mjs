import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkLeaves() {
  console.log('\n🔍 Checking leave requests for November 20, 2025...\n')

  const { data, error } = await supabase
    .from('leave_requests')
    .select(`
      id,
      user_id,
      start_date,
      end_date,
      status,
      organization_id,
      profiles!leave_requests_user_id_fkey (
        id,
        full_name,
        email
      ),
      leave_types (
        name
      )
    `)
    .lte('start_date', '2025-11-20')
    .gte('end_date', '2025-11-20')
    .in('status', ['pending', 'approved'])

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  if (!data || data.length === 0) {
    console.log('⚠️ No leave requests found for November 20, 2025')
    return
  }

  console.log(`✅ Found ${data.length} leave request(s) on November 20, 2025:\n`)

  data.forEach((leave, index) => {
    console.log(`${index + 1}. User: ${leave.profiles.full_name} (${leave.profiles.email})`)
    console.log(`   Type: ${leave.leave_types.name}`)
    console.log(`   Dates: ${leave.start_date} to ${leave.end_date}`)
    console.log(`   Status: ${leave.status}`)
    console.log(`   User ID: ${leave.user_id}`)
    console.log(`   Org ID: ${leave.organization_id}`)
    console.log('')
  })
}

checkLeaves()
