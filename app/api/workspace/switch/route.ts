import { NextRequest, NextResponse } from 'next/server'
import { switchOrganization } from '@/lib/auth-utils-v2'

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await request.json()
    console.log('🔄 Workspace switch API called with:', { organizationId })
    
    if (!organizationId) {
      console.error('❌ No organization ID provided')
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    console.log('🔄 Calling switchOrganization function...')
    const result = await switchOrganization(organizationId)
    console.log('🔄 Switch organization result:', result)
    
    if (result.success) {
      console.log('✅ Organization switched successfully, cookies should be updated')
    }
    
    if (!result.success) {
      console.error('❌ Switch organization failed:', result.error)
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    console.log('✅ Workspace switched successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Workspace switch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}