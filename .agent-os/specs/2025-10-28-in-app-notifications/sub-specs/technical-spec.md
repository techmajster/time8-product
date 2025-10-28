# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-10-28-in-app-notifications/spec.md

## Overview

Implement UI components for the in-app notification system using existing shadcn/ui components (Sheet, Badge), lucide-react icons, and integrate with the notification API endpoints. The notification bell will be placed in the application header and open a slide-out sheet displaying notifications with proper styling per Figma design.

## Technology Stack

- **UI Framework**: React with Next.js App Router
- **Component Library**: shadcn/ui (Sheet, Badge components)
- **Icons**: lucide-react (Bell, Check, X, Info icons)
- **Styling**: TailwindCSS
- **State Management**: React hooks (useState, useEffect)
- **Data Fetching**: Supabase client with server/client pattern
- **TypeScript**: Full type safety

## Component Architecture

### 1. NotificationBell Component

**Location**: `components/notifications/notification-bell.tsx`

**Purpose**: Bell icon button with unread count badge that opens the notification sheet

**Props**:
```typescript
interface NotificationBellProps {
  // No props - component manages own state
}
```

**State**:
```typescript
const [isOpen, setIsOpen] = useState(false)
const [unreadCount, setUnreadCount] = useState(0)
const [isLoading, setIsLoading] = useState(false)
```

**Functionality**:
- Display bell icon from lucide-react
- Show red badge with unread count if > 0
- Fetch unread count on component mount
- Refresh unread count every 30 seconds (polling)
- Open notification sheet on click
- Update unread count when sheet closes

**Key Features**:
- Polling interval for real-time updates (configurable: 30s default)
- Optimistic UI updates (immediate badge update when marking as read)
- Error handling for failed API calls
- Loading state during fetch

**Component Structure**:
```tsx
<div className="relative">
  <Button
    variant="ghost"
    size="icon"
    onClick={() => setIsOpen(true)}
    className="relative"
  >
    <Bell className="h-5 w-5" />
    {unreadCount > 0 && (
      <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1">
        {unreadCount > 99 ? '99+' : unreadCount}
      </Badge>
    )}
  </Button>

  <NotificationSheet
    isOpen={isOpen}
    onClose={() => setIsOpen(false)}
    onNotificationRead={handleNotificationRead}
  />
</div>
```

---

### 2. NotificationSheet Component

**Location**: `components/notifications/notification-sheet.tsx`

**Purpose**: Slide-out sheet displaying all notifications

**Props**:
```typescript
interface NotificationSheetProps {
  isOpen: boolean
  onClose: () => void
  onNotificationRead: (notificationId: string) => void
}
```

**State**:
```typescript
const [notifications, setNotifications] = useState<Notification[]>([])
const [unreadCount, setUnreadCount] = useState(0)
const [isLoading, setIsLoading] = useState(false)
const [hasMore, setHasMore] = useState(false)
```

**Functionality**:
- Fetch notifications when sheet opens
- Display scrollable list of notifications
- Show loading skeleton during fetch
- Handle empty state (no notifications)
- Support pagination (load more on scroll)
- Mark all as read button

**Component Structure** (based on Figma design):
```tsx
<Sheet open={isOpen} onOpenChange={onClose}>
  <SheetContent side="right" className="w-full sm:max-w-[560px]">
    {/* Header */}
    <div className="flex items-center gap-2 mb-6">
      <h2 className="text-xl font-semibold">Powiadomienia</h2>
      {unreadCount > 0 && (
        <Badge variant="destructive" className="h-4 min-w-5 px-1 text-xs">
          {unreadCount}
        </Badge>
      )}
    </div>

    {/* Notification List */}
    <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-200px)]">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRead={() => handleNotificationRead(notification.id)}
        />
      ))}
    </div>

    {/* Footer */}
    <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
      <Button variant="outline" onClick={onClose}>
        Zamknij
      </Button>
    </div>
  </SheetContent>
</Sheet>
```

**API Integration**:
```typescript
const fetchNotifications = async () => {
  setIsLoading(true)
  try {
    const response = await fetch('/api/notifications?limit=20')
    const data = await response.json()
    setNotifications(data.notifications)
    setUnreadCount(data.unread_count)
    setHasMore(data.has_more)
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
  } finally {
    setIsLoading(false)
  }
}

useEffect(() => {
  if (isOpen) {
    fetchNotifications()
  }
}, [isOpen])
```

---

### 3. NotificationItem Component

**Location**: `components/notifications/notification-item.tsx`

**Purpose**: Individual notification card with icon, title, message, and action button

