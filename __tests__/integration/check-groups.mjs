import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iffuxwuvwedltjmxaskb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZnV4d3V2d2VkbHRqbXhhc2tiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDQ4MjQxMCwiZXhwIjoyMDU2MDU4NDEwfQ.YOlEFX2KGVLK1HiSmJF2Z1Y4iwp6IfFqBLk9-Y7L25o'
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
