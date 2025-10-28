# Spec Requirements Document

> Spec: In-App Notifications System
> Created: 2025-10-28
> Status: Planning

## Overview

Implement a comprehensive in-app notification system that displays real-time updates to users when their leave requests are approved or rejected, and notifies managers/admins when new leave requests are submitted. The system will feature a notification bell icon in the application header that opens a slide-out sheet displaying all notifications, with the ability to navigate to detailed views and mark notifications as read.

## User Stories

### Employee Receives Leave Request Updates

As an employee, I want to receive in-app notifications when my leave requests are approved or rejected, so that I can immediately see the status of my requests without checking my email or refreshing the leave requests page.

**Workflow:** Employee submits a leave request. Manager reviews and approves/rejects it. Employee sees a red badge on the notification bell icon showing unread count. They click the bell, see "Urlop zaakceptowany" or "Urlop odrzucony" notification with details. They click "Szczegóły" button and are taken directly to the leave request detail view. The notification is automatically marked as read.

### Manager Receives New Request Notifications

As a manager or admin, I want to be notified immediately when team members submit new leave requests, so that I can review and respond to requests promptly without constantly checking the leave requests page.

**Workflow:** Employee submits a new leave request. Manager sees notification bell badge increment. They open the notification sheet and see "Nowy wniosek urlopowy" with employee name and dates. They click "Szczegóły" to review the full request and approve/reject it. Notification is marked as read.

### User Manages Notification History

As any user, I want to see my notification history and distinguish between read and unread notifications, so that I can track all important updates and easily identify which ones I haven't reviewed yet.

**Workflow:** User opens notification sheet. Unread notifications appear with blue background (blue-50), read notifications have white background. User can click "Szczegóły" on any notification to view details. User can close the sheet with "Zamknij" button.

## Spec Scope

1. **Database Schema** - Create `notifications` table with user/organization relationships, notification types, read status, and metadata storage

2. **Automatic Notification Creation** - Database triggers that automatically create notifications when leave request status changes (approved/rejected) or new requests are submitted

3. **API Endpoints** - RESTful API routes for fetching notifications, marking individual notifications as read, and marking all notifications as read

4. **Notification Bell Component** - Bell icon in application header with red badge showing unread count, opens notification sheet on click

5. **Notification Sheet UI** - Slide-out sheet (using shadcn Sheet component) displaying scrollable list of notifications with proper styling matching Figma design

6. **Notification Navigation** - "Szczegóły" button on each notification that navigates to the related leave request detail view and marks notification as read

7. **Real-time Updates** - Notification count updates when new notifications arrive (polling or Supabase realtime)

## Out of Scope

- **Email Notifications** - Already implemented in existing system (`lib/notification-utils.ts`), no changes needed
- **Push Notifications** - Browser/mobile push notifications not included in this spec
- **Notification Settings** - User preferences for which notifications to receive (can be added in future spec)
- **Notification Sounds** - Audio alerts when notifications arrive
- **Rich Media** - Images or attachments in notifications
- **Notification Categories/Filtering** - Ability to filter notifications by type or date
- **Notification Deletion** - Ability to permanently delete notifications (they remain in history)
- **Read Receipts** - Tracking when notifications were read for analytics

## Expected Deliverable

1. **Working Notification Bell** - Bell icon in application header showing accurate unread count that updates in real-time

2. **Functional Notification Sheet** - Sheet component that opens from the right side, displays all user notifications with proper styling (blue background for unread, white for read), and allows navigation to leave request details

3. **Database Integration** - Notifications automatically created when leave requests are approved, rejected, or newly submitted, stored with proper multi-tenant isolation via RLS policies

4. **Full User Flow** - Employee can receive and view notifications about their leave request status changes. Managers/admins can receive and view notifications about new leave requests. All users can click through to detailed views and see notifications marked as read.

5. **Performance** - Notification queries optimized with proper indexes, notification count displays without lag, sheet opens instantly with smooth animation
