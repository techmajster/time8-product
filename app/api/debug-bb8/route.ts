import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // SECURITY: Debug endpoint - only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Debug endpoints are disabled in production' },
        { status: 403 }
      )
    }

    const supabaseAdmin = createAdminClient()
    
    // First, find BB8 Studio organization ID
    const { data: bb8Org } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .ilike('name', '%BB8%')
    
    console.log('BB8 Organizations found:', bb8Org)
    
    if (!bb8Org || bb8Org.length === 0) {
      return NextResponse.json({ error: 'BB8 Studio not found' })
    }
    
    const orgId = bb8Org[0].id
    
    // Get ALL user_organizations records for BB8 Studio (active and inactive)
    const { data: allUsers } = await supabaseAdmin
      .from('user_organizations')
      .select(`
        user_id,
        role,
        is_active,
        profiles!user_organizations_user_id_fkey (
          id,
          email,
          full_name
        )
      `)
      .eq('organization_id', orgId)
      
    // Get ONLY active users
    const { data: activeUsers } = await supabaseAdmin
      .from('user_organizations')
      .select(`
        user_id,
        role,
        is_active,
        profiles!user_organizations_user_id_fkey (
          id,
          email,
          full_name
        )
      `)
      .eq('organization_id', orgId)
      .eq('is_active', true)
    
    return NextResponse.json({
      organization: bb8Org[0],
      allUsersCount: allUsers?.length || 0,
      activeUsersCount: activeUsers?.length || 0,
      allUsers: allUsers?.map(u => ({
        email: u.profiles?.email,
        name: u.profiles?.full_name,
        role: u.role,
        is_active: u.is_active
      })) || [],
      activeUsers: activeUsers?.map(u => ({
        email: u.profiles?.email,
        name: u.profiles?.full_name,
        role: u.role,
        is_active: u.is_active
      })) || []
    })
    
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: 'Database check failed' })
  }
}