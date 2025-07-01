import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  
  await supabase.auth.signOut()
  
  // Get the origin from the request URL instead of hardcoded localhost
  const requestUrl = new URL(request.url)
  const origin = requestUrl.origin
  
  return NextResponse.redirect(new URL('/login', origin))
} 