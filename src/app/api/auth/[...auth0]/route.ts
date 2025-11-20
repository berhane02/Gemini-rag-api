import { NextRequest } from 'next/server';
import { auth0 } from '@/lib/auth0';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ auth0: string[] }> }
) {
    // Access the internal authClient to use specific handler methods
    const auth0Any = auth0 as any;
    if (!auth0Any.authClient) {
        throw new Error('Auth0 client not initialized');
    }

    const authClient = auth0Any.authClient;
    const resolvedParams = await params;
    const route = resolvedParams.auth0?.[0] || '';

    // Manually route to the appropriate handler based on the catch-all parameter
    // This avoids the handler() method which uses NextResponse.next() for unmatched routes
    switch (route) {
        case 'login':
            // Redirect to chat page after login (chat includes file upload)
            // Add returnTo parameter to ensure redirect to /chat
            const loginUrl = new URL(req.url);
            if (!loginUrl.searchParams.has('returnTo')) {
                loginUrl.searchParams.set('returnTo', '/chat');
            }
            const loginReq = new NextRequest(loginUrl.toString(), req);
            return authClient.handleLogin(loginReq);
        case 'logout':
            // Redirect to home page after logout
            // Create a new request with returnTo parameter
            const logoutUrl = new URL(req.url);
            logoutUrl.searchParams.set('returnTo', '/home');
            const logoutReq = new NextRequest(logoutUrl.toString(), req);
            return authClient.handleLogout(logoutReq);
        case 'callback':
            // Callback processes authentication and redirects to signInReturnToPath (/chat)
            // Don't modify the callback URL - let Auth0 SDK handle it automatically
            // The SDK will use signInReturnToPath from auth0.ts config if no returnTo is present
            return authClient.handleCallback(req);
        case 'profile':
            return authClient.handleProfile(req);
        case 'access-token':
            if (authClient.enableAccessTokenEndpoint) {
                return authClient.handleAccessToken(req);
            }
            break;
        default:
            // Return 404 for unknown routes instead of NextResponse.next()
            return new Response('Not Found', { status: 404 });
    }
    
    return new Response('Not Found', { status: 404 });
}

