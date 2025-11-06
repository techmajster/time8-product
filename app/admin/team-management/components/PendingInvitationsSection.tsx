'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import { refetchTeamManagement } from '@/lib/refetch-events'
import { toast } from 'sonner'

interface Invitation {
  id: string
  email: string
  full_name?: string | null
  birth_date?: string | null
  role: string
  status: string
  created_at: string
  expires_at: string
  invitation_code?: string
  invited_by: string
  team_id?: string | null
  inviter_name: string
  inviter_email: string
  team_name: string
}

interface PendingInvitationsSectionProps {
  invitations: Invitation[]
}

export function PendingInvitationsSection({ invitations }: PendingInvitationsSectionProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleResendInvitation = async (invitation: Invitation) => {
    setLoading(invitation.id)
    try {
      console.log('🔄 Resending invitation for:', invitation.email)
      
      const response = await fetch('/api/resend-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          invitationId: invitation.id,
          email: invitation.email 
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        console.log('✅ Invitation resent successfully')
        toast.success('Zaproszenie zostało wysłane ponownie')
      } else {
        console.error('❌ Failed to resend invitation:', data)
        toast.error(data.error || 'Nie udało się wysłać zaproszenia ponownie')
      }
    } catch (error) {
      console.error('❌ Error resending invitation:', error)
      toast.error('Wystąpił błąd podczas wysyłania zaproszenia')
    } finally {
      setLoading(null)
    }
  }

  const handleCancelInvitation = async (invitation: Invitation) => {
    setLoading(invitation.id)
    try {
      console.log('🗑️ Cancelling invitation for:', invitation.email)
      
      const response = await fetch('/api/cancel-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId: invitation.id })
      })

      const data = await response.json()
      
      if (response.ok) {
        console.log('✅ Invitation cancelled successfully')
        toast.success('Zaproszenie zostało anulowane')
        refetchTeamManagement()
      } else {
        console.error('❌ Failed to cancel invitation:', data)
        toast.error(data.error || 'Nie udało się anulować zaproszenia')
      }
    } catch (error) {
      console.error('❌ Error cancelling invitation:', error)
      toast.error('Wystąpił błąd podczas anulowania zaproszenia')
    } finally {
      setLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator'
      case 'manager': return 'Manager'
      case 'employee': return 'Pracownik'
      default: return role
    }
  }

  const getInviteeInitials = (invitation: Invitation) => {
    if (invitation.full_name) {
      const nameParts = invitation.full_name.trim().split(' ')
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      }
      return invitation.full_name.substring(0, 2).toUpperCase()
    }
    
    // Fallback to email if no full_name
    const localPart = invitation.email.split('@')[0]
    const parts = localPart.split(/[.\-_]/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return localPart.substring(0, 2).toUpperCase()
  }

  const getInviteeName = (email: string) => {
    const localPart = email.split('@')[0]
    const parts = localPart.split(/[.\-_]/)
    if (parts.length >= 2) {
      return parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
    }
    return localPart.charAt(0).toUpperCase() + localPart.slice(1)
  }

  // Always show section for debugging - you can change this later
  console.log('📋 PendingInvitationsSection - invitations count:', invitations.length)
  console.log('📋 PendingInvitationsSection - invitations data:', invitations)
  
  if (invitations.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium mb-8">Oczekujące zaproszenia</h3>
        <div className="text-center py-4 text-muted-foreground text-sm border rounded-lg">
          Brak oczekujących zaproszeń
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Oczekujące zaproszenia</h3>
      <Card>
        <CardContent className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-medium text-muted-foreground w-full min-w-0">Zaproszony</TableHead>
                <TableHead className="font-medium text-muted-foreground min-w-64">Zespół</TableHead>
                <TableHead className="font-medium text-muted-foreground min-w-64">Zaproszony przez</TableHead>
                <TableHead className="font-medium text-muted-foreground min-w-40">Rola</TableHead>
                <TableHead className="font-medium text-muted-foreground min-w-40">Wygasa</TableHead>
                <TableHead className="font-medium text-muted-foreground text-right min-w-24">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => (
                <TableRow key={invitation.id} className="h-[72px]">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10">
                        <AvatarFallback className="text-sm font-medium">
                          {getInviteeInitials(invitation)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-foreground">
                          {invitation.full_name || getInviteeName(invitation.email)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {invitation.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                                                <TableCell>
                                <div className="font-medium text-foreground">
                                  {invitation.team_name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-foreground">
                                  {invitation.inviter_name}
                                </div>
                              </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">
                      {getRoleDisplayName(invitation.role)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">
                      {formatDate(invitation.expires_at)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          disabled={loading === invitation.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem 
                          onClick={() => handleResendInvitation(invitation)}
                          disabled={loading === invitation.id}
                          className="cursor-pointer"
                        >
                          Wyślij ponownie
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleCancelInvitation(invitation)}
                          disabled={loading === invitation.id}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          Anuluj
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
} 