'use client';

import { createContext, useContext, ReactNode, useState, useEffect, useRef, useCallback } from 'react';

// Completely block Auth0 profile calls after login - use cache only
if (typeof window !== 'undefined' && !(window as any).__auth0FetchIntercepted) {
    (window as any).__auth0FetchIntercepted = true;
    const originalFetch = window.fetch;
    // Store original fetch for when we need it (login callback)
    (window as any).__originalFetch = originalFetch;
    
    window.fetch = async function(...args) {
        const url = args[0];
        if (typeof url === 'string' && url.includes('/auth/profile')) {
            // Block all profile calls - return cached data only
            try {
                const cached = localStorage.getItem('auth0_user_cache');
                if (cached) {
                    const cachedData = JSON.parse(cached);
                    // Return cached user data
                    return new Response(JSON.stringify(cachedData.user), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                // If no cache, return null (not logged in)
                return new Response(JSON.stringify(null), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (err) {
                // If cache read fails, return null
                return new Response(JSON.stringify(null), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        return originalFetch.apply(this, args);
    };
}

interface User {
    sub?: string;
    name?: string;
    email?: string;
    picture?: string;
    [key: string]: any;
}

interface UserContextType {
    user: User | null;
    isLoading: boolean;
    error: Error | undefined;
    refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);
const CACHE_KEY = 'auth0_user_cache';
const CACHE_TIMESTAMP_KEY = 'auth0_user_cache_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedUser {
    user: User | null;
    timestamp: number;
}

// Clear cache helper
function clearUserCache() {
    try {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIMESTAMP_KEY);
        // Also clear Auth0's session storage
        if (typeof window !== 'undefined') {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('auth0') || key.startsWith('@@auth0') || key.includes('auth0')) {
                    localStorage.removeItem(key);
                }
            });
            Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith('auth0') || key.startsWith('@@auth0') || key.includes('auth0')) {
                    sessionStorage.removeItem(key);
                }
            });
        }
    } catch (err) {
        console.error('Error clearing cache:', err);
    }
}

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | undefined>(undefined);
    const hasInitialized = useRef(false);
    const isCheckingLogin = useRef(false);

    // Load cached user on mount - don't call Auth0 at all
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        try {
            const cached = localStorage.getItem(CACHE_KEY);
            const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
            
            if (cached && timestamp) {
                const cacheAge = Date.now() - parseInt(timestamp, 10);
                if (cacheAge < CACHE_DURATION) {
                    const cachedData: CachedUser = JSON.parse(cached);
                    setUser(cachedData.user);
                    setIsLoading(false);
                    return;
                } else {
                    // Cache expired, clear it
                    clearUserCache();
                }
            }
        } catch (err) {
            console.error('Error loading cached user:', err);
            clearUserCache();
        }

        // No cache found - user is not logged in
        setUser(null);
        setIsLoading(false);
    }, []); // Only run once on mount

    // Check for login on callback (when redirected from Auth0)
    useEffect(() => {
        if (isCheckingLogin.current) return;
        
        // Check if we're on a callback URL
        if (typeof window !== 'undefined' && window.location.pathname.includes('/api/auth/callback')) {
            isCheckingLogin.current = true;
            // Wait a bit for Auth0 to process, then fetch user once
            setTimeout(async () => {
                try {
                    // Temporarily bypass fetch interception for this one call
                    const originalFetch = (window as any).__originalFetch || window.fetch;
                    const response = await originalFetch('/api/auth/profile');
                    if (response.ok) {
                        const userData = await response.json();
                        if (userData) {
                            setUser(userData);
                            // Cache the user
                            const cacheData: CachedUser = {
                                user: userData,
                                timestamp: Date.now()
                            };
                            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
                            localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
                        }
                    }
                } catch (err) {
                    console.error('Error fetching user after login:', err);
                } finally {
                    isCheckingLogin.current = false;
                }
            }, 1000);
        }
    }, []);

    // Manual refresh function (only use when explicitly needed)
    const refreshUser = useCallback(async () => {
        try {
            setIsLoading(true);
            // Temporarily bypass fetch interception
            const originalFetch = (window as any).__originalFetch || window.fetch;
            const response = await originalFetch('/api/auth/profile');
            if (response.ok) {
                const userData = await response.json();
                if (userData) {
                    setUser(userData);
                    // Update cache
                    const cacheData: CachedUser = {
                        user: userData,
                        timestamp: Date.now()
                    };
                    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
                    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
                } else {
                    // No user data - logged out
                    clearUserCache();
                    setUser(null);
                }
            } else {
                // Session expired, clear cache
                clearUserCache();
                setUser(null);
            }
        } catch (err) {
            console.error('Error refreshing user:', err);
            clearUserCache();
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return (
        <UserContext.Provider value={{ user, isLoading, error, refreshUser }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUserContext() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUserContext must be used within a UserProvider');
    }
    return context;
}

// Export function to clear cache (for logout) - invalidates token
export function clearAuthCache() {
    clearUserCache();
}
