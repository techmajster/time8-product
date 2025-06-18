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
import InvitationsSection from './components/InvitationsSection'

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
                <InvitationsSection 
                  invitations={invitations || []} 
                  canManageTeam={canManageTeam} 
                />
              </TabsContent>
            </div>
          </div>
        </div>
      </Tabs>
    </AppLayout>
  )
} 