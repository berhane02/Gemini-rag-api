'use client';

import { useUserContext } from '@/contexts/UserContext';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, LogIn } from 'lucide-react';
import AuthButton from '@/components/AuthButton';

export default function LoginPage() {
  const { user, isLoading } = useUserContext();
  const clerk = useClerk();
  const router = useRouter();

  // Redirect to chat if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/chat');
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

  // If already authenticated, show nothing (will redirect)
  if (user) {
    return null;
  }

  const handleLogin = () => {
    // Don't open sign-in if user is already authenticated
    if (user) {
      router.replace('/chat');
      return;
    }
    
    clerk.openSignIn({ redirectUrl: '/chat' });
  };

  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-gray-50 dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#111111] transition-colors duration-300" />
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl" />
      </div>


      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 bg-white dark:bg-gray-950 p-8 md:p-12 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 text-center max-w-md w-full"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex justify-center mb-8"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-50" />
            <div className="relative h-16 w-16 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
        </motion.div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome Back!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Sign in to continue your conversation.
        </p>

        <motion.button
          onClick={handleLogin}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="group relative w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-semibold text-lg transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-black/20 dark:hover:shadow-white/20 active:scale-95 flex items-center justify-center gap-3"
        >
          <LogIn size={20} />
          <span className="relative z-10">Sign In</span>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity blur-xl -z-10" />
        </motion.button>

        {/* Back to home link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-8"
        >
          <a
            href="/home"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            ← Back to Home
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
}
