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

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
