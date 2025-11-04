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

console.log('\n📋 Teams table:')
const { data: teams, error: teamsError } = await supabase
  .from('teams')
  .select('*')
  .eq('organization_id', 'a5b891a0-f314-498d-aa9d-fa9dcc13d0ce')
  .order('name')

if (teamsError) console.log('Error:', teamsError)
else console.log(teams)

console.log('\n👥 Team Members table (team_members):')
const { data: teamMembers, error: tmError } = await supabase
  .from('team_members')
  .select(`
    user_id,
    team_id,
    teams (id, name),
    profiles (full_name, email)
  `)

if (tmError) console.log('Error:', tmError)
else console.log(teamMembers)

console.log('\n🏢 User Organizations (user_organizations.team_id):')
const { data: userOrgs, error: uoError } = await supabase
  .from('user_organizations')
  .select(`
    user_id,
    team_id,
    profiles (full_name, email)
  `)
  .eq('organization_id', 'a5b891a0-f314-498d-aa9d-fa9dcc13d0ce')
  .eq('is_active', true)

if (uoError) console.log('Error:', uoError)
else console.log(userOrgs)

console.log('\n🏢 Organization Settings:')
const { data: org, error: orgError } = await supabase
  .from('organizations')
  .select('id, name, restrict_calendar_by_group')
  .eq('id', 'a5b891a0-f314-498d-aa9d-fa9dcc13d0ce')
  .single()

if (orgError) console.log('Error:', orgError)
else console.log(org)
