/**
 * Debug member count for BB8 Studio
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugMembers() {
  try {
    // Get BB8 Studio ID
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('slug', 'bb8-studio')
      .single()

    console.log('BB8 Studio org:', org)

    // Try the same query as the API
    const { data: members, count: memberCount, error } = await supabase
      .from('user_organizations')
      .select('user_id', { count: 'exact' })
      .eq('organization_id', org.id)
      .eq('is_active', true);

    console.log('Query result:', {
      members,
      memberCount,
      error
    })

    // Try a simpler query to see what's in the table
    const { data: allMembers, error: allError } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('organization_id', org.id)

    console.log('All members for BB8 Studio:', {
      allMembers,
      allError
    })

    // Check if the table exists and what columns it has
    const { data: schema, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'user_organizations')
      .eq('table_schema', 'public')

    console.log('Table schema:', {
      schema,
      schemaError
    })
    
  } catch (error) {
    console.error('❌ Debug error:', error)
  }
}

debugMembers()