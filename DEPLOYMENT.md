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
AUTH0_SECRET=<generate-new-with-openssl-rand-hex-32>
AUTH0_BASE_URL=https://your-app-name.vercel.app
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
GOOGLE_API_KEY=your-google-api-key
```

**Important:** Generate a NEW `AUTH0_SECRET` for production!

## Step 4: Update Auth0 Dashboard

Go to: [Auth0 Dashboard](https://manage.auth0.com) → Your App → Settings

Update these fields (add production URLs):

**Allowed Callback URLs:**
```
http://127.0.0.1:3000/api/auth/callback,https://your-app-name.vercel.app/api/auth/callback
```

**Allowed Logout URLs:**
```
http://127.0.0.1:3000,https://your-app-name.vercel.app
```

**Allowed Web Origins:**
```
http://127.0.0.1:3000,https://your-app-name.vercel.app
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

**Auth0 errors?**
- Verify URLs match exactly in Auth0 Dashboard
- Check `AUTH0_BASE_URL` matches Vercel URL
- Ensure `AUTH0_SECRET` is set

**Runtime errors?**
- Check Vercel function logs
- Check browser console
- Verify API routes are accessible

## Quick Commands

```bash
# Generate new AUTH0_SECRET
openssl rand -hex 32

# Deploy via CLI (optional)
npm i -g vercel
vercel

# Check deployment status
vercel ls
```

