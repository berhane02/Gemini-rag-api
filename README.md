This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Prerequisites

1. **Clerk Account**: Sign up at [clerk.com](https://clerk.com) (free tier available)
2. **Google Gemini API Key**: Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```bash
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
# Optional: Set redirect URLs via environment variables (alternative to component props)
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/chat
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/chat

# Google Gemini API Key (required)
GOOGLE_API_KEY='your-google-api-key'
```

#### Clerk Setup Steps (Default):

1. Create a Clerk account at [clerk.com](https://clerk.com)
2. Create a new application
3. Choose your authentication methods (Email, Google, GitHub, etc.)
4. From your Clerk Dashboard, go to **API Keys** and copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_test_` or `pk_live_`)
   - `CLERK_SECRET_KEY` (starts with `sk_test_` or `sk_live_`)
5. Add these keys to your `.env.local` file
6. In Clerk Dashboard → Settings → Paths:
   - **After sign-in URL**: `/chat`
   - **After sign-up URL**: `/chat`


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

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Quick Deploy Checklist

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import your project to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Add Environment Variables in Vercel**
   - Go to your project → Settings → Environment Variables
   - Add the following variables:

   ```bash
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_SECRET_KEY=sk_live_...
   GOOGLE_API_KEY=your-google-api-key
   ```

4. **Update Clerk Dashboard for Production**
   - Go to Clerk Dashboard → Settings → Paths
   - Update **After sign-in URL** and **After sign-up URL** to: `https://your-app-name.vercel.app/chat`

5. **Deploy**
   - Vercel will automatically deploy on every push to main
   - Or click "Deploy" in the Vercel dashboard

### Important Notes for Production

- Use **production keys** (`pk_live_` and `sk_live_`) for Clerk, not test keys
- Update all URLs in Clerk Dashboard to use your production domain
- Never commit `.env.local` to git (it's already in `.gitignore`)

### Troubleshooting

**Clerk Errors:**
- Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set correctly
- Check that Clerk Dashboard URLs match your Vercel URL
- Ensure you're using production keys (`pk_live_`/`sk_live_`) in production

**General:**
- Check Vercel build logs for errors
- Verify all environment variables are set in Vercel dashboard

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | `pk_test_...` or `pk_live_...` |
| `CLERK_SECRET_KEY` | Clerk secret key | `sk_test_...` or `sk_live_...` |
| `GOOGLE_API_KEY` | Google Gemini API key | From Google AI Studio |

## Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs)
