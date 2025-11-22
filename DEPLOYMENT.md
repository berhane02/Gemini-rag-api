# Quick Deployment Checklist

## Before Deploying

- [ ] Code is pushed to GitHub
- [ ] `.env.local` is NOT committed (should be in `.gitignore`)
- [ ] All sensitive data removed from code

## Step 1: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Click **"Deploy"** (skip environment variables for now)

## Step 2: Get Your Vercel URL

After deployment, note your Vercel URL:
- Example: `https://your-app-name.vercel.app`
- Found in: Vercel Dashboard → Your Project → Overview

## Step 3: Set Environment Variables in Vercel

Go to: **Settings** → **Environment Variables**

Add these variables:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
GOOGLE_API_KEY=your-google-api-key
```

**Important:** Use production keys (`pk_live_` and `sk_live_`) for Clerk, not test keys!

## Step 4: Update Clerk Dashboard

Go to: [Clerk Dashboard](https://dashboard.clerk.com) → Your App → Settings → Paths

Update these fields:

**After sign-in URL:**
```
https://your-app-name.vercel.app/chat
```

**After sign-up URL:**
```
https://your-app-name.vercel.app/chat
```

Click **"Save Changes"**

## Step 5: Redeploy

1. Go to Vercel Dashboard → **Deployments**
2. Click **"..."** → **"Redeploy"**
3. Or push a new commit to trigger auto-deploy

## Step 6: Test Production

- [ ] Visit your Vercel URL
- [ ] Test login
- [ ] Test logout
- [ ] Test file upload
- [ ] Test chat functionality

## Troubleshooting

**Build fails?**
- Check build logs in Vercel
- Verify all environment variables are set
- Check for TypeScript errors

**Clerk errors?**
- Verify Clerk keys are set correctly in Vercel
- Check that Clerk Dashboard URLs match your Vercel URL
- Ensure you're using production keys (`pk_live_`/`sk_live_`) in production

**Runtime errors?**
- Check Vercel function logs
- Check browser console
- Verify API routes are accessible

## Quick Commands

```bash
# Deploy via CLI (optional)
npm i -g vercel
vercel

# Check deployment status
vercel ls
```
