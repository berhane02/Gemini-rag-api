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

  // Aggressively prevent back navigation to OAuth or other pages when authenticated
  useEffect(() => {
    if (!isLoading && user && typeof window !== 'undefined') {
      // Function to check if URL is OAuth-related
      const isOAuthUrl = (url: string) => {
        return url.includes('accounts.google.com') || 
               url.includes('oauth') || 
               url.includes('signin') ||
               url.includes('clerk.shared.lcl.dev/v1/oauth_callback');
      };

      // Function to ensure we're on chat page
      const ensureOnChat = () => {
        const currentUrl = window.location.href;
        const currentPath = window.location.pathname;
        
        // If we're on OAuth URL or not on chat, immediately redirect
        if (isOAuthUrl(currentUrl) || currentPath !== '/chat') {
          // Replace current state immediately
          window.history.replaceState({ page: 'chat', preventBack: true }, '', '/chat');
          // Push multiple states to create buffer
          for (let i = 0; i < 5; i++) {
            window.history.pushState({ page: 'chat', preventBack: true }, '', '/chat');
          }
          // Force navigation
          router.replace('/chat');
          return true;
        }
        return false;
      };

      // Immediately ensure we're on chat when component mounts
      ensureOnChat();
      
      // Push multiple chat states to create a deep buffer
      // This ensures back button has many chat entries before reaching OAuth
      for (let i = 0; i < 10; i++) {
        window.history.pushState({ page: 'chat', preventBack: true }, '', '/chat');
      }
      
      let isHandlingPopState = false;
      let backButtonPressCount = 0;
      
      const handlePopState = (event: PopStateEvent) => {
        // Prevent infinite loops
        if (isHandlingPopState) return;
        isHandlingPopState = true;
        
        backButtonPressCount++;
        
        // Check current URL and pathname
        const currentUrl = window.location.href;
        const currentPath = window.location.pathname;
        
        // If we detect OAuth URL or not on chat, immediately redirect
        if (isOAuthUrl(currentUrl) || currentPath !== '/chat') {
          // Replace the current state with chat
          window.history.replaceState({ page: 'chat', preventBack: true }, '', '/chat');
          // Push many more states to maintain deep buffer
          for (let i = 0; i < 10; i++) {
            window.history.pushState({ page: 'chat', preventBack: true }, '', '/chat');
          }
          // Force navigation back to chat
          router.replace('/chat');
          isHandlingPopState = false;
          return;
        }
        
        // We're on chat, but back was pressed - push more states to maintain buffer
        // Push multiple states each time back is pressed to maintain deep buffer
        for (let i = 0; i < 5; i++) {
          window.history.pushState({ page: 'chat', preventBack: true }, '', '/chat');
        }
        
        setTimeout(() => {
          isHandlingPopState = false;
        }, 10);
      };

      // Add popstate listener with high priority
      window.addEventListener('popstate', handlePopState, true);
      
      // Handle hashchange in case OAuth uses hash fragments
      const handleHashChange = () => {
        ensureOnChat();
      };
      
      window.addEventListener('hashchange', handleHashChange, true);
      
      // Aggressive location monitoring - check frequently
      const checkLocation = () => {
        const currentUrl = window.location.href;
        const currentPath = window.location.pathname;
        
        // If we detect OAuth URL or not on chat, redirect immediately
        if (isOAuthUrl(currentUrl) || (currentPath !== '/chat' && !currentPath.includes('/chat'))) {
          ensureOnChat();
        }
      };
      
      // Check location very frequently to catch any navigation attempts
      const locationCheckInterval = setInterval(checkLocation, 50);

      // Also monitor for any URL changes using MutationObserver as fallback
      let lastUrl = window.location.href;
      const urlCheckInterval = setInterval(() => {
        if (window.location.href !== lastUrl) {
          lastUrl = window.location.href;
          checkLocation();
        }
      }, 50);

      return () => {
        window.removeEventListener('popstate', handlePopState, true);
        window.removeEventListener('hashchange', handleHashChange, true);
        clearInterval(locationCheckInterval);
        clearInterval(urlCheckInterval);
      };
    }
  }, [user, isLoading, router]);

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

    // Redirect to home using replace to avoid adding to history
    router.replace('/home');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIdRef.current, isLoading]); // Only depend on userId, not entire user object

  // Show loading state
  if (isLoading) {
    return (
      <div className="chat-page-container chat-page-loading min-h-screen w-full bg-white dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="chat-page-loading-content flex flex-col items-center gap-4">
          <div className="chat-page-loading-spinner h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="chat-page-loading-text text-gray-600 dark:text-gray-400">Loading...</p>
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
