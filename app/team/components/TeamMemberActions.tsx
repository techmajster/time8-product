'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MoreHorizontal, UserCog, Trash2, Shield, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: string
}

interface TeamMemberActionsProps {
  member: TeamMember
  currentUserId: string
  canManageTeam: boolean
  currentUserRole: string
}

export function TeamMemberActions({ 
  member, 
  currentUserId, 
  canManageTeam,
  currentUserRole 
}: TeamMemberActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const t = useTranslations('team')
  const tCommon = useTranslations('common')
  
  // Don't show actions for the current user or if user can't manage team
  if (!canManageTeam || member.id === currentUserId) {
    return null
  }

  const handleRoleChange = async (newRole: string) => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/team/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: member.id,
          newRole
        })
      })

      const result = await response.json()

      if (response.ok) {
        const roleName = t(`roles.${newRole}`)
        toast.success(t('memberActions.roleChanged', { role: roleName }))
        router.refresh()
      } else {
        toast.error(result.error || t('memberActions.failedToChangeRole'))
      }
    } catch (error) {
      console.error('Error changing role:', error)
      toast.error(t('memberActions.failedToChangeRole'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMember = async () => {
    setLoading(true)
    
    try {
      const response = await fetch(`/api/team/members?memberId=${member.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (response.ok) {
        const memberName = member.full_name || member.email
        toast.success(t('memberActions.memberRemoved', { memberName }))
        setDeleteDialogOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || t('memberActions.failedToRemoveMember'))
      }
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error(t('memberActions.failedToRemoveMember'))
    } finally {
      setLoading(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4" />
      case 'manager': return <UserCog className="h-4 w-4" />
      case 'employee': return <Users className="h-4 w-4" />
      default: return <Users className="h-4 w-4" />
    }
  }

  const canPromoteToAdmin = currentUserRole === 'admin'
  const canRemoveAdmin = currentUserRole === 'admin' || member.role !== 'admin'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="icon"
            disabled={loading}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <UserCog className="h-4 w-4 mr-2" />
              {t('memberActions.changeRole')}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {/* Employee Role */}
              {member.role !== 'employee' && (
                <DropdownMenuItem 
                  onClick={() => handleRoleChange('employee')}
                  disabled={loading}
                >
                  {getRoleIcon('employee')}
                  <span className="ml-2">{t('roles.employee')}</span>
                </DropdownMenuItem>
              )}
              
              {/* Manager Role */}
              {member.role !== 'manager' && (
                <DropdownMenuItem 
                  onClick={() => handleRoleChange('manager')}
                  disabled={loading}
                >
                  {getRoleIcon('manager')}
                  <span className="ml-2">{t('roles.manager')}</span>
                </DropdownMenuItem>
              )}
              
              {/* Admin Role - Only admins can promote to admin */}
              {member.role !== 'admin' && canPromoteToAdmin && (
                <DropdownMenuItem 
                  onClick={() => handleRoleChange('admin')}
                  disabled={loading}
                >
                  {getRoleIcon('admin')}
                  <span className="ml-2">{t('roles.admin')}</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          
          <DropdownMenuSeparator />
          
          {/* Delete Member - Only show if user can remove this member */}
          {canRemoveAdmin && (
            <DropdownMenuItem 
              onClick={() => setDeleteDialogOpen(true)}
              disabled={loading}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('memberActions.deleteMember')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('memberActions.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('memberActions.confirmDeleteMessage', { 
                memberName: member.full_name || member.email 
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>
              {tCommon('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? t('memberActions.removingMember') : t('memberActions.deleteMember')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 