'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    initialValue?: string;
    editing?: boolean;
    onCancelEdit?: () => void;
}

export default function ChatInput({ onSend, disabled, initialValue = '', editing = false, onCancelEdit }: ChatInputProps) {
    const [input, setInput] = useState(initialValue);
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Update input when initialValue changes (for editing)
    useEffect(() => {
        if (editing && initialValue) {
            setInput(initialValue);
            // Focus the textarea when editing
            setTimeout(() => {
                textareaRef.current?.focus();
                const length = initialValue.length;
                textareaRef.current?.setSelectionRange(length, length);
            }, 100);
        } else if (!editing) {
            setInput('');
        }
    }, [initialValue, editing]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (input.trim() && !disabled) {
            onSend(input);
            setInput('');
            if (onCancelEdit) {
                onCancelEdit();
            }
        }
    };

    const handleCancel = () => {
        setInput('');
        if (onCancelEdit) {
            onCancelEdit();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

    const hasInput = input.trim().length > 0;
    const isButtonEnabled = hasInput && !disabled;

    return (
        <form onSubmit={handleSubmit} className="relative w-full max-w-3xl mx-auto p-4">
            <motion.div
                initial={false}
                animate={{
                    scale: isFocused ? 1.02 : 1,
                    boxShadow: isFocused
                        ? '0 20px 60px -15px rgba(59, 130, 246, 0.4)'
                        : '0 8px 30px -10px rgba(59, 130, 246, 0.2)',
                }}
                transition={{ duration: 0.3 }}
                className="relative group"
            >
                <div
                    className={`
                        relative flex items-end gap-2 rounded-xl border-2 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/50 dark:from-blue-950/20 dark:via-gray-900 dark:to-blue-950/10 p-3 shadow-xl transition-all duration-300 overflow-hidden
                        ${isFocused
                            ? 'border-blue-500 dark:border-blue-500 shadow-blue-500/30 scale-[1.02]'
                            : 'border-blue-300 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-blue-500/15'
                        }
                    `}
                >
                    {/* Animated background gradient shimmer - matching FileUpload */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    
                    {/* Additional glow effect on focus */}
                    {isFocused && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-blue-500/5 rounded-xl"
                        />
                    )}
                    
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder="Message Gemini..."
                        rows={1}
                        disabled={disabled}
                        className="relative z-10 min-h-[48px] max-h-[200px] w-full resize-none border-0 bg-transparent px-4 py-3.5 text-sm focus:ring-0 focus:outline-none outline-none disabled:opacity-50 scrollbar-hide text-gray-900 dark:text-gray-100 placeholder:text-blue-400/70 dark:placeholder:text-blue-400/60 transition-colors font-medium"
                        style={{ height: '48px' }}
                    />
                    
                    <AnimatePresence>
                        {editing && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={handleCancel}
                                className="relative mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300"
                                title="Cancel edit"
                            >
                                <X size={18} />
                            </motion.button>
                        )}
                    </AnimatePresence>
                    <motion.button
                        type="submit"
                        disabled={!isButtonEnabled}
                        whileHover={isButtonEnabled ? { scale: 1.08 } : {}}
                        whileTap={isButtonEnabled ? { scale: 0.92 } : {}}
                        className={`
                            relative mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 overflow-hidden
                            ${isButtonEnabled
                                ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60 cursor-pointer'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'
                            }
                        `}
                    >
                        {isButtonEnabled && (
                            <>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                            </>
                        )}
                        <motion.div
                            animate={isButtonEnabled ? { rotate: [0, -10, 10, -10, 0] } : {}}
                            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                            className="relative z-10"
                        >
                            {isButtonEnabled ? (
                                <Sparkles size={20} className="relative z-10" />
                            ) : (
                                <SendHorizontal size={20} />
                            )}
                        </motion.div>
                    </motion.button>
                </div>
            </motion.div>
            
            <AnimatePresence>
                {editing && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-2 text-center"
                    >
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                            Editing message...
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-3 text-center"
            >
                <p className="text-xs text-blue-500/80 dark:text-blue-400/70 font-medium">
                    Gemini can make mistakes. Check important info.
                </p>
            </motion.div>
        </form>
    );
}
