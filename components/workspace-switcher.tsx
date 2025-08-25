'use client'

import { useState, useEffect } from 'react'
import { ChevronsUpDown, Plus, Users, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useRouter } from 'next/navigation'

interface Workspace {
  id: string
  name: string
  initials: string
  memberCount: number
  memberAvatars: Array<{
    id: string
    full_name: string
    avatar_url: string | null
  }>
  role: string
}

interface PendingInvitation {
  id: string
  organizationName: string
  organizationInitials: string
  inviterName: string
  inviterEmail: string
  token: string
}

interface WorkspaceSwitcherProps {
  currentWorkspaceName?: string
}

const AvatarGroup = ({ memberAvatars, memberCount }: { 
  memberAvatars: Workspace['memberAvatars'], 
  memberCount: number 
}) => {
  const displayAvatars = memberAvatars?.slice(0, 3) || []
  const remainingCount = Math.max(0, memberCount - displayAvatars.length)

  return (
    <div className="flex items-center -space-x-2">
      {displayAvatars.map((member) => (
        <Avatar key={member.id} className="w-6 h-6 border-2 border-white">
          <AvatarImage 
            src={member.avatar_url || ''} 
            alt={member.full_name}
            className="object-cover"
          />
          <AvatarFallback className="text-xs bg-neutral-100 text-neutral-600">
            {member.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      ))}
      {remainingCount > 0 && (
        <div className="flex items-center justify-center w-6 h-6 text-xs font-medium text-neutral-600 bg-neutral-100 border-2 border-white rounded-full">
          +{remainingCount}
        </div>
      )}
    </div>
  )
}

export function WorkspaceSwitcher({ 
  currentWorkspaceName = "BB8 Team",
}: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    const fetchWorkspaceData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/user/organization-status')
        if (!response.ok) throw new Error('Failed to fetch workspace data')
        
        const data = await response.json()
        setWorkspaces(data.userWorkspaces || [])
        setPendingInvitations(data.pendingInvitations || [])
        
        console.log('Available workspaces:', data.userWorkspaces)
        console.log('Member avatars for each workspace:', data.userWorkspaces?.map(ws => ({ 
          name: ws.name, 
          memberAvatars: ws.memberAvatars,
          memberCount: ws.memberCount 
        })))
        
        // Get current organization ID from the current organization API
        try {
          const currentOrgResponse = await fetch('/api/user/current-organization')
          if (currentOrgResponse.ok) {
            const currentOrgData = await currentOrgResponse.json()
            console.log('Current organization from API:', currentOrgData)
            setCurrentWorkspaceId(currentOrgData.organizationId)
            console.log('✅ Set current workspace ID from API:', currentOrgData.organizationId)
          } else {
            console.warn('Failed to get current organization, falling back to name matching')
            // Fallback to name matching
            const currentWorkspace = data.userWorkspaces?.find(ws => ws.name === currentWorkspaceName)
            if (currentWorkspace) {
              setCurrentWorkspaceId(currentWorkspace.id)
            } else if (data.userWorkspaces && data.userWorkspaces.length > 0) {
              setCurrentWorkspaceId(data.userWorkspaces[0].id)
            }
          }
        } catch (error) {
          console.error('Error getting current organization:', error)
          // Fallback to name matching
          const currentWorkspace = data.userWorkspaces?.find(ws => ws.name === currentWorkspaceName)
          if (currentWorkspace) {
            setCurrentWorkspaceId(currentWorkspace.id)
          } else if (data.userWorkspaces && data.userWorkspaces.length > 0) {
            setCurrentWorkspaceId(data.userWorkspaces[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch workspace data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchWorkspaceData()
  }, [currentWorkspaceName])

  const handleEnterWorkspace = async (workspaceId: string) => {
    try {
      console.log('Switching to workspace ID:', workspaceId)
      
      const response = await fetch('/api/workspace/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId: workspaceId })
      })

      const responseData = await response.json()
      console.log('Switch workspace response:', responseData)

      if (response.ok) {
        setIsOpen(false)
        // Redirect to dashboard of the new workspace
        window.location.href = '/dashboard'
      } else {
        console.error('Failed to switch workspace:', responseData)
      }
    } catch (error) {
      console.error('Error switching workspace:', error)
    }
  }

  const handleAcceptInvitation = async (token: string) => {
    try {
      console.log('🎫 Accepting invitation via API:', token)
      
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Failed to accept invitation:', result.error)
        return
      }

      console.log('✅ Invitation accepted successfully:', result)
      
      // Switch to the new workspace they just joined
      if (result.organization?.id) {
        console.log('🔄 Switching to newly joined workspace:', result.organization.id)
        await handleEnterWorkspace(result.organization.id)
      } else {
        // Fallback - close dialog and refresh
        setIsOpen(false)
        window.location.href = '/dashboard'
      }
      
    } catch (error) {
      console.error('Error accepting invitation:', error)
    }
  }

  const handleCreateNewWorkspace = () => {
    router.push('/onboarding/create-workspace')
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate text-xs">Workspace</span>
                <span className="truncate font-medium">{currentWorkspaceName}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DialogTrigger>
          
          <DialogContent className="max-w-[720px] p-6" showCloseButton={false}>
            <DialogTitle className="sr-only">Switch workspace</DialogTitle>
            <div className="space-y-6">
              {/* Your workspaces section */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-neutral-950 leading-7">
                  Your workspaces
                </h2>
                
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neutral-900"></div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {workspaces.map((workspace) => {
                      const isCurrent = workspace.id === currentWorkspaceId
                      
                      return (
                        <div 
                          key={workspace.id}
                          className={`w-full max-w-[576px] rounded-[14px] border border-neutral-200 p-6 ${
                            isCurrent ? 'bg-white' : 'bg-neutral-100'
                          }`}
                        >
                          <div className="flex items-end justify-between gap-8">
                            <div className="flex-1 space-y-6">
                              <div className="space-y-2.5">
                                <h3 className="text-2xl font-semibold text-neutral-950 leading-8">
                                  {workspace.name}
                                </h3>
                                <div className="flex items-center -space-x-2">
{/* Debug logging */}
                                  {(() => {
                                    console.log(`🔍 Workspace ${workspace.name}:`, {
                                      memberCount: workspace.memberCount,
                                      memberAvatars: workspace.memberAvatars,
                                      memberAvatarsLength: workspace.memberAvatars?.length
                                    })
                                    return null
                                  })()}
                                  <AvatarGroup memberAvatars={workspace.memberAvatars} memberCount={workspace.memberCount} />
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end justify-between h-full">
                              {isCurrent && (
                                <Badge 
                                  variant="outline" 
                                  className="mb-2 text-xs font-semibold text-neutral-950 bg-white border-neutral-200 flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  Current workspace
                                </Badge>
                              )}
                              <Button 
                                className={isCurrent 
                                  ? "bg-neutral-900 text-neutral-50 hover:bg-neutral-800 h-9" 
                                  : "bg-white text-neutral-950 border border-neutral-200 hover:bg-neutral-50 h-9"
                                }
                                onClick={() => isCurrent ? setIsOpen(false) : handleEnterWorkspace(workspace.id)}
                              >
                                {isCurrent ? "Back to workspace" : "Enter workspace"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Invitations section */}
              {pendingInvitations.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-neutral-950 leading-7">
                    Invitations
                  </h2>
                  <div className="space-y-5">
                    {pendingInvitations.map((invitation) => (
                      <div 
                        key={invitation.id}
                        className="w-full max-w-[576px] bg-violet-100 rounded-[14px] border border-neutral-200 p-6"
                      >
                        <div className="flex items-start justify-between gap-8">
                          <div className="flex-1 space-y-6">
                            <div className="flex items-center gap-2.5">
                              <h3 className="text-2xl font-semibold text-neutral-950 leading-8 flex-1">
                                {invitation.organizationName}
                              </h3>
                            </div>
                          </div>
                          <div className="flex flex-col items-start justify-start">
                            <Button 
                              className="bg-white text-neutral-950 border border-neutral-200 hover:bg-neutral-50 h-9"
                              onClick={() => handleAcceptInvitation(invitation.token)}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              Accept invitation
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Separator */}
              <div className="w-full h-px bg-neutral-200" />

              {/* Footer */}
              <div className="flex items-center justify-between gap-2">
                <Button 
                  variant="outline" 
                  className="bg-white text-neutral-950 border border-neutral-200 hover:bg-neutral-50 h-9"
                  onClick={handleCreateNewWorkspace}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New workspace
                </Button>
                <Button 
                  variant="outline" 
                  className="bg-white text-neutral-950 border border-neutral-200 hover:bg-neutral-50 h-9"
                  onClick={() => setIsOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}