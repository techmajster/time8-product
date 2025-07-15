import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export default async function NewLeaveRequestPage() {
  const headersList = await headers()
  const referer = headersList.get('referer')
  
  // If there's a referrer, redirect back to it with ?new=true
  // Otherwise, default to /leave?new=true
  if (referer) {
    const refererUrl = new URL(referer)
    refererUrl.searchParams.set('new', 'true')
    redirect(refererUrl.pathname + refererUrl.search)
  } else {
  redirect('/leave?new=true')
  }
} 