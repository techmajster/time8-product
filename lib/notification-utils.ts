import { createClient } from '@/lib/supabase/server'

interface NotificationPreferences {
  email_notifications: boolean
  leave_request_reminders: boolean
  team_leave_notifications: boolean
  weekly_summary: boolean
}

export async function getUserNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('email_notifications, leave_request_reminders, team_leave_notifications, weekly_summary')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.warn('Could not fetch user notification preferences:', error.message)
      // Return default preferences if table doesn't exist or user not found
      return {
        email_notifications: true,
        leave_request_reminders: true,
        team_leave_notifications: true,
        weekly_summary: true
      }
    }

    return data
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return null
  }
}

export async function sendNotificationIfEnabled(
  userId: string,
  notificationType: keyof NotificationPreferences,
  emailData: any
) {
  const preferences = await getUserNotificationPreferences(userId)
  
  if (!preferences || !preferences.email_notifications || !preferences[notificationType]) {
    console.log(`Notification skipped for user ${userId} - preference disabled`)
    return { success: false, reason: 'User preference disabled' }
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/send-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData)
    })

    if (response.ok) {
      return { success: true }
    } else {
      const error = await response.json()
      return { success: false, error: error.message || 'Failed to send notification' }
    }
  } catch (error) {
    console.error('Error sending notification:', error)
    return { success: false, error: 'Network error' }
  }
}

export async function notifyLeaveRequestStatusChange(
  leaveRequestId: string,
  status: 'pending' | 'approved' | 'rejected'
) {
  const supabase = await createClient()

  try {
    // Get leave request details with employee and organization info
    const { data: leaveRequest, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        profiles!inner(full_name, email, organization_id),
        organizations!inner(name)
      `)
      .eq('id', leaveRequestId)
      .single()

    if (error || !leaveRequest) {
      console.error('Could not fetch leave request:', error)
      return
    }

    // Send notification to the employee who made the request
    await sendNotificationIfEnabled(
      leaveRequest.user_id,
      'email_notifications',
      {
        type: 'leave_request',
        to: leaveRequest.profiles.email,
        employeeName: leaveRequest.profiles.full_name,
        leaveType: leaveRequest.leave_type,
        startDate: new Date(leaveRequest.start_date).toLocaleDateString('pl-PL'),
        endDate: new Date(leaveRequest.end_date).toLocaleDateString('pl-PL'),
        status,
        organizationName: leaveRequest.organizations.name,
        requestId: leaveRequestId
      }
    )

    // If approved, notify team members about the upcoming leave
    if (status === 'approved') {
      await notifyTeamAboutLeave(leaveRequest)
    }

  } catch (error) {
    console.error('Error sending leave request notification:', error)
  }
}

async function notifyTeamAboutLeave(leaveRequest: any) {
  const supabase = await createClient()

  try {
    // Get all team members in the same organization
    const { data: teamMembers, error } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('organization_id', leaveRequest.profiles.organization_id)
      .neq('id', leaveRequest.user_id) // Exclude the person taking leave

    if (error || !teamMembers) {
      console.error('Could not fetch team members:', error)
      return
    }

    // Send notification to each team member who has team notifications enabled
    const notifications = teamMembers.map((member: any) =>
      sendNotificationIfEnabled(
        member.id,
        'team_leave_notifications',
        {
          type: 'team_leave',
          to: member.email,
          employeeName: leaveRequest.profiles.full_name,
          leaveType: leaveRequest.leave_type,
          startDate: new Date(leaveRequest.start_date).toLocaleDateString('pl-PL'),
          endDate: new Date(leaveRequest.end_date).toLocaleDateString('pl-PL'),
          organizationName: leaveRequest.organizations.name
        }
      )
    )

    await Promise.all(notifications)
  } catch (error) {
    console.error('Error notifying team about leave:', error)
  }
}

export async function sendPendingLeaveReminders() {
  const supabase = await createClient()

  try {
    // Get all managers and admins with pending leave requests to review
    const { data: managersWithPending, error } = await supabase
      .from('profiles')
      .select(`
        id, email, full_name, organization_id,
        organizations!inner(name)
      `)
      .in('role', ['admin', 'manager'])

    if (error || !managersWithPending) {
      console.error('Could not fetch managers:', error)
      return
    }

    for (const manager of managersWithPending) {
      // Get pending requests for this manager's organization
      const { data: pendingRequests, error: requestsError } = await supabase
        .from('leave_requests')
        .select(`
          id, leave_type, start_date, created_at,
          profiles!inner(full_name, organization_id)
        `)
        .eq('status', 'pending')
        .eq('profiles.organization_id', manager.organization_id)

      if (requestsError || !pendingRequests || pendingRequests.length === 0) {
        continue
      }

      await sendNotificationIfEnabled(
        manager.id,
        'leave_request_reminders',
        {
          type: 'leave_reminder',
          to: manager.email,
          pendingRequestsCount: pendingRequests.length,
          organizationName: (manager as any).organizations.name,
          requests: pendingRequests.map((req: any) => ({
            employeeName: req.profiles.full_name,
            leaveType: req.leave_type,
            startDate: new Date(req.start_date).toLocaleDateString('pl-PL'),
            requestDate: new Date(req.created_at).toLocaleDateString('pl-PL')
          }))
        }
      )
    }
  } catch (error) {
    console.error('Error sending pending leave reminders:', error)
  }
}

export async function sendWeeklySummaries() {
  const supabase = await createClient()

  try {
    // Get all users who want weekly summaries
    const { data: users, error } = await supabase
      .from('user_settings')
      .select(`
        user_id,
        profiles!inner(email, full_name, organization_id, role),
        organizations!inner(name)
      `)
      .eq('weekly_summary', true)
      .eq('email_notifications', true)

    if (error || !users) {
      console.error('Could not fetch users for weekly summary:', error)
      return
    }

    const today = new Date()
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()))
    const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6))

    for (const user of users) {
      // Get leave data for this user's organization
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select(`
          id, leave_type, start_date, end_date, status,
          profiles!inner(full_name, organization_id)
        `)
        .eq('profiles.organization_id', (user as any).profiles.organization_id)
        .gte('start_date', weekStart.toISOString())
        .lte('end_date', weekEnd.toISOString())

      if (leaveError) {
        console.error('Could not fetch leave data:', leaveError)
        continue
      }

      const totalLeaves = leaveData?.filter((l: any) => l.status === 'approved').length || 0
      const pendingRequests = leaveData?.filter((l: any) => l.status === 'pending').length || 0
      const upcomingLeaves = leaveData?.filter((l: any) => l.status === 'approved').map((leave: any) => ({
        employeeName: leave.profiles.full_name,
        leaveType: leave.leave_type,
        startDate: new Date(leave.start_date).toLocaleDateString('pl-PL'),
        endDate: new Date(leave.end_date).toLocaleDateString('pl-PL')
      })) || []

      await sendNotificationIfEnabled(
        (user as any).user_id,
        'weekly_summary',
        {
          type: 'weekly_summary',
          to: (user as any).profiles.email,
          organizationName: (user as any).organizations.name,
          weekStart: weekStart.toLocaleDateString('pl-PL'),
          weekEnd: weekEnd.toLocaleDateString('pl-PL'),
          totalLeaves,
          pendingRequests,
          upcomingLeaves
        }
      )
    }
  } catch (error) {
    console.error('Error sending weekly summaries:', error)
  }
} 