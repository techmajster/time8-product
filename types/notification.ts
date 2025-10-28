export type NotificationType =
  | 'leave_request_approved'
  | 'leave_request_rejected'
  | 'leave_request_pending'

export interface NotificationMetadata {
  leave_type?: string
  start_date?: string
  end_date?: string
  days_requested?: number
  employee_name?: string
  employee_id?: string
  status?: string
}

export interface Notification {
  id: string
  user_id: string
  organization_id: string
  type: NotificationType
  title: string
  message: string | null
  metadata: NotificationMetadata
  is_read: boolean
  read_at: string | null
  related_leave_request_id: string | null
  created_at: string
  updated_at: string
}

export interface NotificationsResponse {
  notifications: Notification[]
  unread_count: number
  total_count: number
  has_more: boolean
}

export interface MarkReadResponse {
  success: boolean
  notification: {
    id: string
    is_read: boolean
    read_at: string | null
    updated_at: string
  }
}

export interface MarkAllReadResponse {
  success: boolean
  updated_count: number
}
