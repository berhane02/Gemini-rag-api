'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useMemo } from 'react';
import ChatInterface from '@/components/ChatInterface';

export default function ChatPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const hasRedirected = useRef(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Memoize user state to prevent unnecessary re-renders
  const isAuthenticated = useMemo(() => !!user, [user]);

  // Redirect to home page if not authenticated
  // This hook must be called before any conditional returns
  useEffect(() => {
    // Don't do anything while loading
    if (isLoading) {
      return;
    }

    // If user exists, reset redirect flag and clear any pending redirects
    if (isAuthenticated) {
      hasRedirected.current = false;
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
      return;
    }

    // Only redirect once and only when we're sure the user is not authenticated
    // Skip if we've already redirected
    if (hasRedirected.current) {
      return;
    }

    // Clear any existing timeout before setting a new one
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
    }
    
    // Add a delay to prevent rapid re-renders from causing redirect loops
    redirectTimeoutRef.current = setTimeout(() => {
      // Double-check user state before redirecting
      if (!isAuthenticated && !hasRedirected.current) {
        hasRedirected.current = true;
        router.push('/home');
      }
    }, 300);

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, [isAuthenticated, isLoading, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-white dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show nothing (will redirect via useEffect)
  if (!isAuthenticated) {
    return null;
  }

  // If authenticated, show chat interface
  return <ChatInterface />;
}

