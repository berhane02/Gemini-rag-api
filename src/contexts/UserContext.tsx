'use client';

import { createContext, useContext, ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import { useUser as useClerkUser } from '@clerk/nextjs';

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
const CACHE_KEY = 'clerk_user_cache';
const CACHE_TIMESTAMP_KEY = 'clerk_user_cache_timestamp';
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
    } catch (err) {
        console.error('Error clearing cache:', err);
    }
}

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | undefined>(undefined);
    const hasInitialized = useRef(false);
    
    // Clerk user hook
    const clerkUser = useClerkUser();

    // Load user on mount
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        // Set a timeout to prevent infinite loading if Clerk never loads
        const timeoutId = setTimeout(() => {
            if (!clerkUser.isLoaded) {
                console.warn('Clerk is taking longer than expected to load. Setting loading to false.');
                setUser(null);
                setIsLoading(false);
            }
        }, 3000); // 3 second timeout
        
        // If Clerk is already loaded, handle it immediately
        if (clerkUser.isLoaded) {
            clearTimeout(timeoutId);
            if (clerkUser.user) {
                const clerkUserData: User = {
                    sub: clerkUser.user.id,
                    name: clerkUser.user.fullName || clerkUser.user.firstName || undefined,
                    email: clerkUser.user.primaryEmailAddress?.emailAddress,
                    picture: clerkUser.user.imageUrl,
                };
                setUser(clerkUserData);
                const cacheData: CachedUser = {
                    user: clerkUserData,
                    timestamp: Date.now()
                };
                localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
                localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
            } else {
                setUser(null);
            }
            setIsLoading(false);
        }
        
        return () => clearTimeout(timeoutId);
    }, [clerkUser.isLoaded, clerkUser.user]);

    // Separate effect to handle Clerk loading state changes (watches for isLoaded changes)
    useEffect(() => {
        // Only process when Clerk has finished loading
        if (clerkUser.isLoaded) {
            if (clerkUser.user) {
                const clerkUserData: User = {
                    sub: clerkUser.user.id,
                    name: clerkUser.user.fullName || clerkUser.user.firstName || undefined,
                    email: clerkUser.user.primaryEmailAddress?.emailAddress,
                    picture: clerkUser.user.imageUrl,
                };
                setUser(clerkUserData);
                // Cache Clerk user
                const cacheData: CachedUser = {
                    user: clerkUserData,
                    timestamp: Date.now()
                };
                localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
                localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
            } else {
                setUser(null);
            }
            setIsLoading(false);
        }
    }, [clerkUser.isLoaded, clerkUser.user]);

    // Manual refresh function (only use when explicitly needed)
    const refreshUser = useCallback(async () => {
        setIsLoading(true);
        if (clerkUser.isLoaded && clerkUser.user) {
            const clerkUserData: User = {
                sub: clerkUser.user.id,
                name: clerkUser.user.fullName || clerkUser.user.firstName || undefined,
                email: clerkUser.user.primaryEmailAddress?.emailAddress,
                picture: clerkUser.user.imageUrl,
            };
            setUser(clerkUserData);
            const cacheData: CachedUser = {
                user: clerkUserData,
                timestamp: Date.now()
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
            localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        } else {
            clearUserCache();
            setUser(null);
        }
        setIsLoading(false);
    }, [clerkUser.isLoaded, clerkUser.user]);

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
