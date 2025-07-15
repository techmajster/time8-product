'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Team {
  id: string
  name: string
  color: string
}

export function InviteTeamDialog() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [formData, setFormData] = useState({
    email: '',
    role: 'employee',
    team_id: '',
    personalMessage: ''
  })
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const isOpen = searchParams.get('invite') === 'true'

  // Fetch teams when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchTeams()
    }
  }, [isOpen])

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      const data = await response.json()
      if (response.ok) {
        setTeams(data.teams || [])
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
    }
  }

  const handleClose = () => {
    setFormData({
      email: '',
      role: 'employee', 
      team_id: '',
      personalMessage: ''
    })
    setError(null)
    setSuccess(null)
    router.push('/team')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Validate required fields
      if (!formData.email.trim()) {
        throw new Error('Email jest wymagany')
      }
      if (!formData.role) {
        throw new Error('Rola jest wymagana')
      }
      if (!formData.team_id) {
        throw new Error('Zespół jest wymagany')
      }

      // Get current user and their organization
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        throw new Error(`Profile error: ${profileError.message}`)
      }

      if (!profile?.organization_id) {
        throw new Error('Organization not found')
      }

      // Check if user has permission to invite
      if (profile.role !== 'admin' && profile.role !== 'manager') {
        throw new Error('You do not have permission to invite team members')
      }

      // Validate team assignment for managers
      if (formData.role === 'manager' && !formData.team_id) {
        throw new Error('Menedżerowie muszą być przypisani do zespołu')
      }

      // Check if email is already a member
      const { data: existingMember } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.email.toLowerCase())
        .eq('organization_id', profile.organization_id)
        .single()

      if (existingMember) {
        throw new Error('This email is already a member of your organization')
      }

      // Check if there's already a pending invitation
      const { data: existingInvitation } = await supabase
        .from('invitations')
        .select('id')
        .eq('email', formData.email.toLowerCase())
        .eq('organization_id', profile.organization_id)
        .eq('status', 'pending')
        .single()

      if (existingInvitation) {
        throw new Error('There is already a pending invitation for this email')
      }

      // Generate invitation token
      const token = btoa(Math.random().toString(36).substring(2) + Date.now().toString(36))
      
      // Set expiry date to 7 days from now
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      // Generate invitation code
      const invitationCode = Math.random().toString(36).substring(2, 8).toUpperCase()

      // Create invitation with team assignment
      const { data: invitation, error: invitationError } = await supabase
        .from('invitations')
        .insert({
          email: formData.email.toLowerCase(),
          role: formData.role,
          team_id: formData.team_id,
          organization_id: profile.organization_id,
          invited_by: user.id,
          token,
          invitation_code: invitationCode,
          expires_at: expiresAt.toISOString(),
          personal_message: formData.personalMessage.trim() || null
        })
        .select()
        .single()

      if (invitationError) {
        throw new Error(`Invitation error: ${invitationError.message}`)
      }

      // Send invitation email
      const response = await fetch('/api/send-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          invitationCode,
          personalMessage: formData.personalMessage
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send invitation email')
      }

      setSuccess(`Zaproszenie zostało wysłane na adres ${formData.email}. Kod zaproszenia: ${invitationCode}`)
      
      // Reset form
      setFormData({
        email: '',
        role: 'employee',
        team_id: '',
        personalMessage: ''
      })

      // Refresh the page to show new invitation
      setTimeout(() => {
        handleClose()
        router.refresh()
      }, 2000)

    } catch (err) {
      console.error('Error sending invitation:', err)
      let errorMessage = 'Wystąpił błąd podczas wysyłania zaproszenia'
      
      if (err instanceof Error) {
        errorMessage = err.message
      } else {
        try {
          errorMessage = JSON.stringify(err)
        } catch {
          errorMessage = JSON.stringify(err)
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Zaproś członka zespołu
          </DialogTitle>
          <DialogDescription>
            Wyślij zaproszenie do dołączenia do Twojej organizacji
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Adres email</Label>
            <Input
              id="email"
              type="email"
              placeholder="jan.kowalski@example.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rola w organizacji</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
              disabled={loading}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz rolę" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Pracownik</SelectItem>
                <SelectItem value="manager">Menedżer</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="team">Zespół <span className="text-red-500">*</span></Label>
            <Select
              value={formData.team_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, team_id: value }))}
              disabled={loading}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz zespół" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: team.color }}
                      />
                      {team.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {formData.role === 'manager' ? 'Menedżerowie muszą być przypisani do zespołu' : 'Przypisanie do zespołu jest obowiązkowe'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="personalMessage">Wiadomość (opcjonalnie)</Label>
            <Textarea
              id="personalMessage"
              placeholder="Dodaj osobistą wiadomość do zaproszenia..."
              value={formData.personalMessage}
              onChange={(e) => setFormData(prev => ({ ...prev, personalMessage: e.target.value }))}
              disabled={loading}
              rows={3}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading || !formData.team_id}>
              {loading ? 'Wysyłanie...' : 'Wyślij zaproszenie'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 