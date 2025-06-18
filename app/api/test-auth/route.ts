import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      return NextResponse.json({ 
        authenticated: false, 
        error: userError.message,
        cookies: request.headers.get('cookie') ? 'present' : 'missing'
      })
    }

    if (!user) {
      return NextResponse.json({ 
        authenticated: false, 
        error: 'No user found',
        cookies: request.headers.get('cookie') ? 'present' : 'missing'
      })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, organization_id, role')
      .eq('id', user.id)
      .single()

    return NextResponse.json({ 
      authenticated: true,
      user: {
        id: user.id,
        email: user.email
      },
      profile: profile,
      profileError: profileError?.message,
      hasOrganization: !!profile?.organization_id
    })
  } catch (error) {
    return NextResponse.json({ 
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 