'use client'

interface WorkspaceAvatarProps {
  workspaceName: string
  memberCount: number
  memberAvatars?: Array<{
    id: string
    avatar_url: string | null
    full_name: string
  }>
  size?: 'sm' | 'md' | 'lg'
  showMemberCount?: boolean
}

export function WorkspaceAvatar({ 
  workspaceName, 
  memberCount, 
  memberAvatars = [],
  size = 'md',
  showMemberCount = true 
}: WorkspaceAvatarProps) {
  // Extract initials from workspace name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'w-8 h-8',
      text: 'text-xs',
      memberAvatar: 'w-5 h-5',
      memberSpacing: '-ml-2'
    },
    md: {
      container: 'w-10 h-10',
      text: 'text-sm',
      memberAvatar: 'w-6 h-6',
      memberSpacing: '-ml-2'
    },
    lg: {
      container: 'w-12 h-12',
      text: 'text-base',
      memberAvatar: 'w-7 h-7',
      memberSpacing: '-ml-2'
    }
  }

  const config = sizeConfig[size]

  // Show member avatars if provided, otherwise show workspace initials
  if (memberAvatars.length > 0) {
    const displayAvatars = memberAvatars.slice(0, 3) // Show max 3 avatars
    const remainingCount = Math.max(0, memberCount - 3)

    return (
      <div className="flex items-center">
        <div className="flex items-center">
          {displayAvatars.map((member, index) => (
            <div
              key={member.id}
              className={`${config.memberAvatar} rounded-full bg-gray-200 border-2 border-white flex items-center justify-center ${
                index > 0 ? config.memberSpacing : ''
              }`}
              style={{ zIndex: displayAvatars.length - index }}
            >
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={member.full_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-xs font-medium text-gray-600">
                  {member.full_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          ))}
          {remainingCount > 0 && (
            <div
              className={`${config.memberAvatar} rounded-full bg-gray-100 border-2 border-white flex items-center justify-center ${config.memberSpacing}`}
              style={{ zIndex: 0 }}
            >
              <span className="text-xs font-medium text-gray-500">
                +{remainingCount}
              </span>
            </div>
          )}
        </div>
        {showMemberCount && (
          <span className="ml-2 text-sm text-gray-500">
            {memberCount} member{memberCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    )
  }

  // Default workspace initial avatar
  return (
    <div className={`${config.container} rounded-full bg-gray-100 flex items-center justify-center`}>
      <span className={`${config.text} font-semibold text-gray-700`}>
        {getInitials(workspaceName)}
      </span>
    </div>
  )
}