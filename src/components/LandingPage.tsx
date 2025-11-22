'use client';

import { ArrowRight, Sparkles, Zap, Shield, Brain, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUserContext } from '@/contexts/UserContext';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import AuthButton from './AuthButton';

export default function LandingPage() {
    const { user } = useUserContext();
    const clerk = useClerk();
    const router = useRouter();
    
    const handleLogin = () => {
        // If user is already authenticated, go to chat
        if (user) {
            router.push('/chat');
            return;
        }
        
        clerk.openSignIn({ redirectUrl: '/chat' });
    };
    
    const handleGoToChat = () => {
        router.push('/chat');
    };
    const features = [
        {
            icon: Brain,
            title: 'Intelligent RAG',
            description: 'Retrieval-Augmented Generation for accurate answers'
        },
        {
            icon: Zap,
            title: 'Lightning Fast',
            description: 'Powered by Google Gemini for instant responses'
        },
        {
            icon: Shield,
            title: 'Secure & Private',
            description: 'Your data is protected with enterprise-grade security'
        }
    ];

    return (
        <div className="min-h-screen w-full bg-white dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-4 overflow-hidden relative transition-colors duration-300">
            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-gray-50 dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#111111] transition-colors duration-300" />
            
            {/* Ambient glow effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            {/* Theme toggle and Auth button */}
            <div className="absolute top-6 right-6 z-20 flex items-center gap-4">
                <ThemeToggle />
                <AuthButton />
            </div>

            {/* Main content */}
            <div className="relative z-10 w-full max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="text-center mb-12"
                >
                    {/* Logo/Icon */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="flex justify-center mb-8"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-50" />
                            <div className="relative h-20 w-20 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                                <Sparkles className="h-10 w-10 text-white" />
                            </div>
                        </div>
                    </motion.div>

                    {/* Main heading */}
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent leading-tight"
                    >
                        RAG Chatbot
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed"
                    >
                        Your intelligent assistant powered by Google Gemini. Ask questions, get instant answers from your knowledge base.
                    </motion.p>

                    {/* CTA Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="flex justify-center mb-16"
                    >
                        {user ? (
                            <button
                                onClick={handleGoToChat}
                                className="group relative px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-full font-semibold text-lg transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-black/20 dark:hover:shadow-white/20 active:scale-95"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    Go to Chat
                                    <MessageSquare className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity blur-xl -z-10" />
                            </button>
                        ) : (
                            <button
                                onClick={handleLogin}
                                className="group relative px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-full font-semibold text-lg transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-black/20 dark:hover:shadow-white/20 active:scale-95"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    Get Started
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity blur-xl -z-10" />
                            </button>
                        )}
                    </motion.div>

                    {/* Features grid */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
                    >
                        {features.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
                                    className="p-6 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-800/50 backdrop-blur-sm hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-200"
                                >
                                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 mb-4 mx-auto">
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        {feature.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {feature.description}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </motion.div>

                    {/* Footer note */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1, duration: 0.5 }}
                        className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-500"
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>Powered by Google Gemini AI</span>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
