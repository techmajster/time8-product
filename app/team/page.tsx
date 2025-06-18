import { AppLayout } from '@/components/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/ui/page-header'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, Plus, Mail } from 'lucide-react'
import Link from 'next/link'
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

  return (
    <AppLayout>
      <InviteTeamDialog />
      
      <Tabs defaultValue="members" className="w-full">
        {/* Row 1: Full-width white background with centered PageHeader + Tabs */}
        <div className="w-full bg-background">
          <PageHeader
            title="Zarządzanie zespołem"
            description="Zarządzaj członkami zespołu i zaproszeniami"
          >
            {canManageTeam && (
              <Link href="/team?invite=true">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 rounded-lg">
                  Zaproś członka
                </Button>
              </Link>
            )}
          </PageHeader>

          {/* Tabs navigation */}
          <div className="px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <TabsList>
                <TabsTrigger value="members">
                  Członkowie zespołu ({teamMembers?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="invitations">
                  Oczekujące zaproszenia ({invitations?.length || 0})
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </div>

        {/* Row 2: Full-width muted background with centered tab content */}
        <div className="w-full bg-content-area min-h-screen pt-6">
          <div className="px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              
              {/* Members Tab Content */}
              <TabsContent value="members" className="mt-0">
                <Card className="bg-background border rounded-lg shadow-none">
                  <CardContent className="p-6">
                    {teamMembers && teamMembers.length > 0 ? (
                      <div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Użytkownik</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Typ konta</TableHead>
                              <TableHead>Dołączył</TableHead>
                              <TableHead className="text-right">Akcje</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {teamMembers.map((member) => (
                              <TableRow key={member.id}>
                                <TableCell>
                                  <span className="font-medium text-foreground">
                                    {member.full_name || 'Brak nazwy'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="text-foreground">
                                    {member.email}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getRoleBadgeVariant(member.role)}>
                                    {getRoleDisplayName(member.role)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <span className="text-foreground">
                                    {new Date(member.created_at).toLocaleDateString('pl-PL')}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  {canManageTeam && member.id !== user.id && (
                                    <Button variant="outline" size="icon">
                                      <span className="text-lg">⋯</span>
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="bg-neutral-50 border-t border-border h-[52px] flex items-center">
                          <div className="px-4">
                            <p className="text-sm font-normal text-muted-foreground">
                              Total team members: {teamMembers?.length || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Jeszcze brak członków zespołu</p>
                        <p className="text-sm text-muted-foreground">Zaproś pierwszego członka zespołu aby rozpocząć</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Permission Notice for Non-Admins */}
                {!canManageTeam && (
                  <Alert className="mt-6 border-amber-200 bg-amber-50 text-amber-800">
                    <Users className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Ograniczony dostęp:</strong> Tylko administratorzy i menedżerowie mogą zapraszać nowych członków zespołu. Skontaktuj się z administratorem jeśli potrzebujesz kogoś zaprosić.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* Invitations Tab Content */}
              <TabsContent value="invitations" className="mt-0">
                <Card className="bg-background border rounded-lg shadow-none">
                  <CardContent className="p-6">
                    {invitations && invitations.length > 0 ? (
                      <div className="space-y-4">
                        {invitations.map((invitation) => {
                          const isExpired = new Date(invitation.expires_at) < new Date()
                          
                          return (
                            <div
                              key={invitation.id}
                              className="flex items-center justify-between p-4 border rounded-lg"
                            >
                              <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                                  <Mail className="h-4 w-4 text-warning" />
                                </div>
                                <div>
                                  <p className="font-medium">{invitation.email}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Zaproszony przez {
                                      invitation.profiles 
                                        ? (invitation.profiles as any).full_name || (invitation.profiles as any).email || 'Nieznany'
                                        : 'Nieznany'
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
                                  <Button variant="outline" size="sm">
                                    Wyślij ponownie
                                  </Button>
                                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/5">
                                    Anuluj
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
              </TabsContent>
            </div>
          </div>
        </div>
      </Tabs>
    </AppLayout>
  )
} 