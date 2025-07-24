import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { organization_id, message } = await request.json()

    if (!organization_id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user already has an organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profile?.organization_id) {
      return NextResponse.json(
        { error: 'You are already part of an organization' },
        { status: 400 }
      )
    }

    // Check if request already exists
    const { data: existingRequest } = await supabase
      .from('access_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('organization_id', organization_id)
      .eq('status', 'pending')
      .single()

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending request for this organization' },
        { status: 400 }
      )
    }

    // Create access request
    const { data: accessRequest, error: requestError } = await supabase
      .from('access_requests')
      .insert({
        user_id: user.id,
        organization_id,
        user_email: user.email,
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
        message: message || '',
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (requestError) {
      console.error('Error creating access request:', requestError)
      return NextResponse.json(
        { error: 'Failed to create access request' },
        { status: 500 }
      )
    }

    // TODO: Send notification to organization admins
    // This could be implemented later with email notifications

    return NextResponse.json({
      success: true,
      message: 'Access request sent successfully',
      request_id: accessRequest.id
    })

  } catch (error) {
    console.error('Request access error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 