import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

async function lookupInvitation(identifier: string, identifierType: 'token' | 'code') {
  const supabase = await createAdminClient()

  // Look up invitation by token or code using server-side client (bypasses RLS)
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
      expires_at,
      token
    `)
    .eq(identifierType, identifier)
    .eq('status', 'pending')
    .single()

  if (error || !invitation) {
    throw new Error('Invitation not found or invalid')
  }

  // Check if invitation has expired
  if (new Date(invitation.expires_at) < new Date()) {
    throw new Error('Invitation has expired')
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

  // Check if user with this email already exists
  const { data: existingUser } = await supabase.auth.admin.listUsers()
  const userExists = existingUser?.users.some(user => user.email === invitation.email) || false

  // Return invitation with organization and team info
  return {
    ...invitation,
    organization_name: org?.name || 'Unknown Organization',
    team_name: teamName,
    user_exists: userExists
  }
}

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

    const invitation = await lookupInvitation(token, 'token')
    return NextResponse.json(invitation)

  } catch (error: any) {
    console.error('Invitation lookup error:', error)
    const message = error.message || 'Internal server error'
    const status = message.includes('not found') ? 404 : 
                  message.includes('expired') ? 410 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    
    if (!code) {
      return NextResponse.json(
        { error: 'Invitation code is required' },
        { status: 400 }
      )
    }

    const invitation = await lookupInvitation(code, 'code')
    return NextResponse.json(invitation)

  } catch (error: any) {
    console.error('Invitation code lookup error:', error)
    const message = error.message || 'Internal server error'
    const status = message.includes('not found') ? 404 : 
                  message.includes('expired') ? 410 : 500
    return NextResponse.json({ error: message }, { status })
  }
} 