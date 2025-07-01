'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setMessage('Check your email for the password reset link!')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot your password?</CardTitle>
        <CardDescription>
          No worries! Enter your email and we'll send you reset instructions.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleResetPassword}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || !!message}
            />
          </div>
          
          {error && (
            <div className="text-sm text-destructive bg-destructive/5 p-3 rounded-md">
              {error}
            </div>
          )}
          
          {message && (
            <div className="text-sm text-success bg-success/5 p-3 rounded-md">
              {message}
            </div>
          )}

          {message && (
            <div className="text-sm text-muted-foreground space-y-2 bg-muted p-3 rounded-md">
              <p className="font-medium text-foreground">Next steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Check your email inbox</li>
                <li>Click the reset link in the email</li>
                <li>Create a new password</li>
              </ol>
              <p className="text-xs mt-2">
                Didn&apos;t receive the email? Check your spam folder or try again in a few minutes.
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            type="submit" 
            className="w-full"
            disabled={loading || !!message}
          >
            {loading ? 'Sending...' : 'Send reset instructions'}
          </Button>
          
          <Link 
            href="/auth/login" 
            className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to login
          </Link>
        </CardFooter>
      </form>
    </Card>
  )
}