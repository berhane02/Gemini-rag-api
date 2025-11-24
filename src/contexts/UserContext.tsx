'use client';

import { createContext, useContext, ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import { useUser as useClerkUser } from '@clerk/nextjs';
import { logger } from '@/lib/logger';

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
const CACHE_KEY_PREFIX = 'clerk_user_cache_';
const CACHE_TIMESTAMP_KEY_PREFIX = 'clerk_user_cache_timestamp_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const CURRENT_USER_KEY = 'current_user_id'; // Track which user is currently logged in

interface CachedUser {
    user: User | null;
    timestamp: number;
}

// Get user-specific cache keys
function getUserCacheKeys(userId: string) {
    return {
        cacheKey: `${CACHE_KEY_PREFIX}${userId}`,
        timestampKey: `${CACHE_TIMESTAMP_KEY_PREFIX}${userId}`
    };
}

// Clear cache helper for specific user
function clearUserCache(userId?: string) {
    try {
        if (userId) {
            // Clear specific user's cache
            const { cacheKey, timestampKey } = getUserCacheKeys(userId);
            localStorage.removeItem(cacheKey);
            localStorage.removeItem(timestampKey);
        } else {
            // Clear all user caches (fallback)
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(CACHE_KEY_PREFIX) || key.startsWith(CACHE_TIMESTAMP_KEY_PREFIX)) {
                    localStorage.removeItem(key);
                }
            });
        }
    } catch (err) {
        logger.error('Error clearing cache', err);
    }
}

// Clear cache from previous user when new user logs in
function clearPreviousUserCache(currentUserId: string) {
    try {
        const previousUserId = localStorage.getItem(CURRENT_USER_KEY);
        if (previousUserId && previousUserId !== currentUserId) {
            // Clear previous user's cache
            clearUserCache(previousUserId);
        }
        // Update current user ID
        localStorage.setItem(CURRENT_USER_KEY, currentUserId);
    } catch (err) {
        logger.error('Error clearing previous user cache', err);
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
                logger.warn('Clerk is taking longer than expected to load. Setting loading to false.');
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
                // Clear previous user's cache if different user
                clearPreviousUserCache(clerkUser.user.id);
                setUser(clerkUserData);
                const { cacheKey, timestampKey } = getUserCacheKeys(clerkUser.user.id);
                const cacheData: CachedUser = {
                    user: clerkUserData,
                    timestamp: Date.now()
                };
                localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                localStorage.setItem(timestampKey, Date.now().toString());
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
                // Clear previous user's cache if different user
                clearPreviousUserCache(clerkUser.user.id);
                setUser(clerkUserData);
                // Cache Clerk user with user-specific key
                const { cacheKey, timestampKey } = getUserCacheKeys(clerkUser.user.id);
                const cacheData: CachedUser = {
                    user: clerkUserData,
                    timestamp: Date.now()
                };
                localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                localStorage.setItem(timestampKey, Date.now().toString());
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
            // Clear previous user's cache if different user
            clearPreviousUserCache(clerkUser.user.id);
            setUser(clerkUserData);
            const { cacheKey, timestampKey } = getUserCacheKeys(clerkUser.user.id);
            const cacheData: CachedUser = {
                user: clerkUserData,
                timestamp: Date.now()
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            localStorage.setItem(timestampKey, Date.now().toString());
        } else {
            const currentUserId = localStorage.getItem(CURRENT_USER_KEY);
            if (currentUserId) {
                clearUserCache(currentUserId);
                localStorage.removeItem(CURRENT_USER_KEY);
            }
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
export function clearAuthCache(userId?: string) {
    clearUserCache(userId);
    if (userId) {
        localStorage.removeItem(CURRENT_USER_KEY);
    }
}
