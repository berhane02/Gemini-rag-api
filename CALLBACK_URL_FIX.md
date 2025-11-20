# Callback URL Mismatch - Fix Guide

## Expected Callback URL

Based on your configuration:
- `AUTH0_BASE_URL`: `http://127.0.0.1:3000`
- Callback route: `/api/auth/callback`
- **Full callback URL**: `http://127.0.0.1:3000/api/auth/callback`

## How the Callback URL is Constructed

**File:** `src/lib/auth0.ts`

```typescript
const appBaseUrl = process.env.AUTH0_BASE_URL || 'http://127.0.0.1:3000';
// ...
routes: {
    callback: '/api/auth/callback',
}
```

The callback URL is constructed as: `appBaseUrl + routes.callback`
= `http://127.0.0.1:3000` + `/api/auth/callback`
= `http://127.0.0.1:3000/api/auth/callback`

## Fix Steps

### 1. Verify `.env.local` File

Make sure your `.env.local` has:
```bash
AUTH0_BASE_URL='http://127.0.0.1:3000'
```

**Important:** 
- Use single quotes: `'http://127.0.0.1:3000'`
- No trailing slash
- Use `127.0.0.1` not `localhost`

### 2. Update Auth0 Dashboard

Go to: https://manage.auth0.com/

1. Navigate to **Applications** → **Applications** → Your Application
2. Go to **Settings**
3. In **Allowed Callback URLs**, add EXACTLY:
   ```
   http://127.0.0.1:3000/api/auth/callback
   ```
4. In **Allowed Logout URLs**, add:
   ```
   http://127.0.0.1:3000
   ```
5. In **Allowed Web Origins**, add:
   ```
   http://127.0.0.1:3000
   ```
6. Click **Save Changes**

### 3. Restart Dev Server

After updating `.env.local` or Auth0 Dashboard:
```bash
# Stop the server (Ctrl+C) and restart
npm run dev
```

### 4. Clear Browser Cache

- Clear cookies for `127.0.0.1:3000`
- Or use an incognito/private window

## Common Issues

1. **Trailing slash**: `http://127.0.0.1:3000/` ❌ vs `http://127.0.0.1:3000` ✅
2. **Wrong host**: `localhost` ❌ vs `127.0.0.1` ✅
3. **Missing `/api`**: `/auth/callback` ❌ vs `/api/auth/callback` ✅
4. **Case sensitivity**: URLs are case-sensitive
5. **Spaces**: No spaces before/after the URL

## Verify Configuration

The callback URL sent to Auth0 should be:
```
http://127.0.0.1:3000/api/auth/callback
```

This must match EXACTLY in your Auth0 Dashboard's "Allowed Callback URLs" field.

