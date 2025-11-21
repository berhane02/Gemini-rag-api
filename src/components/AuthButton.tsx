'use client';

import { useUserContext, clearAuthCache } from '@/contexts/UserContext';
import { LogIn, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { memo } from 'react';

function AuthButton() {
    const { user, isLoading } = useUserContext();

    if (isLoading) {
        return (
            <div className="h-10 w-10 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full" />
        );
    }

    if (user) {
        return (
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <img
                        src={user.picture || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
                        alt={user.name || 'User'}
                        className="w-8 h-8 rounded-full border-2 border-blue-500 dark:border-blue-400 shadow-sm"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden md:block max-w-[120px] truncate">
                        {user.name || user.email}
                    </span>
                </div>
                <motion.a
                    href="/api/auth/logout"
                    onClick={() => {
                        // Clear cache on logout
                        clearAuthCache();
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                    title="Logout"
                >
                    <LogOut size={16} />
                    <span className="hidden md:inline">Logout</span>
                </motion.a>
            </div>
        );
    }

    return (
        <motion.a
            href="/api/auth/login"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-lg transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
            title="Login"
        >
            <LogIn size={18} />
            <span>Login</span>
        </motion.a>
    );
}

export default memo(AuthButton);
