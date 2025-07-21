# Email Notifications Setup Guide

## 🎯 Overview

Your leave management system now supports comprehensive email notifications including:

- ✅ **Zaproszenia email** - Team invitation emails
- ✅ **Powiadomienia o wnioskach** - Leave request status notifications  
- ✅ **Powiadomienia o zespole** - Team leave notifications
- ✅ **Przypomnienia** - Pending request reminders for managers
- ✅ **Cotygodniowe podsumowanie** - Weekly leave summaries

## 📧 Email Configuration

### 1. Environment Variables

Add these to your `.env.local` file:

```bash
# Email Configuration (Time8 Smart Delivery)
RESEND_API_KEY=re_your_actual_api_key_here

# Critical emails (invitations, password resets) - High deliverability
FROM_EMAIL=onboarding@resend.dev

# Brand emails (leave notifications) - Building Time8 reputation  
BRAND_EMAIL=noreply@time8.io

# General notifications - Balance reliability and branding
NOTIFICATION_EMAIL=notifications@time8.io

# Alternative Time8 email addresses you can use:
# BRAND_EMAIL=system@time8.io
# BRAND_EMAIL=hello@time8.io  
# NOTIFICATION_EMAIL=team@time8.io

# Optional: Cron job security
CRON_SECRET=your-secret-cron-key
```

### 2. Smart Email Delivery Strategy

The system now uses intelligent FROM_EMAIL selection:

**🔴 Critical Emails (High Deliverability):**
- Team invitations
- Employee verification 
- Password resets
- Account setup
- Uses: `FROM_EMAIL` (onboarding@resend.dev)

**🔵 Brand Emails (Building Reputation):**
- Test emails
- General communications
- Uses: `BRAND_EMAIL` (noreply@time8.io)

**🟡 Notification Emails (Balanced Approach):**
- Leave request updates
- Team notifications
- Reminders & summaries
- Uses: `NOTIFICATION_EMAIL` (notifications@time8.io)

### 3. Domain Reputation Building

**Phase 1 (Week 1):** Critical emails use proven domain
```bash
FROM_EMAIL=onboarding@resend.dev
BRAND_EMAIL=noreply@time8.io        # Low volume testing
NOTIFICATION_EMAIL=notifications@time8.io
```

**Phase 2 (Week 2-3):** Increase Time8 volume
```bash  
FROM_EMAIL=onboarding@resend.dev
BRAND_EMAIL=noreply@time8.io        # Medium volume
NOTIFICATION_EMAIL=noreply@time8.io # Switch to Time8
```

**Phase 3 (Week 4+):** Full Time8 branding
```bash
FROM_EMAIL=noreply@time8.io         # All emails use Time8
BRAND_EMAIL=noreply@time8.io
NOTIFICATION_EMAIL=notifications@time8.io
```

### 4. DMARC Configuration (Recommended)

To improve deliverability for `time8.io`, add this DMARC record:

**Add to OVH DNS:**
```
Type: TXT
Subdomain: _dmarc
Target: v=DMARC1; p=quarantine; pct=25; rua=mailto:dmarc@time8.io
TTL: 3600
```

**What this does:**
- `p=quarantine` - Put questionable emails in spam (safer than reject for new domains)
- `pct=25` - Apply policy to 25% of emails (gradual rollout)
- `rua=mailto:dmarc@time8.io` - Send weekly reports to monitor performance

**Gradual DMARC Rollout:**
```bash
# Week 1: Monitor mode
v=DMARC1; p=none; pct=100; rua=mailto:dmarc@time8.io

# Week 2-3: Quarantine 25%
v=DMARC1; p=quarantine; pct=25; rua=mailto:dmarc@time8.io

# Week 4+: Full quarantine
v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@time8.io
```

### 5. Resend Setup

