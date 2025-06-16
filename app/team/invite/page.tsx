import { redirect } from 'next/navigation'

export default function InviteMemberPage() {
  redirect('/team?invite=true')
} 