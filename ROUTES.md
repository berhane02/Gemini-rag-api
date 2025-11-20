# Route Structure Overview

This document explains how routes are set up in this Next.js application.

## Directory Structure

```
src/app/
├── page.tsx                    # Root route: / (redirects to /home)
├── home/
│   └── page.tsx               # Home route: /home
├── chat/
│   └── page.tsx               # Chat route: /chat
├── api/
│   ├── auth/
│   │   └── [...auth0]/
│   │       └── route.ts       # Auth0 catch-all: /api/auth/*
│   ├── chat/
│   │   └── route.ts           # Chat API: POST /api/chat
│   └── upload/
│       └── route.ts           # Upload API: POST /api/upload
└── layout.tsx                 # Root layout (wraps all routes)
```

## Page Routes (Client-Side)

### 1. Root Route: `/` 
**File:** `src/app/page.tsx`

- **Purpose:** Redirects to home page
- **Behavior:** Redirects to `/home`

### 2. Home Route: `/home`
**File:** `src/app/home/page.tsx`

- **Purpose:** Home page for all users (authenticated and unauthenticated)
- **Component:** `<LandingPage />`
- **Authentication:** Not required
- **Behavior:**
  - Shows loading spinner while checking auth status
  - Always displays home page
  - Home page shows different buttons based on auth status:
    - **Unauthenticated:** "Get Started" button → redirects to `/login`
    - **Authenticated:** "Go to Chat" button → navigates to `/chat`

### 3. Chat Route: `/chat`
**File:** `src/app/chat/page.tsx`

- **Purpose:** Chat interface for authenticated users
- **Component:** `<ChatInterface />`
- **Authentication:** Required (redirects to `/home` if not authenticated)
- **Behavior:**
  - Checks authentication status
  - Redirects to `/home` if user is not authenticated
  - Shows chat interface if authenticated
  - Protected route

## API Routes (Server-Side)

### 1. Auth0 Routes: `/api/auth/[...auth0]`
**File:** `src/app/api/auth/[...auth0]/route.ts`

- **Type:** Catch-all dynamic route
- **Method:** GET
- **Purpose:** Handles all Auth0 authentication flows
- **Routes handled:**
  - `/api/auth/login` → Initiates Auth0 login, redirects to Auth0
  - `/api/auth/logout` → Logs out user, redirects to `/`
  - `/api/auth/callback` → Handles Auth0 callback, redirects to `/chat` after login
  - `/api/auth/profile` → Returns user profile
  - `/api/auth/access-token` → Returns access token (if enabled)

**Configuration:** See `src/lib/auth0.ts`
- `signInReturnToPath: '/chat'` - Redirects to chat after login
- Routes configured in Auth0Client options

### 2. Chat API: `/api/chat`
**File:** `src/app/api/chat/route.ts`

- **Method:** POST
- **Purpose:** Handles chat messages and returns streaming responses
- **Authentication:** Required (401 if not authenticated)
- **Request Body:**
  ```json
  {
    "message": "user's question"
  }
  ```
- **Response:** Streaming text response (text/plain)
- **Uses:** `queryRAG()` from `@/lib/rag`

### 3. Upload API: `/api/upload`
**File:** `src/app/api/upload/route.ts`

- **Method:** POST
- **Purpose:** Uploads files to Gemini File Search
- **Authentication:** Required (401 if not authenticated)
- **Request:** FormData with `file` field
- **Response:**
  ```json
  {
    "success": true,
    "message": "Successfully uploaded...",
    "fileName": "example.pdf",
    "storeName": "file-search-store-name",
    "isDuplicate": false
  }
  ```
- **Uses:** `uploadFileToGemini()` from `@/lib/gemini-file-search`

## Authentication Flow

```
1. User visits `/` → Redirects to `/home`
   ↓
2. Clicks "Get Started" → `/login`
   ↓
3. Clicks "Sign In with Auth0" → `/api/auth/login` → Auth0 login page
   ↓
4. After login → `/api/auth/callback`
   ↓
5. Callback processes auth → Redirects to `/chat` (configured in auth0.ts)
   ↓
6. User sees chat interface at `/chat`
```

## Route Protection

- **Public Routes:**
  - `/` - Redirects to `/home`
  - `/home` - Home page (accessible to all)
  - `/login` - Login page (accessible to all, redirects to `/chat` if authenticated)

- **Protected Routes:**
  - `/chat` - Client-side protection (redirects to `/home` if not authenticated)
  - `/api/chat` - Server-side protection (returns 401 if not authenticated)
  - `/api/upload` - Server-side protection (returns 401 if not authenticated)

## Auth0 Configuration

**File:** `src/lib/auth0.ts`

```typescript
export const auth0 = new Auth0Client({
    appBaseUrl: 'http://127.0.0.1:3000',
    signInReturnToPath: '/chat',  // Redirect here after login
    routes: {
        login: '/api/auth/login',
        logout: '/api/auth/logout',
        callback: '/api/auth/callback',
        profile: '/api/auth/profile',
        accessToken: '/api/auth/access-token',
    }
});
```

## Key Points

1. **Next.js App Router:** Uses file-based routing
   - `page.tsx` = route
   - `route.ts` = API endpoint

2. **Catch-all Route:** `[...auth0]` captures all `/api/auth/*` paths
   - Manually routes to specific handlers based on the path segment

3. **Authentication Check:**
   - Client-side: Uses `useUser()` hook from `@auth0/nextjs-auth0/client`
   - Server-side: Uses `auth0.getSession(req)` from `@auth0/nextjs-auth0/server`

4. **Redirects:**
   - Root `/`: Redirects to `/home`
   - After login: `/chat` (configured in `signInReturnToPath`)
   - After logout: `/` (default, which redirects to `/home`)
   - Unauthenticated access to `/chat`: Redirects to `/home`

