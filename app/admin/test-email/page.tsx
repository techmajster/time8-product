'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, CheckCircle, XCircle } from 'lucide-react'

export default function TestEmailPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; messageId?: string } | null>(null)

  const sendTestEmail = async () => {
    if (!email) {
      setResult({ success: false, message: 'Please enter an email address' })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email })
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: `Test email sent successfully! Message ID: ${data.messageId}`,
          messageId: data.messageId
        })
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to send email'
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error occurred'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Test Email Configuration
          </CardTitle>
          <CardDescription>
            Send a test email to verify your Resend configuration is working correctly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Test Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address to test"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button 
            onClick={sendTestEmail} 
            disabled={loading || !email}
            className="w-full"
          >
            {loading ? 'Sending...' : 'Send Test Email'}
          </Button>

          {result && (
            <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
                  {result.message}
                </AlertDescription>
              </div>
            </Alert>
          )}

          <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
            <h4 className="font-semibold">What this test checks:</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>RESEND_API_KEY is configured correctly</li>
              <li>FROM_EMAIL is set properly</li>
              <li>Email delivery works end-to-end</li>
              <li>HTML email templates render correctly</li>
            </ul>
            <p className="text-muted-foreground">
              If this test passes, your invitation emails should work perfectly!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 