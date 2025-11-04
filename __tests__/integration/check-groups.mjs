import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nMake sure .env.local exists and contains these variables.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('\n📋 Teams:')
const { data: teams } = await supabase.from('teams').select('*').order('name')
console.log(teams)

console.log('\n👥 Team Members (team_members table):')
const { data: teamMembers } = await supabase.from('team_members').select(`
  user_id,
  team_id,
  teams(name),
  profiles(full_name, email)
`)
console.log(teamMembers)

console.log('\n👥 User Organizations (user_organizations.team_id):')
const { data: userOrgs } = await supabase.from('user_organizations').select(`
  user_id,
  team_id,
  profiles(full_name, email)
`).eq('is_active', true)
console.log(userOrgs)

console.log('\n🏢 Organization Settings:')
const { data: orgs } = await supabase.from('organizations').select('id, name, restrict_calendar_by_group')
console.log(orgs)
