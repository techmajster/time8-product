import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iffuxwuvwedltjmxaskb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZnV4d3V2d2VkbHRqbXhhc2tiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDQ4MjQxMCwiZXhwIjoyMDU2MDU4NDEwfQ.YOlEFX2KGVLK1HiSmJF2Z1Y4iwp6IfFqBLk9-Y7L25o'
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
