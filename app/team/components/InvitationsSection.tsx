'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case 'admin': return 'destructive'
      case 'manager': return 'default' 
      case 'employee': return 'secondary'
      default: return 'outline'
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin'
      case 'manager': return 'Menedżer' 
      case 'employee': return 'Pracownik'
      default: return role
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

    try {
      const response = await fetch('/api/resend-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId })
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess(`Zaproszenie ponownie wysłane do ${email}`)
        // Refresh the page to update the invitations list
        router.refresh()
      } else {
        setError(result.error || 'Nie udało się ponownie wysłać zaproszenia')
      }
    } catch (err) {
      console.error('Error resending invitation:', err)
      setError('Nie udało się ponownie wysłać zaproszenia')
    } finally {
      setLoading(null)
    }
  }

  if (!canManageTeam) {
    return null
  }

  return (
    <Card className="bg-background border rounded-lg shadow-none">
      <CardContent className="p-6">
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
                        <Badge variant={getRoleBadgeVariant(invitation.role)}>
                          {getRoleDisplayName(invitation.role)}
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
          /* Empty State based on Figma design */
          <div className="flex flex-col items-center justify-center py-12">
            <div className="bg-white border border-border rounded-lg shadow-sm size-12 flex items-center justify-center mb-6">
              <Mail className="h-6 w-6 text-foreground" />
            </div>
            <div className="text-center space-y-2 mb-6">
              <h3 className="text-xl font-semibold text-foreground leading-7">
                Nie masz żadnego oczekującego zaproszenia
              </h3>
              <p className="text-sm text-muted-foreground leading-5">
                Wszystkie zaproszenia zostały zaakceptowane lub wygasły. Zaproś nowych członków zespołu.
              </p>
            </div>
            {canManageTeam && (
              <div className="flex justify-center">
                <Link href="/team?invite=true">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 rounded-lg">
                    Zaproś członka
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 