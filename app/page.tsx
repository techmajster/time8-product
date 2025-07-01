import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to login page as our first page
  redirect('/login')
}