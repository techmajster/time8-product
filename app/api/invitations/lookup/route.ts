import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Look up invitation by token using server-side client (bypasses RLS)
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(`
        id,
        email,
        full_name,
        birth_date,
        role,
        team_id,
        organization_id,
        status,
        expires_at
      `)
      .eq('token', token)
      .eq('status', 'pending')
      .single()

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or invalid' },
        { status: 404 }
      )
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      )
    }

    // Get organization name
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', invitation.organization_id)
      .single()

    // Get team name if team_id exists
    let teamName = null
    if (invitation.team_id) {
      const { data: team } = await supabase
        .from('teams')
        .select('name')
        .eq('id', invitation.team_id)
        .single()
      teamName = team?.name || null
    }

    // Return invitation with organization and team info
    return NextResponse.json({
      ...invitation,
      organization_name: org?.name || 'Unknown Organization',
      team_name: teamName
    })

  } catch (error) {
    console.error('Invitation lookup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 