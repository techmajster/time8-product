# Time8 Vercel Email Configuration Setup

## 🎯 **Quick Fix: Add Missing Email Environment Variables**

Your Time8 app is deployed and working at `https://app.time8.io`, but emails won't work until you add these environment variables.

## 📧 **Environment Variables to Add**

Add these **4 environment variables** to your Vercel project:

### **1. RESEND_API_KEY**
```
Name: RESEND_API_KEY
Value: re_your_actual_resend_api_key_here
Environments: Production, Preview, Development
```

### **2. FROM_EMAIL** 
```
Name: FROM_EMAIL
Value: onboarding@resend.dev
Environments: Production, Preview, Development
```

### **3. BRAND_EMAIL**
```
Name: BRAND_EMAIL  
Value: noreply@time8.io
Environments: Production, Preview, Development
```

### **4. NOTIFICATION_EMAIL**
```
Name: NOTIFICATION_EMAIL
Value: notifications@time8.io
Environments: Production, Preview, Development
```

## 🔧 **Step-by-Step Instructions**

### **Method 1: Vercel Dashboard (Recommended)**

1. **Go to your project settings:**
   ```
   https://vercel.com/simons-projects-fb014f57/saas-leave-system/settings/environment-variables
   ```

2. **For each variable above:**
   - Click **"Add New"**
   - Enter the **Name** (e.g., `RESEND_API_KEY`)
   - Enter the **Value** 
   - Select **All Environments**: ✅ Production ✅ Preview ✅ Development
   - Click **"Save"**

3. **Redeploy after adding all variables:**
   - Go to **Deployments** tab
   - Click **"Redeploy"** on the latest deployment

### **Method 2: Vercel CLI**

Run these commands in your terminal:

```bash
# Add RESEND_API_KEY (replace with your actual key)
npx vercel env add RESEND_API_KEY production
# When prompted, enter: re_your_actual_resend_api_key_here

# Add FROM_EMAIL
npx vercel env add FROM_EMAIL production  
# When prompted, enter: onboarding@resend.dev

# Add BRAND_EMAIL
npx vercel env add BRAND_EMAIL production
# When prompted, enter: noreply@time8.io

# Add NOTIFICATION_EMAIL  
npx vercel env add NOTIFICATION_EMAIL production
# When prompted, enter: notifications@time8.io

# Repeat for preview and development environments
npx vercel env add RESEND_API_KEY preview
npx vercel env add FROM_EMAIL preview
npx vercel env add BRAND_EMAIL preview
npx vercel env add NOTIFICATION_EMAIL preview

npx vercel env add RESEND_API_KEY development
npx vercel env add FROM_EMAIL development
npx vercel env add BRAND_EMAIL development
npx vercel env add NOTIFICATION_EMAIL development

# Redeploy
npx vercel --prod
```

## 🔑 **Where to Find Your Resend API Key**

1. Go to [resend.com/api-keys](https://resend.com/api-keys)
2. Copy your API key (starts with `re_`)
3. Use this as the value for `RESEND_API_KEY`

## ✅ **Verification**

After adding the variables:

1. **Check environment variables are added:**
   ```bash
   npx vercel env ls
   ```
   You should see all 4 new email variables.

2. **Test the email system:**
   - Go to `https://app.time8.io/admin/test-email`
   - Send a test email
   - Check that it arrives (might be in spam initially)

3. **Test invitations:**
   - Try sending a team invitation
   - Verify the email is sent from `onboarding@resend.dev`

## 🎉 **What This Fixes**

Once configured, your Time8 system will have:
- ✅ **Team invitations** working
- ✅ **Employee verification emails** working  
- ✅ **Leave request notifications** working
- ✅ **Weekly summaries** working
- ✅ **Smart email routing** (critical vs brand emails)

## 🚨 **Important Notes**

- **Use `onboarding@resend.dev`** for `FROM_EMAIL` (guaranteed delivery)
- **Use `noreply@time8.io`** for `BRAND_EMAIL` (builds domain reputation)
- **All environments** need the same values for consistency
- **Redeploy** after adding variables for changes to take effect

## 📊 **Current Status**

✅ **Domain:** `https://app.time8.io` working  
✅ **Database:** Supabase configured  
✅ **App:** Deployed successfully  
⚠️ **Emails:** Need environment variables (this fix)  

After this setup, your Time8 leave management system will be 100% functional! 