import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/debug/team-members - Debug endpoint to check team_id assignments
// NO AUTH - for debugging only, remove in production
export async function GET() {
  try {
    const supabaseAdmin = createAdminClient()

    const { data: allMembers, error } = await supabaseAdmin
      .from('user_organizations')
      .select('user_id, team_id, organization_id, role, profiles!user_organizations_user_id_fkey (id, full_name, email)')
      .eq('organization_id', 'a5b891a0-f314-498d-aa9d-fa9dcc13d0ce')
      .eq('is_active', true)
      .order('team_id')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Find Paweł specifically
    const pawel = allMembers?.find(m => (m.profiles as any)?.email === 'pawel.chrosciak@bb8.pl')

    // Group by team_id
    const groupedByTeam = allMembers?.reduce((acc: any, member: any) => {
      const teamId = member.team_id || 'NO_TEAM'
      if (!acc[teamId]) {
        acc[teamId] = []
      }
      acc[teamId].push({
        user_id: member.user_id,
        full_name: (member.profiles as any)?.full_name,
        email: (member.profiles as any)?.email,
        role: member.role
      })
      return acc
    }, {})

    return NextResponse.json({
      total_members: allMembers?.length,
      pawel_record: pawel,
      grouped_by_team: groupedByTeam,
      raw_data: allMembers
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
