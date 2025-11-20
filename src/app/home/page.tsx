'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import LandingPage from '@/components/LandingPage';

export default function HomePageRoute() {
  const { user, isLoading } = useUser();

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

  // Always show home page (for both authenticated and unauthenticated users)
  return <LandingPage />;
}

