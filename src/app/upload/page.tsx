'use client';

import { useUserContext } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import FileUpload from '@/components/FileUpload';
import AuthButton from '@/components/AuthButton';

export default function UploadPage() {
  const { user, isLoading } = useUserContext();
  const router = useRouter();

  // Redirect to chat page if authenticated (keep users in chat unless they logout)
  // Redirect to home page if not authenticated
  // This hook must be called before any conditional returns
  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace('/chat');
      } else {
        router.replace('/home');
      }
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

  // If not loading, show nothing (will redirect via useEffect)
  return null;
}