1. **Sign up**: Go to [resend.com](https://resend.com) (3,000 free emails/month)
2. **Create API key**: In dashboard → API Keys → Create new
3. **Domain setup**: Add `time8.io` domain and verify DNS
4. **Test**: Visit `/admin/test-email` to verify configuration

## 📋 User Settings Database

Users can control their notification preferences. Create the `user_settings` table:

```sql
CREATE TABLE user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  email_notifications BOOLEAN DEFAULT true,
  leave_request_reminders BOOLEAN DEFAULT true,
  team_leave_notifications BOOLEAN DEFAULT true,
  weekly_summary BOOLEAN DEFAULT true,
  dark_mode BOOLEAN DEFAULT false,
  timezone VARCHAR(50) DEFAULT 'Europe/Warsaw',
  language VARCHAR(10) DEFAULT 'pl',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id);
```

## 🔄 Automatic Notifications

### Triggered Notifications

These are sent automatically when events occur:

1. **New Leave Request** → Notifies managers
2. **Request Approved/Rejected** → Notifies employee + team (if approved)
3. **Team Member on Leave** → Notifies all team members

### Scheduled Notifications

Set up cron jobs for periodic notifications:

#### Daily Reminders (9 AM)
```bash
# Cron: 0 9 * * *
curl -X POST https://your-app.vercel.app/api/cron/send-reminders \
  -H "Authorization: Bearer your-cron-secret"
```

#### Weekly Summaries (Monday 9 AM)
```bash
# Cron: 0 9 * * 1
curl -X POST https://your-app.vercel.app/api/cron/send-weekly-summary \
  -H "Authorization: Bearer your-cron-secret"
```

### Vercel Cron Jobs

If using Vercel, add `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/send-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/send-weekly-summary", 
      "schedule": "0 9 * * 1"
    }
  ]
}
```

### GitHub Actions Alternative

Create `.github/workflows/email-notifications.yml`:

```yaml
name: Email Notifications
on:
  schedule:
    - cron: '0 9 * * *'    # Daily reminders at 9 AM UTC
    - cron: '0 9 * * 1'    # Weekly summary on Monday 9 AM UTC

jobs:
  send-notifications:
    runs-on: ubuntu-latest
    steps:
      - name: Send Daily Reminders
        if: github.event.schedule == '0 9 * * *'
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/send-reminders \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
      
      - name: Send Weekly Summary
        if: github.event.schedule == '0 9 * * 1'
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/send-weekly-summary \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## 🎨 Email Templates

The system includes beautiful, responsive email templates with:

- **Branded design** using your app's color scheme
- **Polish language** content
- **Mobile-friendly** responsive layout
- **Status badges** and proper formatting
- **Call-to-action buttons** for easy navigation

### Template Types

1. **Invitation Email** - For team invitations
2. **Leave Request Notification** - Status changes
3. **Team Leave Notification** - Upcoming team leaves
4. **Pending Reminders** - For managers
5. **Weekly Summary** - Leave overview

## 🔧 API Endpoints

### Send Notifications
```
POST /api/send-notification
```

Payload examples:
```json
{
  "type": "leave_request",
  "to": "user@example.com",
  "employeeName": "Jan Kowalski",
  "leaveType": "Urlop wypoczynkowy",
  "startDate": "15.01.2024",
  "endDate": "19.01.2024", 
  "status": "approved",
  "organizationName": "Firma ABC",
  "requestId": "123"
}

{
  "type": "team_leave",
  "to": "team@example.com",
  "employeeName": "Anna Nowak",
  "leaveType": "Urlop macierzyński",
  "startDate": "01.02.2024",
  "endDate": "31.05.2024",
  "organizationName": "Firma ABC"
}
```

### Manual Triggers
```
GET /api/cron/send-reminders          # Test reminders
GET /api/cron/send-weekly-summary     # Test weekly summary
```

## 👥 User Experience

### User Settings
Users can control notifications in their profile:
- Navigate to `/profile`
- Toggle notification preferences
- Changes apply immediately

### Manager Experience
Managers receive:
- **Daily reminders** about pending requests
- **New request notifications** when submitted
- **Team leave notifications** when approved

### Employee Experience
Employees receive:
- **Status updates** on their requests
- **Team notifications** about colleagues' leaves
- **Weekly summaries** of upcoming leaves

## 🐛 Troubleshooting

### Email Not Sending
1. Check `/admin/test-email` for configuration issues
2. Verify `RESEND_API_KEY` and `FROM_EMAIL` are set
3. Check Resend dashboard for delivery status
4. Ensure domain is verified (if using custom domain)

### Notifications Not Triggered
1. Check browser console for API errors
2. Verify database triggers are working
3. Check server logs for error messages
4. Ensure `user_settings` table exists

### Cron Jobs Not Running
1. Verify cron secret matches environment variable
2. Check deployment platform cron configuration
3. Test manual triggers via GET endpoints
4. Monitor logs during scheduled times

## 📊 Monitoring

Monitor email delivery through:
- **Resend Dashboard** - Delivery status, bounces, opens
- **Application Logs** - API responses and errors  
- **Manual Testing** - Use test endpoints regularly

## 🔒 Security

- **Cron endpoints** require authorization header
- **User preferences** respect RLS policies
- **Email content** doesn't expose sensitive data
- **Rate limiting** handled by Resend

## 📈 Scaling

The system handles:
- **Multiple organizations** with isolated notifications
- **High volume** with Resend's infrastructure
- **Async processing** to avoid blocking API responses
- **Graceful failures** - email errors don't break core functionality

Your email notification system is now fully configured and ready to improve your leave management workflow! 🚀 