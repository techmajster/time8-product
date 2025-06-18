# Deployment Guide - SaaS Leave System

## Environment Variables Required

For production deployment, you need these environment variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# App Configuration  
NEXT_PUBLIC_APP_URL=https://your-production-domain.com

# Email Configuration (if using Resend)
RESEND_API_KEY=your_resend_api_key

# Additional Supabase Keys (if needed)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Vercel Deployment (Recommended)

### 1. Prepare Your Repository
```bash
# Commit current changes
git add .
git commit -m "Prepare for production deployment"

# Create a production branch
git checkout -b production
git push origin production

# Create a development branch  
git checkout -b development
git push origin development

# Switch back to main
git checkout main
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign up
2. Click "Import Project" and select your GitHub repository
3. Choose the `production` branch for production deployment
4. Set the environment variables in Vercel dashboard
5. Deploy!

### 3. Set Up Preview Deployments
- Vercel will automatically create preview deployments for pull requests
- Set up the `development` branch for staging environment

## Alternative: Railway Deployment

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Deploy
```bash
railway login
railway init
railway up
```

## Alternative: Netlify Deployment

### 1. Install Netlify CLI
```bash
npm install -g netlify-cli
```

### 2. Build and Deploy
```bash
npm run build
netlify deploy --prod --dir=.next
```

## Environment Management

### Development Workflow
1. **Local Development**: Work on feature branches
2. **Staging**: Merge to `development` branch → Auto-deploy to staging
3. **Production**: Merge to `production` branch → Auto-deploy to production

### Branch Strategy
- `main`: Stable codebase
- `development`: Staging environment
- `production`: Production environment  
- `feature/*`: Feature development branches

## Post-Deployment Checklist

1. ✅ Verify environment variables are set
2. ✅ Test authentication flow
3. ✅ Test database connectivity
4. ✅ Verify email functionality
5. ✅ Test core leave management features
6. ✅ Check responsive design on mobile
7. ✅ Verify Supabase RLS policies work in production

## Monitoring & Updates

### Updating Production
```bash
# Make changes locally
git add .
git commit -m "Feature: description"

# Test in development
git checkout development
git merge feature/your-feature
git push origin development
# Test staging deployment

# Deploy to production
git checkout production  
git merge development
git push origin production
# Production auto-deploys
```

### Rolling Back
```bash
# If needed, rollback production
git checkout production
git reset --hard HEAD~1  # Go back one commit
git push --force origin production
```

## Cost Considerations

### Free Tiers Available:
- **Vercel**: 100GB bandwidth, hobby projects
- **Netlify**: 100GB bandwidth, 300 build minutes
- **Railway**: $5/month after trial
- **Supabase**: 2 free projects, 500MB database

### Recommended for Testing:
Start with Vercel free tier - it's perfect for testing and can handle moderate traffic. 