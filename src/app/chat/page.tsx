'use client';

import { useUserContext } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import ChatInterface from '@/components/ChatInterface';

export default function ChatPage() {
  const { user, isLoading } = useUserContext();
  const router = useRouter();
  const hasRedirected = useRef(false);
  const mountedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  // Track mount state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Memoize user ID to prevent unnecessary re-renders
  const currentUserId = user?.sub || null;
  if (currentUserId !== userIdRef.current) {
    userIdRef.current = currentUserId;
  }

  // Redirect to home page if not authenticated
  useEffect(() => {
    // Don't do anything while loading or before mount
    if (isLoading || !mountedRef.current) {
      return;
    }

    // If user is authenticated, clear redirect flag and return early
    if (user) {
      hasRedirected.current = false;
      return;
    }

    // Only redirect once - if we've already redirected, don't do anything
    if (hasRedirected.current) {
      return;
    }

    // Set redirect flag immediately to prevent multiple redirects
    hasRedirected.current = true;

    // Redirect to home
    router.push('/home');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIdRef.current, isLoading]); // Only depend on userId, not entire user object

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
  if (!user) {
    return null;
  }

  // If authenticated, show chat interface
  // Use user?.sub as key to prevent remounting when user object reference changes
  return <ChatInterface key={user?.sub || 'default'} user={user} />;
}
