'use client';

import { ArrowRight, Sparkles, Zap, Shield, Brain, MessageSquare, Cpu, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUserContext } from '@/contexts/UserContext';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';
import AuthButton from './AuthButton';

// Typewriter component for generating text effect - Optimized
function TypewriterText({ text, speed = 100 }: { text: string; speed?: number }) {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, speed);

            return () => clearTimeout(timeout);
        }
    }, [currentIndex, text, speed]);

    return (
        <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">
            {displayedText}
        </span>
    );
}

export default function LandingPage() {
    const { user, isLoading } = useUserContext();
    const clerk = useClerk();
    const router = useRouter();
    
    // Redirect authenticated users to chat immediately
    useEffect(() => {
        if (!isLoading && user) {
            router.replace('/chat');
        }
    }, [user, isLoading, router]);
    
    const handleLogin = useCallback(() => {
        // If user is already authenticated, go to chat
        if (user) {
            router.replace('/chat');
            return;
        }
        
        clerk.openSignIn({ redirectUrl: '/chat' });
    }, [user, router, clerk]);
    
    const handleGoToChat = useCallback(() => {
        router.replace('/chat');
    }, [router]);
    
    // Memoize features to prevent unnecessary re-renders
    const features = useMemo(() => [
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
    ], []);

    // If authenticated, show nothing (will redirect via useEffect)
    if (!isLoading && user) {
        return null;
    }

    return (
        <div className="min-h-screen w-full bg-white dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-4 overflow-hidden relative transition-colors duration-300">
            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-gray-50 dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#111111] transition-colors duration-300" />
            
            {/* Ambient glow effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            {/* Stars animation - Optimized with CSS for better performance */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                {/* Reduced star count and using CSS animations */}
                {[...Array(20)].map((_, i) => {
                    const size = Math.random() * 2 + 1;
                    const left = Math.random() * 100;
                    const top = Math.random() * 100;
                    const delay = Math.random() * 3;
                    const duration = 3 + Math.random() * 2;
                    
                    return (
                        <div
                            key={i}
                            className="absolute rounded-full bg-white dark:bg-white star-twinkle"
                            style={{
                                width: `${size}px`,
                                height: `${size}px`,
                                left: `${left}%`,
                                top: `${top}%`,
                                boxShadow: `0 0 ${size * 2}px rgba(255, 255, 255, 0.8)`,
                                animation: `starTwinkle ${duration}s ease-in-out infinite`,
                                animationDelay: `${delay}s`,
                                willChange: 'opacity, transform',
                            }}
                        />
                    );
                })}
                
                {/* Larger twinkling stars - reduced count */}
                {[...Array(8)].map((_, i) => {
                    const size = Math.random() * 3 + 2;
                    const left = Math.random() * 100;
                    const top = Math.random() * 100;
                    const delay = Math.random() * 4;
                    const duration = 4 + Math.random() * 2;
                    
                    return (
                        <div
                            key={`large-${i}`}
                            className="absolute rounded-full bg-white dark:bg-white star-twinkle-large"
                            style={{
                                width: `${size}px`,
                                height: `${size}px`,
                                left: `${left}%`,
                                top: `${top}%`,
                                boxShadow: `0 0 ${size * 3}px rgba(255, 255, 255, 1), 0 0 ${size * 6}px rgba(147, 197, 253, 0.5)`,
                                animation: `starTwinkleLarge ${duration}s ease-in-out infinite`,
                                animationDelay: `${delay}s`,
                                willChange: 'opacity, transform',
                            }}
                        />
                    );
                })}
            </div>

            {/* Auth button */}
            <div className="absolute top-6 right-6 z-20 flex items-center gap-4">
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
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="flex justify-center mb-8"
                    >
                        <div className="relative">
                            {/* Background text generation effect - Matrix-style rain - Optimized with CSS */}
                            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                                {/* Reduced columns and using CSS animations for better performance */}
                                {[...Array(8)].map((_, i) => {
                                    const chars = '01AIαβγδεζηθικλμνξοπρστυφχψωRAGGPTLLM';
                                    const randomChars = Array.from({ length: 6 }, () => 
                                        chars[Math.floor(Math.random() * chars.length)]
                                    ).join('');
                                    const delay = Math.random() * 2;
                                    const duration = 3 + Math.random() * 1.5;
                                    
                                    return (
                                        <div
                                            key={i}
                                            className="absolute text-[10px] md:text-xs font-mono text-green-400/30 dark:text-green-300/20 whitespace-nowrap matrix-rain"
                                            style={{
                                                left: `${8 + (i % 4) * 25}%`,
                                                fontFamily: 'monospace',
                                                textShadow: '0 0 5px rgba(34, 197, 94, 0.5)',
                                                animation: `matrixFall ${duration}s linear infinite`,
                                                animationDelay: `${delay}s`,
                                                willChange: 'transform, opacity',
                                            }}
                                        >
                                            {randomChars}
                                        </div>
                                    );
                                })}
                                
                                {/* Reduced falling characters */}
                                {[...Array(5)].map((_, i) => {
                                    const singleChars = '01AIαβγδεζηθικλμνξοπρστυφχψω';
                                    const char = singleChars[Math.floor(Math.random() * singleChars.length)];
                                    const delay = Math.random() * 1.5;
                                    const duration = 2 + Math.random() * 1;
                                    
                                    return (
                                        <span
                                            key={`char-${i}`}
                                            className="absolute text-xs font-mono text-green-500/40 dark:text-green-400/30 matrix-char"
                                            style={{
                                                left: `${12 + (i % 3) * 28}%`,
                                                textShadow: '0 0 3px rgba(34, 197, 94, 0.6)',
                                                animation: `matrixFallChar ${duration}s linear infinite`,
                                                animationDelay: `${delay}s`,
                                                willChange: 'transform',
                                            }}
                                        >
                                            {char}
                                        </span>
                                    );
                                })}
                            </div>
                            {/* Glow rings - static */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl blur-2xl opacity-60" />
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-3xl blur-3xl opacity-45" />
                            
                            {/* Main icon container - static */}
                            <div className="relative h-24 w-24 md:h-28 md:w-28 z-10">
                                {/* Glass morphism effect - static */}
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/90 via-purple-600/90 to-pink-500/90 rounded-3xl backdrop-blur-xl border-2 border-white/30 dark:border-white/20 shadow-2xl" />
                                
                                {/* Inner glow - static */}
                                <div className="absolute inset-2 bg-gradient-to-br from-blue-400/50 to-purple-500/50 rounded-2xl blur-md" />
                                
                                {/* Icon - static */}
                                <div className="relative h-full w-full flex items-center justify-center">
                                    {/* Main sparkles icon */}
                                    <Sparkles className="h-12 w-12 md:h-14 md:w-14 text-white drop-shadow-lg" strokeWidth={2.5} />
                                </div>
                                
                                {/* CPU/Activity indicator - showing processing */}
                                <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full p-1.5 shadow-lg z-20">
                                    <Activity className="w-3 h-3 text-white" />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Main heading with typing effect */}
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
                    >
                        <span className="relative inline-block">
                            {/* Typing effect text */}
                            <TypewriterText 
                                text="🤖 RAG Chatbot"
                                speed={100}
                            />
                            
                            {/* Animated gradient background - Optimized with CSS */}
                            <span
                                className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 via-pink-600 to-blue-600 bg-[length:200%_100%] bg-clip-text text-transparent pointer-events-none gradient-shift"
                                style={{ 
                                    backgroundSize: '200% 100%',
                                    willChange: 'background-position',
                                }}
                            />
                            
                            {/* Animated underline - slower */}
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ delay: 1.5, duration: 1.5, ease: "easeOut" }}
                                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                            />
                            
                            
                        </span>
                        
                        {/* Animated emoji - Optimized with CSS */}
                        <span
                            className="inline-block ml-2 emoji-float"
                            style={{
                                willChange: 'transform',
                            }}
                        >
                            🤖
                        </span>
                        
                        {/* Floating particles around text - slower */}
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed"
                    >
                        ✨ Your intelligent assistant powered by Google Gemini. Ask questions, get instant answers from your knowledge base. 🚀
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
                        className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8"
                    >
                        {features.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
                                    className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-800/50 backdrop-blur-sm hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-200"
                                >
                                    <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 mb-3 sm:mb-4 mx-auto">
                                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                    </div>
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2">
                                        {feature.title}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
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
                        <span>⚡ Powered by Google Gemini AI</span>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
