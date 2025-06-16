import { redirect } from 'next/navigation'

export default function NewLeaveRequestPage() {
  redirect('/leave?new=true')
} 