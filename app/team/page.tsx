import { AppLayout } from '@/components/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Plus } from 'lucide-react'
import Link from 'next/link'
import InvitationsSection from './components/InvitationsSection'
import { InviteTeamDialog } from './components/InviteTeamDialog'

export default async function TeamPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile with organization details
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      *,
      organizations (
        id,
        name
      )
    `)
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    redirect('/onboarding')
  }

  // Check if user has permission to manage team
  const canManageTeam = profile.role === 'admin' || profile.role === 'manager'

  // Get all team members
  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, auth_provider, created_at')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: true })

  // Get pending invitations with inviter details
  const { data: invitations } = await supabase
    .from('invitations')
    .select(`
      id, 
      email, 
      role, 
      status, 
      created_at,
      expires_at,
      profiles!invitations_invited_by_fkey (
        full_name,
        email
      )
    `)
    .eq('organization_id', profile.organization_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive/10 text-destructive-foreground border-destructive/20 dark:bg-destructive/10 dark:text-destructive-foreground dark:border-destructive/20'
              case 'manager': return 'bg-primary/10 text-primary-foreground border-primary/20'
      case 'employee': return 'bg-success/10 text-success-foreground border-success/20 dark:bg-success/10 dark:text-success-foreground dark:border-success/20'
      default: return 'bg-muted text-muted-foreground border-border dark:bg-muted dark:text-muted-foreground dark:border-border'
    }
  }

  return (
    <AppLayout>
      <InviteTeamDialog />
      
      <div className="min-h-screen bg-background">
        <div className="p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1  className="text-2xl font-semibold text-foreground">Zarządzanie zespołem</h1>
                <p className="text-muted-foreground mt-1">Zarządzaj członkami zespołu i zaproszeniami</p>
              </div>
              {canManageTeam && (
                 <Link href="/team?invite=true">
                  <Button className="">
                    <Plus className="h-4 w-4 mr-2" />
                    Zaproś członka
                  </Button>
                </Link>
              )}
            </div>

            <div className="grid gap-6">
              {/* Team Members */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Członkowie zespołu ({teamMembers?.length || 0})
                  </CardTitle>
                  <CardDescription>
                    Aktywni członkowie organizacji {profile.organizations?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {teamMembers && teamMembers.length > 0 ? (
                    <div className="space-y-4">
                      {teamMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary-foreground">
                                {(member.full_name || member.email)?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{member.full_name || 'Brak nazwy'}</p>
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={getRoleBadgeColor(member.role)}>
                                  {member.role === 'admin' ? 'Administrator' : member.role === 'manager' ? 'Menedżer' : 'Pracownik'}
                                </Badge>
                                {member.auth_provider === 'google' && (
                                  <Badge variant="outline" className="text-xs">
                                    Google
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              Dołączył {new Date(member.created_at).toLocaleDateString('pl-PL')}
                            </p>
                            {canManageTeam && member.id !== user.id && (
                              <Button variant="outline" size="sm" className="mt-2">
                                Zarządzaj
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Jeszcze brak członków zespołu</p>
                      <p className="text-sm text-muted-foreground">Zaproś pierwszego członka zespołu aby rozpocząć</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pending Invitations */}
              <InvitationsSection 
                invitations={invitations || []} 
                canManageTeam={canManageTeam} 
              />

              {/* Permission Notice for Non-Admins */}
              {!canManageTeam && (
                <Card className="border-warning/20 bg-warning/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-warning/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-warning" />
                      </div>
                      <div>
                        <p className="font-medium text-warning-foreground">Ograniczony dostęp</p>
                        <p className="text-sm text-warning">
                          Tylko administratorzy i menedżerowie mogą zapraszać nowych członków zespołu. Skontaktuj się z administratorem jeśli potrzebujesz kogoś zaprosić.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
} 