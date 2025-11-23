'use client';

import { useUserContext } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import LandingPage from '@/components/LandingPage';

export default function HomePageRoute() {
  const { user, isLoading } = useUserContext();
  const router = useRouter();
  const hasRedirected = useRef(false);

  // Redirect authenticated users to chat
  useEffect(() => {
    if (!isLoading && user && !hasRedirected.current) {
      hasRedirected.current = true;
      // Use setTimeout to ensure router is ready and avoid race conditions
      const redirectTimer = setTimeout(() => {
        try {
          if (typeof window !== 'undefined' && window.location.pathname !== '/chat') {
            router.replace('/chat');
          }
        } catch (error) {
          console.error('Error redirecting to chat:', error);
          // Fallback to push if replace fails
          try {
      router.push('/chat');
          } catch (pushError) {
            console.error('Error pushing to chat:', pushError);
            // Last resort: use window.location
            if (typeof window !== 'undefined') {
              window.location.href = '/chat';
            }
          }
        }
      }, 0);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [user, isLoading, router]);

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

  // If authenticated, show nothing (will redirect via useEffect)
  if (user) {
    return null;
  }

  // Show landing page for unauthenticated users
  return <LandingPage />;
}

