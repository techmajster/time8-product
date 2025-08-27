# Fix Time8 Redirect Issue

## 🚨 **Problem**: Login redirects to old Vercel URL instead of app.time8.io

## 🔧 **Solution**: Update environment variables and Supabase configuration

### **Step 1: Update Vercel Environment Variables**

Go to: https://vercel.com/simons-projects-fb014f57/saas-leave-system/settings/environment-variables

**Find and UPDATE these variables:**

1. **NEXT_PUBLIC_APP_URL**
   - Current: Probably `https://saas-leave-system.vercel.app` 
   - **Change to**: `https://app.time8.io`

2. **NEXT_PUBLIC_SITE_URL** 
   - Current: Probably old Vercel URL
   - **Change to**: `https://app.time8.io`

### **Step 2: Update Supabase Authentication URLs**

1. **Go to Supabase Dashboard:**
   ```
   https://app.supabase.com/project/odbjrxsbgvmohdnvjjil/auth/url-configuration
   ```

2. **Update Site URL:**
   - **Site URL**: `https://app.time8.io`

3. **Update Redirect URLs:**
   Add these to the list:
   - `https://app.time8.io/login/callback`
   - `https://app.time8.io/auth/callback`
   - `https://app.time8.io/**` (wildcard for all paths)

   **Remove old URLs:**
   - Any `https://saas-leave-system.vercel.app/**` entries
   - Any old Vercel URLs

### **Step 3: Redeploy**

After updating environment variables:
1. Go to **Deployments** tab in Vercel
2. Click **"Redeploy"** on the latest deployment
3. Wait for deployment to complete

## ✅ **Verification**

After the fix:

1. **Test Login Flow:**
   - Go to `https://app.time8.io`
   - Login with your credentials
   - Should redirect to `https://app.time8.io/dashboard` ✅

2. **Test Google Auth:**
   - Try "Login with Google"
   - Should stay on `app.time8.io` domain ✅

3. **Test Environment Variables:**
   ```bash
   npx vercel env pull .env.vercel
   cat .env.vercel | grep NEXT_PUBLIC_APP_URL
   # Should show: NEXT_PUBLIC_APP_URL="https://app.time8.io"
   ```

## 🎯 **Why This Happens**

The redirect issue occurs because:
1. **Old environment variables** still point to Vercel URLs
2. **Supabase auth redirect URLs** weren't updated for custom domain
3. **JavaScript fallbacks** use the old URLs when env vars are missing

## 📱 **Quick CLI Fix (Alternative)**

If you prefer CLI, run these commands:

```bash
# Update environment variables
npx vercel env rm NEXT_PUBLIC_APP_URL production
npx vercel env add NEXT_PUBLIC_APP_URL production
# When prompted, enter: https://app.time8.io

npx vercel env rm NEXT_PUBLIC_SITE_URL production  
npx vercel env add NEXT_PUBLIC_SITE_URL production
# When prompted, enter: https://app.time8.io

# Redeploy
npx vercel --prod
```

## 🔗 **Direct Links for Quick Fix**

- **Vercel Env Vars**: https://vercel.com/simons-projects-fb014f57/saas-leave-system/settings/environment-variables
- **Supabase Auth Config**: https://app.supabase.com/project/odbjrxsbgvmohdnvjjil/auth/url-configuration
- **Vercel Deployments**: https://vercel.com/simons-projects-fb014f57/saas-leave-system

After these updates, your Time8 system will properly redirect to `https://app.time8.io/dashboard` after login! 🎉 