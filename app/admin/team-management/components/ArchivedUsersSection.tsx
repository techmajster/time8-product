'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { MoreHorizontal, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react'
import { toast } from 'sonner'

interface ArchivedUser {
  id: string
  email: string
  full_name: string | null
  avatar_url?: string | null
  role: string
  team_id?: string | null
  team_name?: string
}

interface Team {
  id: string
  name: string
  color?: string
}

interface ArchivedUsersSectionProps {
  users: ArchivedUser[]
  teams: Team[]
  onReactivate?: (userId: string) => Promise<void>
}

export function ArchivedUsersSection({ users, teams, onReactivate }: ArchivedUsersSectionProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false)
  const [userToReactivate, setUserToReactivate] = useState<ArchivedUser | null>(null)

  // Team filter state
  const [activeTeamFilter, setActiveTeamFilter] = useState('Wszyscy')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const openReactivateDialog = (user: ArchivedUser) => {
    setUserToReactivate(user)
    setIsReactivateDialogOpen(true)
  }

  const confirmReactivate = async () => {
    if (!userToReactivate || !onReactivate) return

    setLoading(userToReactivate.id)
    try {
      console.log('🔄 Reactivating user:', userToReactivate.email)

      await onReactivate(userToReactivate.id)

      console.log('✅ User reactivated successfully')
      toast.success('Użytkownik został przywrócony')
      setIsReactivateDialogOpen(false)
      setUserToReactivate(null)
    } catch (error) {
      console.error('❌ Error reactivating user:', error)
      toast.error('Wystąpił błąd podczas przywracania użytkownika')
    } finally {
      setLoading(null)
    }
  }

  const getUserInitials = (user: ArchivedUser) => {
    if (user.full_name) {
      const nameParts = user.full_name.trim().split(' ')
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      }
      return user.full_name.substring(0, 2).toUpperCase()
    }

    // Fallback to email if no full_name
    const localPart = user.email.split('@')[0]
    const parts = localPart.split(/[.\-_]/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return localPart.substring(0, 2).toUpperCase()
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator'
      case 'manager': return 'Manager'
      case 'employee': return 'Pracownik'
      default: return role
    }
  }

  // Team filter tabs
  const teamTabs = ['Wszyscy', ...teams.map(t => t.name)]

  // Filter users by team
  const filteredUsers = activeTeamFilter === 'Wszyscy'
    ? users
    : users.filter(user => user.team_name === activeTeamFilter)

  // Pagination calculations (use filtered users)
  const totalItems = filteredUsers.length
  const totalPages = Math.ceil(totalItems / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)
  const displayStart = totalItems === 0 ? 0 : startIndex + 1
  const displayEnd = Math.min(endIndex, totalItems)

  // Reset to page 1 if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages])

  if (users.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm border rounded-lg">
        Brak zarchiwizowanych użytkowników
      </div>
    )
  }

  return (
    <div>
      {/* Group Filter Tabs */}
      {teams.length > 0 && (
        <div className="mb-6">
          <div className="bg-muted relative rounded-lg p-[3px] flex w-fit">
            {teamTabs.map((teamName: string) => (
              <button
                key={teamName}
                onClick={() => {
                  setActiveTeamFilter(teamName)
                  setCurrentPage(1) // Reset to first page when changing filter
                }}
                className={`
                  flex items-center justify-center px-2.5 py-2 rounded-lg text-sm font-normal leading-5 transition-all
                  ${activeTeamFilter === teamName
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background/50'
                  }
                `}
              >
                {teamName}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-medium text-muted-foreground w-full min-w-0">Imię i nazwisko</TableHead>
                <TableHead className="font-medium text-muted-foreground min-w-64">Grupa</TableHead>
                <TableHead className="font-medium text-muted-foreground min-w-32">Rola</TableHead>
                <TableHead className="font-medium text-muted-foreground text-center min-w-32">Status</TableHead>
                <TableHead className="font-medium text-muted-foreground text-right min-w-24">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((user) => (
                <TableRow key={user.id} className="h-[72px]">
                  {/* Column 1: Imię i nazwisko (name + email stacked) */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="text-sm font-medium">
                          {getUserInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-foreground">
                          {user.full_name || user.email}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Column 2: Grupa (team name) */}
                  <TableCell>
                    <div className="font-medium text-foreground">
                      {user.team_name || '—'}
                    </div>
                  </TableCell>

                  {/* Column 3: Rola */}
                  <TableCell>
                    <div className="font-medium text-foreground">
                      {getRoleDisplayName(user.role)}
                    </div>
                  </TableCell>

                  {/* Column 4: Status (red "Zarchiwizowany" badge) */}
                  <TableCell className="text-center">
                    <Badge
                      variant="default"
                      className="bg-red-600 text-white border-transparent"
                    >
                      Zarchiwizowany
                    </Badge>
                  </TableCell>

                  {/* Column 5: Akcje (three-dot menu) */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={loading === user.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => openReactivateDialog(user)}
                          disabled={loading === user.id}
                          className="cursor-pointer"
                        >
                          Przywróć użytkownika
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between py-4">
          {/* Left: X z Y wierszy */}
          <div className="text-sm text-muted-foreground">
            {displayStart} z {totalItems} wierszy
          </div>

          {/* Right: Wierszy na stronie dropdown + Page navigation */}
          <div className="flex items-center gap-6">
            {/* Wierszy na stronie dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Wierszy na stronie:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value))
                  setCurrentPage(1) // Reset to first page when changing page size
                }}
              >
                <SelectTrigger className="w-[70px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Strona {currentPage} z {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reactivate User Confirmation Dialog */}
      <Dialog open={isReactivateDialogOpen} onOpenChange={(open) => {
        setIsReactivateDialogOpen(open)
        if (!open) {
          setUserToReactivate(null)
        }
      }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Czy na pewno chcesz przywrócić użytkownika?</DialogTitle>
            <DialogDescription>
              Użytkownik odzyska dostęp do systemu
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={confirmReactivate}
              disabled={loading === userToReactivate?.id}
            >
              Tak, przywróć użytkownika
            </Button>
            <Button
              onClick={() => setIsReactivateDialogOpen(false)}
              disabled={loading === userToReactivate?.id}
            >
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
