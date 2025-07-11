import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBasicAuth } from '@/lib/auth-utils'

export async function GET() {
  try {
    const auth = await getBasicAuth()
    if (!auth.success) {
      return auth.error
    }

    const { organizationId } = auth
    const supabase = await createClient()

    // Get all members of the organization with their team assignments
    const { data: members, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, auth_provider, created_at, team_id, avatar_url')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching organization members:', error)
      return NextResponse.json(
        { error: 'Failed to fetch organization members' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      members: members || []
    })

  } catch (error) {
    console.error('Organization members API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 