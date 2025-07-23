# 🔧 Invitation System Debug Guide - Localhost

## 🎯 **The Issue**
"Nothing happens" when trying to invite new employees on localhost

## 📋 **Step-by-Step Debugging**

### **Step 1: Check Your User Role & Permissions**

1. **Open browser console** (F12 → Console tab)
2. **Go to**: `http://localhost:3000/team`
3. **Check console for errors** and note your role

**Expected behavior:**
- If you're **admin/manager**: You should see invitation options
- If you're **employee**: You'll be redirected to `/dashboard`

### **Step 2: Test the Invitation UI Flow**

1. **Go to**: `http://localhost:3000/team`
2. **Look for**: "Invite Member" button or empty state message
3. **Click**: "Invite Member" button
4. **Expected**: Dialog should open with URL changing to `/team?invite=true`

**If dialog doesn't open:**
- Check browser console for JavaScript errors
- URL should change to `/team?invite=true`

### **Step 3: Test the Invitation Form**

1. **Open invitation dialog** (URL: `/team?invite=true`)
2. **Fill form**:
   - Email: `test@example.com`
   - Role: `employee`
   - Team: (select any team)
   - Message: `Test invitation`
3. **Click**: "Send Invitation"
4. **Watch console** for API calls and errors

**Expected API calls:**
```
POST /api/teams (to fetch teams)
POST /api/send-invitation (to send email)
```

### **Step 4: Check Email Service Response**

1. **Open Network tab** in browser console
2. **Submit invitation form**
3. **Look for**: API call to `/api/send-invitation`
4. **Check response**:
   - ✅ Status 200: Email service working
   - ❌ Status 503: "Email service not configured"
   - ❌ Status 500: Other email error

### **Step 5: Test Email Configuration**

**Manual API Test:**
1. **Open Terminal**
2. **Run:**
```bash
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"to":"szymon.rajca@bb8.pl"}' \
  -H "Cookie: $(curl -s -c - http://localhost:3000/login | grep -o 'sb-[^;]*')"
```

**Expected response:**
```json
{
  "success": true,
  "message": "Test email sent successfully!"
}
```

## 🚨 **Common Issues & Solutions**

### **Issue 1: Dialog Not Opening**
**Symptoms:** Clicking invite button does nothing, URL doesn't change
**Solution:**
```javascript
// Check in browser console:
document.querySelector('[href="/team?invite=true"]')
// Should return the invite button element
```

### **Issue 2: "Email service not configured"**
**Symptoms:** Form submits but shows error about email configuration
**Solution:** Verify `.env.local` file:
```bash
# Should contain:
RESEND_API_KEY=re_ZyHwiT8f_32aJ37uYjF8rbW4PBSLVfLVk
FROM_EMAIL=onboarding@resend.dev
BRAND_EMAIL=noreply@time8.io
NOTIFICATION_EMAIL=notifications@time8.io
```

### **Issue 3: Authentication Errors**
**Symptoms:** API calls return 401/403 errors
**Solution:** 
1. Make sure you're logged in
2. Check user role (admin/manager required)
3. Clear browser cookies and re-login

### **Issue 4: Teams Not Loading**
**Symptoms:** "Team is required" error, no teams in dropdown
**Solution:**
1. Check if organization has teams created
2. Go to `/admin/team-management` to create teams first

## 🧪 **Quick Test Steps**

**1. Test UI Access:**
```
1. Go to: http://localhost:3000/team
2. Look for: "Invite Member" button
3. Click it: URL should change to /team?invite=true
```

**2. Test Form Submission:**
```
1. Fill invitation form
2. Open browser Network tab
3. Submit form
4. Check API response in Network tab
```

**3. Test Email Service:**
```
1. Go to: http://localhost:3000/admin/test-email
2. Enter: szymon.rajca@bb8.pl
3. Click: Send Test Email
4. Check: Your email inbox
```

## 📞 **Next Steps**

**If still not working:**
1. **Share browser console errors** - Take screenshot of any errors
2. **Share Network tab response** - Screenshot of API call responses  
3. **Confirm your user role** - admin/manager required
4. **Test the direct URL** - Go to `/team?invite=true` manually

**If working but no email received:**
1. **Check spam folder**
2. **Verify email address is correct** 
3. **Try test email first** at `/admin/test-email`
4. **Remember**: Only `szymon.rajca@bb8.pl` works in testing mode

## ✅ **Success Criteria**

The invitation system is working when:
1. ✅ Dialog opens when clicking "Invite Member"
2. ✅ Form submits without errors  
3. ✅ Success message shows with invitation code
4. ✅ Email received in inbox (or spam folder)

---

**Note:** Your environment is correctly configured. The issue is most likely in the UI flow or user permissions. 