**Props**:
```typescript
interface NotificationItemProps {
  notification: Notification
  onRead: () => void
}
```

**Icon Mapping**:
```typescript
const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'leave_request_approved':
      return <Check className="w-5 h-5" />
    case 'leave_request_rejected':
      return <X className="w-5 h-5" />
    case 'leave_request_pending':
      return <Info className="w-5 h-5" />
  }
}
```

**Component Structure** (matching Figma design):
```tsx
<div
  className={cn(
    "flex gap-2 items-start p-4 rounded-md border",
    notification.is_read
      ? "bg-white border-border"  // Read: white background
      : "bg-blue-50 border-border" // Unread: blue-50 background
  )}
>
  {/* Icon */}
  <div className="shrink-0 w-5 h-5">
    {getNotificationIcon(notification.type)}
  </div>

  {/* Content */}
  <div className="flex-1 min-w-0">
    <p className="font-medium text-sm text-popover-foreground">
      {notification.title}
    </p>
    <p className="text-sm text-muted-foreground mt-0.5">
      {notification.message}
    </p>
  </div>

  {/* Action Button */}
  <Button
    variant="ghost"
    size="sm"
    className="shrink-0 h-8 px-3"
    onClick={handleDetailsClick}
  >
    Szczegóły
  </Button>
</div>
```

**Navigation Logic**:
```typescript
const router = useRouter()

const handleDetailsClick = async () => {
  // Mark as read (optimistic UI)
  if (!notification.is_read) {
    await fetch(`/api/notifications/${notification.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_read: true })
    })
    onRead()
  }

  // Navigate to leave request details
  if (notification.related_leave_request_id) {
    // Open LeaveRequestDetailsSheet via URL parameter or trigger function
    router.push(`/leave-requests?detail=${notification.related_leave_request_id}`)
    // Or use a global state/context to trigger the sheet
  }
}
```

---

## Integration Points

### 1. Add NotificationBell to App Layout Header

**File**: `components/app-layout-client.tsx`

**Location**: Line ~213 (inside header, after breadcrumbs)

**Modification**:
```tsx
<header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-t-xl">
  <div className="flex items-center gap-2 px-4 flex-1">
    <SidebarTrigger className="-ml-1" />
    <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
    <Breadcrumb>
      {/* ... existing breadcrumb code ... */}
    </Breadcrumb>
  </div>

  {/* ADD NOTIFICATION BELL HERE */}
  <div className="flex items-center gap-2 px-4">
    <NotificationBell />
  </div>
</header>
```

### 2. Leave Request Details Integration

**Current Flow**: LeaveRequestDetailsSheet opens via query parameter or direct trigger

**Notification Integration**:
- When user clicks "Szczegóły" on notification
- Mark notification as read via API
- Navigate to leave requests page with detail parameter
- LeaveRequestDetailsSheet opens automatically
- User sees full leave request details

**Alternative Approach** (using global state):
```typescript
// Create NotificationContext
const NotificationContext = createContext({
  openLeaveRequestDetail: (leaveRequestId: string) => {}
})

// In NotificationItem, use context to trigger sheet
const { openLeaveRequestDetail } = useContext(NotificationContext)
openLeaveRequestDetail(notification.related_leave_request_id)
```

---

## Styling Guidelines (Figma Design Compliance)

### Notification Sheet
- **Width**: 560px (fixed on desktop)
- **Side**: Right
- **Padding**: 24px
- **Gap between items**: 8px
- **Shadow**: lg (Tailwind default for Sheet)

### Notification Item
- **Unread Background**: `bg-blue-50` (Tailwind: `#eff6ff`)
- **Read Background**: `bg-white`
- **Border**: `border-border` (rgba(2,2,2,0.2))
- **Border Radius**: 8px (`rounded-md`)
- **Padding**: 16px (`p-4`)
- **Gap**: 8px (`gap-2`)

