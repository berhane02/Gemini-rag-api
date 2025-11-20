import { Auth0Client } from '@auth0/nextjs-auth0/server';

// Get configuration from environment variables
const appBaseUrl = process.env.AUTH0_BASE_URL || process.env.APP_BASE_URL || 'http://127.0.0.1:3000';

// Extract domain from AUTH0_ISSUER_BASE_URL if AUTH0_DOMAIN is not set
// AUTH0_ISSUER_BASE_URL format: https://your-tenant.auth0.com
// AUTH0_DOMAIN format: your-tenant.auth0.com
let domain = process.env.AUTH0_DOMAIN;
if (!domain && process.env.AUTH0_ISSUER_BASE_URL) {
    const issuerUrl = process.env.AUTH0_ISSUER_BASE_URL;
    // Remove protocol (https:// or http://) if present
    domain = issuerUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

const clientId = process.env.AUTH0_CLIENT_ID;
const clientSecret = process.env.AUTH0_CLIENT_SECRET;
const secret = process.env.AUTH0_SECRET;

// Auth0Client will use environment variables if not provided, but we explicitly set them here
// to avoid warnings and ensure proper initialization
export const auth0 = new Auth0Client({
    ...(domain && { domain }),
    ...(clientId && { clientId }),
    ...(clientSecret && { clientSecret }),
    ...(secret && { secret }),
    appBaseUrl,
    signInReturnToPath: '/chat', // Redirect to chat page after successful login (chat includes file upload)
    signOutReturnToPath: '/home', // Redirect to home page after logout
    routes: {
        login: '/api/auth/login',
        logout: '/api/auth/logout',
        callback: '/api/auth/callback',
        profile: '/api/auth/profile',
        accessToken: '/api/auth/access-token',
    }
});
