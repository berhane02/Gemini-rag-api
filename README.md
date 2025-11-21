This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Prerequisites

1. **Auth0 Account**: Sign up at [auth0.com](https://auth0.com) (free tier available)
2. **Google Gemini API Key**: Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```bash
# Auth0 Configuration
# Get these from your Auth0 Dashboard: https://manage.auth0.com/
AUTH0_SECRET='use [openssl rand -hex 32] to generate a 32 bytes value'
AUTH0_BASE_URL='http://127.0.0.1:3000'
AUTH0_ISSUER_BASE_URL='https://your-tenant.auth0.com'
AUTH0_CLIENT_ID='your-client-id'
AUTH0_CLIENT_SECRET='your-client-secret'

# Google Gemini API Key
GOOGLE_API_KEY='your-google-api-key'
```

#### Auth0 Setup Steps:

1. Create an Auth0 account at [auth0.com](https://auth0.com)
2. Create a new Application (choose "Regular Web Application")
3. Configure the following:
   - **Allowed Callback URLs**: `http://127.0.0.1:3000/api/auth/callback`
   - **Allowed Logout URLs**: `http://127.0.0.1:3000` (IMPORTANT: Must include this exact URL)
   - **Allowed Web Origins**: `http://127.0.0.1:3000`
   
   **Note**: The "Allowed Logout URLs" field must contain `http://127.0.0.1:3000` exactly as shown. This is where Auth0 redirects users after logout.
4. Copy your Domain, Client ID, and Client Secret to `.env.local`
5. Generate AUTH0_SECRET: Run `openssl rand -hex 32` in your terminal

### Running the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

### Prerequisites

1. **Push your code to GitHub** (if not already done)
2. **Vercel account** - Sign up at [vercel.com](https://vercel.com) (free tier available)

### Step-by-Step Deployment

#### 1. Push Code to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial commit"

# Create a repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

#### 2. Deploy to Vercel

**Option A: Via Vercel Dashboard (Recommended)**

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings
5. Click **"Deploy"** (don't add environment variables yet - we'll do that next)

**Option B: Via Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts
# - Link to existing project or create new
# - Set up and deploy
```

#### 3. Configure Environment Variables in Vercel

After your first deployment, configure environment variables:

1. Go to your project in Vercel Dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Add the following variables (use your production Auth0 URLs):

```bash
# Auth0 Configuration
AUTH0_SECRET=<generate-new-secret-using-openssl-rand-hex-32>
AUTH0_BASE_URL=https://your-app-name.vercel.app
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret

# Google Gemini API Key
GOOGLE_API_KEY=your-google-api-key
```

**Important Notes:**
- Generate a **new** `AUTH0_SECRET` for production (don't reuse dev secret)
- Replace `your-app-name.vercel.app` with your actual Vercel deployment URL
- You can find your Vercel URL after the first deployment

#### 4. Update Auth0 Dashboard for Production

1. Go to [Auth0 Dashboard](https://manage.auth0.com) → Your Application → Settings
2. Update the following URLs (add both dev and production):

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

3. Click **"Save Changes"**

#### 5. Redeploy with Environment Variables

After adding environment variables:

1. Go to Vercel Dashboard → Your Project → **"Deployments"**
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger automatic redeployment

### Post-Deployment Checklist

- [ ] Environment variables are set in Vercel
- [ ] Auth0 URLs are updated with production URL
- [ ] Test login flow on production
- [ ] Test logout flow on production
- [ ] Test file upload functionality
- [ ] Test chat functionality

### Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → **"Settings"** → **"Domains"**
2. Add your custom domain
3. Update Auth0 URLs to include your custom domain
4. Update `AUTH0_BASE_URL` environment variable in Vercel

### Troubleshooting

**Build Errors:**
- Check Vercel build logs for specific errors
- Ensure all environment variables are set
- Verify Node.js version compatibility (Vercel auto-detects)

**Auth0 Errors:**
- Verify all URLs match exactly in Auth0 Dashboard
- Check that `AUTH0_BASE_URL` matches your Vercel URL
- Ensure `AUTH0_SECRET` is set correctly

**Runtime Errors:**
- Check Vercel function logs
- Verify API routes are working
- Check browser console for client-side errors

### Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `AUTH0_SECRET` | Secret for encrypting cookies | Generated with `openssl rand -hex 32` |
| `AUTH0_BASE_URL` | Your app's base URL | `https://your-app.vercel.app` |
| `AUTH0_ISSUER_BASE_URL` | Your Auth0 tenant URL | `https://your-tenant.auth0.com` |
| `AUTH0_CLIENT_ID` | Auth0 Application Client ID | From Auth0 Dashboard |
| `AUTH0_CLIENT_SECRET` | Auth0 Application Client Secret | From Auth0 Dashboard |
| `GOOGLE_API_KEY` | Google Gemini API Key | From Google AI Studio |

### Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/app/building-your-application/deploying)
- [Auth0 Next.js SDK](https://auth0.com/docs/quickstart/webapp/nextjs)
