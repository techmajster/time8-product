import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">System Zarządzania Urlopami SaaS</h1>
        <p className="text-xl text-muted-foreground">
          Efektywnie zarządzaj wnioskami urlopowymi pracowników
        </p>
        <div className="space-x-4">
          {user ? (
            <Button asChild>
              <Link href="/dashboard">Przejdź do pulpitu</Link>
            </Button>
          ) : (
            <>
              <Button asChild>
                <Link href="/auth/login">Zaloguj się</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/auth/signup">Zarejestruj się</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}