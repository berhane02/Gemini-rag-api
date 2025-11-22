'use client';

import { useUserContext } from '@/contexts/UserContext';
import { useClerk } from '@clerk/nextjs';
import { LogIn, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { memo } from 'react';

function AuthButton() {
    const { user, isLoading } = useUserContext();
    const clerk = useClerk();

    if (isLoading) {
        return (
            <div className="h-10 w-10 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full" />
        );
    }

    if (user) {
        return (
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <div className="relative">
                        <img
                            src={user.picture || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
                            alt={user.name || 'User'}
                            className="w-8 h-8 rounded-full border-2 border-blue-500 dark:border-blue-400 shadow-sm object-cover object-center ring-2 ring-blue-500/20 dark:ring-blue-400/20"
                            style={{ objectPosition: 'center center' }}
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[100px]">
                            {user.name || 'User'}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[100px]">
                            {user.email}
                        </span>
                    </div>
                </div>
                <motion.button
                    onClick={() => {
                        clerk.signOut({ redirectUrl: '/home' });
                    }}
                    whileHover={{ scale: 1.05, x: 2 }}
                    whileTap={{ scale: 0.95 }}
                    className="group relative flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-red-500 via-red-600 to-red-500 hover:from-red-600 hover:via-red-700 hover:to-red-600 rounded-lg transition-all duration-200 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 overflow-hidden"
                    title="Logout"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <LogOut size={16} className="relative z-10" />
                    <span className="hidden md:inline relative z-10">Logout</span>
                </motion.button>
            </div>
        );
    }

    return (
        <motion.button
            onClick={() => {
                // Only open sign-in if user is not already signed in
                if (!user) {
                    clerk.openSignIn({ redirectUrl: '/chat' });
                }
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-lg transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
            title="Login"
        >
            <LogIn size={18} />
            <span>Login</span>
        </motion.button>
    );
}

export default memo(AuthButton);
