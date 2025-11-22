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
    <div className="min-h-screen w-full bg-white dark:bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-900 dark:border-gray-800 p-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Upload Files</h1>
        <div className="flex items-center gap-4">
          <AuthButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Upload Your Documents
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Upload files to your knowledge base. Once uploaded, you can ask questions about them in the chat.
            </p>
          </div>

          {/* File Upload Component */}
          <FileUpload />

          {/* Navigation */}
          <div className="mt-8 flex justify-center gap-4">
            <a
              href="/chat"
              className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              Go to Chat →
            </a>
            <a
              href="/home"
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

