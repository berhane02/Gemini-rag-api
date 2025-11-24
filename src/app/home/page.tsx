'use client';

import { useUserContext } from '@/contexts/UserContext';
import LandingPage from '@/components/LandingPage';

export default function HomePageRoute() {
  const { isLoading } = useUserContext();

  // Show loading state
  if (isLoading) {
    return (
      <div className="home-page-container home-page-loading min-h-screen w-full bg-white dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="home-page-loading-content flex flex-col items-center gap-4">
          <div className="home-page-loading-spinner h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="home-page-loading-text text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page for all users (authenticated or not)
  return <LandingPage />;
}

