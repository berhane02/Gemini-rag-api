# Clerk Authentication Setup

This application uses Clerk for authentication.

## Quick Start

### 1. Create a Clerk Account

1. Go to [clerk.com](https://clerk.com) and sign up for a free account
2. Create a new application
3. Choose your authentication methods (Email, Google, GitHub, etc.)

### 2. Get Your Clerk Keys

From your Clerk Dashboard, go to **API Keys** and copy:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

### 3. Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Optional: Redirect URLs (can also be set via ClerkProvider props)
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/chat
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/chat

# Google Gemini API Key (required)
GOOGLE_API_KEY='your-google-api-key'
```

### 4. Configure Clerk Application URLs (IMPORTANT!)

In your Clerk Dashboard, go to **Settings** → **Paths**:

- **Sign-in URL**: `/sign-in` (or leave default)
- **Sign-up URL**: `/sign-up` (or leave default)
- **After sign-in URL**: `/chat` ⚠️ **MUST be set to `/chat`**
- **After sign-up URL**: `/chat` ⚠️ **MUST be set to `/chat`**

**IMPORTANT - CORS Configuration:**

Go to **Settings** → **Allowed Origins** and add:
- `http://localhost:3000`
- `http://127.0.0.1:3000`

**Note**: These Dashboard settings work together with the code-level configuration in `src/app/layout.tsx`. Both must be set correctly for redirects to work properly. If you see CORS errors, make sure both `localhost` and `127.0.0.1` are added to the Allowed Origins list.

## Features

- ✅ Modern authentication UI
- ✅ Protected API routes
- ✅ User context management
- ✅ Seamless sign-in/sign-up flow

## Testing

1. Set your Clerk keys in `.env.local`
2. Restart the dev server: `npm run dev`
3. Navigate to `http://127.0.0.1:3000`
4. Click "Login" - Clerk sign-in modal should appear
5. After signing in, you should be redirected to `/chat`

## Troubleshooting

### Clerk sign-in modal not appearing
- Check that `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set correctly
- Ensure the key starts with `pk_test_` or `pk_live_`
- Check browser console for errors

### Authentication not working
- Verify both Clerk keys are in `.env.local`
- Restart the dev server after changing environment variables
- Check that Clerk Dashboard URLs are configured correctly
