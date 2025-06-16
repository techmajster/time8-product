'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  expires_at: string
  profiles?: {
    full_name?: string
    email?: string
  } | {
    full_name?: string
    email?: string
  }[]
}

interface InvitationsSectionProps {
  invitations: Invitation[]
  canManageTeam: boolean
}

export default function InvitationsSection({ invitations, canManageTeam }: InvitationsSectionProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive/10 text-destructive-foreground border-destructive/20'
      case 'manager': return 'bg-primary/10 text-primary-foreground border-primary/20'
      case 'employee': return 'bg-success/10 text-success-foreground border-success/20'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-warning" />
      case 'accepted': return <CheckCircle className="h-4 w-4 text-success" />
      case 'expired': return <XCircle className="h-4 w-4 text-destructive" />
      default: return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const handleCancelInvitation = async (invitationId: string, email: string) => {
    setLoading(invitationId)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/cancel-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId })
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess(`Zaproszenie do ${email} zostało anulowane i usunięte`)
        // Refresh the page to update the invitations list
        router.refresh()
      } else {
        setError(result.error || 'Nie udało się anulować zaproszenia')
      }
    } catch (err) {
      console.error('Error cancelling invitation:', err)
      setError('Nie udało się anulować zaproszenia')
    } finally {
      setLoading(null)
    }
  }

  const handleResendInvitation = async (invitationId: string, email: string) => {
    setLoading(invitationId)
    setError(null)
    setSuccess(null)

    // TODO: Implement resend functionality
    setTimeout(() => {
      setSuccess(`Zaproszenie ponownie wysłane do ${email}`)
      setLoading(null)
    }, 1000)
  }

  if (!canManageTeam) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Oczekujące zaproszenia ({invitations?.length || 0})
        </CardTitle>
        <CardDescription>
          Zaproszenia oczekujące na akceptację
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-success/5 border-success/20">
            <AlertDescription className="text-success-foreground">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {invitations && invitations.length > 0 ? (
          <div className="space-y-4">
            {invitations.map((invitation) => {
              const isExpired = new Date(invitation.expires_at) < new Date()
              const isLoading = loading === invitation.id
              
              return (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                      {getStatusIcon(isExpired ? 'expired' : invitation.status)}
                    </div>
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                                             <p className="text-sm text-muted-foreground">
                         Zaproszony przez {
                           Array.isArray(invitation.profiles) 
                             ? invitation.profiles[0]?.full_name || invitation.profiles[0]?.email || 'Nieznany'
                             : invitation.profiles?.full_name || invitation.profiles?.email || 'Nieznany'
                         }
                       </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getRoleBadgeColor(invitation.role)}>
                          {invitation.role === 'admin' ? 'Administrator' : invitation.role === 'manager' ? 'Menedżer' : 'Pracownik'}
                        </Badge>
                        <Badge variant={isExpired ? "destructive" : "secondary"}>
                          {isExpired ? 'Wygasłe' : 'Oczekujące'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {isExpired ? 'Wygasło' : 'Wygasa'} {new Date(invitation.expires_at).toLocaleDateString('pl-PL')}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={isLoading || isExpired}
                        onClick={() => handleResendInvitation(invitation.id, invitation.email)}
                      >
                        {isLoading ? 'Wysyłanie...' : 'Wyślij ponownie'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive hover:bg-destructive/5"
                        disabled={isLoading || isExpired}
                        onClick={() => handleCancelInvitation(invitation.id, invitation.email)}
                      >
                        {isLoading ? 'Anulowanie...' : 'Anuluj'}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground">Brak oczekujących zaproszeń</p>
            <p className="text-sm text-muted-foreground">Wszystkie zaproszenia zostały zaakceptowane lub wygasły</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 