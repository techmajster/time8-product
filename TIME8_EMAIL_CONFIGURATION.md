# Time8 Email Configuration Guide

## 🚀 **Smart Email System Ready!**

Your Time8 email system is now configured with intelligent delivery for maximum reliability and brand building.

## 🌐 **Domain Configuration**

Your Time8 system now supports both production and development domains:

### **Production Domain:** `https://app.time8.io`
### **Development Domain:** `http://localhost:3000`

### **Smart Domain Detection**
The system automatically detects the correct domain:
- **Production**: Uses `https://app.time8.io`
- **Development**: Uses `http://localhost:3000`
- **Dynamic**: Adapts based on request headers

### **Email Links**
All email links now automatically use the correct domain:
- Invitation links: `https://app.time8.io/team/invite?token=...`
- Login links: `https://app.time8.io/login`
- Onboarding: `https://app.time8.io/onboarding`

### **Environment Configuration**
```bash
# Production
NEXT_PUBLIC_APP_URL=https://app.time8.io

# Development (auto-detected, no need to change)
# NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📧 **Your .env.local Configuration**

Update your `.env.local` file with these settings:

```bash
# Email Configuration (Time8 Smart Delivery)
RESEND_API_KEY=your_existing_resend_api_key

# Critical emails (invitations, password resets) - High deliverability
FROM_EMAIL=onboarding@resend.dev

# Brand emails (leave notifications) - Building Time8 reputation  
BRAND_EMAIL=noreply@time8.io

# General notifications - Balance reliability and branding
NOTIFICATION_EMAIL=notifications@time8.io

# App Configuration - Dynamic domain support
# NEXT_PUBLIC_APP_URL=https://app.time8.io
# For development, the system will auto-detect localhost

# Optional: Cron job security
CRON_SECRET=your-secret-cron-key
```

## 🎯 **Email Types & Routing**

| Email Type | From Address | Delivery | Purpose |
|------------|--------------|----------|---------|
| **Team Invitations** | `onboarding@resend.dev` | 🔴 Critical | Always deliver |
| **Employee Verification** | `onboarding@resend.dev` | 🔴 Critical | Account setup |
| **Password Resets** | `onboarding@resend.dev` | 🔴 Critical | Security |
| **Leave Notifications** | `notifications@time8.io` | 🟡 Balanced | Build reputation |
| **Team Updates** | `notifications@time8.io` | 🟡 Balanced | Regular comms |
| **Reminders** | `notifications@time8.io` | 🟡 Balanced | Engagement |
| **Test Emails** | `noreply@time8.io` | 🔵 Brand | Testing only |

## ⚡ **Quick Test**

1. **Update your `.env.local`** with the configuration above
2. **Restart your dev server:** `npm run dev`
3. **Test critical delivery:** Go to `/admin/test-email` - should come from `noreply@time8.io`
4. **Test invitation:** Create a team invitation - should come from `onboarding@resend.dev`

## 📈 **3-Week Reputation Building Plan**

### **Week 1 (Current Setup):**
- Critical emails: `onboarding@resend.dev` ✅ Reliable
- Brand emails: `noreply@time8.io` 📧 Building reputation
- Volume: Low (testing only)

### **Week 2-3:**
```bash
# Increase Time8 usage
NOTIFICATION_EMAIL=noreply@time8.io
```

### **Week 4+:**
```bash  
# Full Time8 branding
FROM_EMAIL=noreply@time8.io
BRAND_EMAIL=noreply@time8.io
NOTIFICATION_EMAIL=notifications@time8.io
```

## 🛡️ **DMARC Setup (Optional but Recommended)**

Add this DNS record in OVH to improve deliverability:

```
Type: TXT
Subdomain: _dmarc
Target: v=DMARC1; p=quarantine; pct=25; rua=mailto:dmarc@time8.io
TTL: 3600
```

## ⚙️ **Supabase Configuration**

### **Site URL Configuration**
Update your Supabase project settings:

1. **Go to**: [Supabase Dashboard](https://app.supabase.com) → Your Project → Authentication → URL Configuration
2. **Site URL**: `https://app.time8.io`
3. **Redirect URLs**: Add both:
   - `https://app.time8.io/login/callback`
   - `http://localhost:3000/login/callback` (for development)

### **CORS Configuration**
Ensure these domains are allowed:
- `https://app.time8.io`
- `http://localhost:3000`
- `https://*.time8.io` (for subdomains)

## ✅ **Features Implemented**

- ✅ **Smart delivery routing** - Critical vs Brand emails
- ✅ **Time8 branded templates** - Professional design
- ✅ **Employee verification emails** - Secure account setup  
- ✅ **Team invitation system** - Beautiful invitations
- ✅ **Leave notification system** - All notification types
- ✅ **Gradual reputation building** - Domain warm-up strategy
- ✅ **Fallback configuration** - Always works even if env vars missing

## 🎉 **What's New**

### **Smart Email Function**
The system automatically chooses the best FROM_EMAIL based on email importance:

```typescript
// Critical emails (invitations, security)
from: getFromEmail('critical')  // → onboarding@resend.dev

// Brand emails (general communications)  
from: getFromEmail('brand')     // → noreply@time8.io

// Notifications (leave updates, reminders)
from: getFromEmail('notification') // → notifications@time8.io
```

### **Enhanced Templates**
- Modern Time8 branding
- Professional gradients and styling
- Mobile-responsive design
- Clear call-to-action buttons

## 🔧 **Troubleshooting**

### **Emails Going to Spam?**
- ✅ Normal for new domains
- Mark as "Not Spam" to help reputation
- Add `noreply@time8.io` to contacts
- Wait 1-2 weeks for reputation to build

### **Critical Emails Not Delivering?**
- Uses proven `onboarding@resend.dev` domain
- Should always reach inbox
- Check Resend dashboard for delivery status

### **Configuration Not Working?**
- Restart dev server after changing `.env.local`
- Check all environment variables are set
- Test at `/admin/test-email`

## 🚀 **Ready for Production!**

Your Time8 email system is now enterprise-ready with:
- **Reliable critical email delivery**
- **Professional Time8 branding**  
- **Gradual domain reputation building**
- **Comprehensive notification coverage**

Start using it now - critical emails will always deliver while your Time8 brand builds reputation! 🎉 