### Badge (Unread Count)
- **Background**: `bg-destructive` (#dc2626)
- **Text Color**: `text-destructive-foreground` (#fef2f2)
- **Font**: Semibold, 12px
- **Border Radius**: Full (`rounded-full`)
- **Min Width**: 20px
- **Height**: 16px
- **Padding**: 4px horizontal

### Typography
- **Header Title**: 20px, font-semibold, leading-7
- **Badge Count**: 12px, font-semibold, leading-4
- **Notification Title**: 14px, font-medium, leading-5
- **Notification Message**: 14px, font-normal, leading-5, text-muted-foreground
- **Button Text**: 12px, font-medium

---

## Real-time Updates Strategy

### Phase 1: Polling (Initial Implementation)
- Poll `/api/notifications` every 30 seconds
- Update unread count in NotificationBell
- Simple, reliable, low complexity
- Minimal server load with proper caching

**Implementation**:
```typescript
useEffect(() => {
  const fetchUnreadCount = async () => {
    const response = await fetch('/api/notifications?unread_only=true&limit=1')
    const data = await response.json()
    setUnreadCount(data.unread_count)
  }

  // Initial fetch
  fetchUnreadCount()

  // Poll every 30 seconds
  const interval = setInterval(fetchUnreadCount, 30000)

  return () => clearInterval(interval)
}, [])
```

### Phase 2: Supabase Realtime (Future Enhancement)
- Subscribe to `notifications` table changes
- Instant updates when new notification created
- More complex setup, requires Supabase Realtime configuration
- Better user experience for high-frequency notifications

**Future Implementation**:
```typescript
const supabase = createClient()

useEffect(() => {
  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        setUnreadCount(prev => prev + 1)
        // Optionally show toast notification
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [userId])
```

---

## Performance Optimizations

### 1. Lazy Loading
- Only fetch notifications when sheet opens
- Don't fetch on component mount (reduces initial page load)

### 2. Pagination
- Load 20 notifications initially
- "Load more" button at bottom of list
- Prevents slow queries for users with 100+ notifications

### 3. Optimistic UI Updates
- Mark notification as read immediately in UI
- Sync with server in background
- Rollback if API call fails

### 4. Debounced Polling
- Stop polling when sheet is open (avoid conflicts)
- Resume polling when sheet closes

### 5. Memoization
- Memoize notification icon component
- Memoize notification item to prevent unnecessary re-renders

```typescript
const NotificationItem = memo(({ notification, onRead }: NotificationItemProps) => {
  // Component implementation
})
```

---

## Error Handling

### Network Errors
```typescript
try {
  const response = await fetch('/api/notifications')
  if (!response.ok) throw new Error('Failed to fetch')
  const data = await response.json()
  setNotifications(data.notifications)
} catch (error) {
  console.error('Notification fetch error:', error)
  toast.error('Nie udało się załadować powiadomień')
}
```

### Empty States
```tsx
{notifications.length === 0 && (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <Bell className="w-12 h-12 text-muted-foreground mb-4" />
    <p className="text-muted-foreground">Brak powiadomień</p>
  </div>
)}
```

### Loading States
```tsx
{isLoading && (
  <div className="space-y-2">
    {[1, 2, 3].map(i => (
      <Skeleton key={i} className="h-24 w-full" />
    ))}
  </div>
)}
```

---

## Accessibility

- **Keyboard Navigation**: Sheet closes on Escape key
- **Focus Management**: Focus trap within open sheet
- **ARIA Labels**: Proper labels for bell button and notification items
- **Screen Reader**: Announce unread count changes

```tsx
<Button
  aria-label={`Powiadomienia, ${unreadCount} nieprzeczytanych`}
  aria-haspopup="dialog"
>
  <Bell />
</Button>
```

---

## Testing Strategy

### Unit Tests
- NotificationBell: Badge display logic, polling interval
- NotificationSheet: Fetch, pagination, mark all as read
- NotificationItem: Icon mapping, navigation, mark as read

### Integration Tests
- Full flow: Create leave request → notification appears → mark as read
- Multi-user: Manager approves → employee sees notification
- Navigation: Click "Szczegóły" → opens correct leave request

### Visual Regression Tests
- Notification sheet matches Figma design
- Unread vs read notification styling
- Badge positioning and size

---

## File Structure

```
components/
└── notifications/
    ├── notification-bell.tsx           # Bell icon with badge
    ├── notification-sheet.tsx          # Slide-out sheet
    └── notification-item.tsx           # Individual notification card

types/
└── notification.ts                     # TypeScript types (from api-spec)

app/
└── api/
    └── notifications/
        ├── route.ts                    # GET notifications
        ├── [id]/route.ts               # PATCH mark as read
        └── mark-all-read/route.ts      # POST mark all as read
```

---

## Dependencies

### Existing (No New Installs Required)
- `@/components/ui/sheet` (shadcn Sheet)
- `@/components/ui/badge` (shadcn Badge)
- `@/components/ui/button` (shadcn Button)
- `lucide-react` (Icons)
- `@/lib/supabase/client` (Supabase client)
- `@/lib/auth-utils` (Authentication)
- `next/navigation` (Router)

### Optional Future Enhancements
- `@supabase/ssr` for realtime subscriptions
- `sonner` for toast notifications (already in project)
