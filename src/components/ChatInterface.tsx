'use client';

import React, { useState, useRef, useEffect, memo } from 'react';
import FileUpload from './FileUpload';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import AuthButton from './AuthButton';
import ThemeToggle from './ThemeToggle';
import { User, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Message {
    role: 'user' | 'model';
    content: string;
}

interface ChatInterfaceProps {
    user: {
        sub?: string;
        name?: string;
        email?: string;
        picture?: string;
        [key: string]: any;
    };
}

const STORAGE_KEY = 'chat-messages';

function ChatInterfaceComponent({ user }: ChatInterfaceProps) {
    // Load messages from localStorage on mount
    const [messages, setMessages] = useState<Message[]>(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    return JSON.parse(saved);
                }
            } catch (error) {
                console.error('Error loading messages from localStorage:', error);
            }
        }
        return [];
    });
    const [isLoading, setIsLoading] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editContent, setEditContent] = useState<string>('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastMessageLengthRef = useRef<number>(0);
    const isInitialMount = useRef(true);

    // Save messages to localStorage whenever they change
    useEffect(() => {
        // Skip saving on initial mount to avoid overwriting with empty array
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        } catch (error) {
            console.error('Error saving messages to localStorage:', error);
        }
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        // Only scroll if messages length actually changed
        if (messages.length !== lastMessageLengthRef.current && messages.length > 0) {
            lastMessageLengthRef.current = messages.length;
            scrollToBottom();
        }
    }, [messages.length]); // Only depend on length to prevent excessive scrolling

    const handleClearChat = () => {
        if (confirm('Are you sure you want to clear all chat messages? This cannot be undone.')) {
            setMessages([]);
            setEditingIndex(null);
            setEditContent('');
            // Clear from localStorage
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (error) {
                console.error('Error clearing messages from localStorage:', error);
            }
        }
    };

    const handleEdit = (index: number, content: string) => {
        setEditingIndex(index);
        setEditContent(content);
        // Scroll to input field when editing starts
        setTimeout(() => {
            const inputElement = document.querySelector('textarea');
            if (inputElement) {
                inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 200);
    };

    const handleSend = async (content: string) => {
        // If editing, remove the old message and all subsequent messages (including AI response)
        if (editingIndex !== null) {
            setMessages((prev) => prev.slice(0, editingIndex));
            setEditingIndex(null);
            setEditContent('');
        }

        const userMessage: Message = { role: 'user', content };
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: content }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || `Server error: ${response.status}`;
                throw new Error(errorMessage);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader available');

            let aiMessage: Message = { role: 'model', content: '' };
            setMessages((prev) => [...prev, aiMessage]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = new TextDecoder().decode(value);
                aiMessage = { ...aiMessage, content: aiMessage.content + text };

                setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = aiMessage;
                    return newMessages;
                });
            }
        } catch (error) {
            console.error('Error sending message:', error);
            let errorMessage = 'Sorry, I encountered an error. Please try again.';
            
            if (error instanceof Error) {
                if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    errorMessage = 'Network error: Unable to connect to the server. Please check your connection and try again.';
                } else if (error.message.includes('Unauthorized')) {
                    errorMessage = 'Authentication error: Please log in again.';
                } else if (error.message) {
                    errorMessage = `Error: ${error.message}`;
                }
            }
            
            setMessages((prev) => [
                ...prev,
                { role: 'model', content: errorMessage },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen flex-col bg-white dark:bg-gray-950">
            <header className="border-b bg-white dark:bg-gray-900 dark:border-gray-800 p-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
                <h1 className="text-xl font-semibold text-gray-800 dark:text-white">RAG Chatbot</h1>
                <div className="flex items-center gap-3">
                    {messages.length > 0 && (
                        <motion.button
                            onClick={handleClearChat}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="Clear chat"
                            aria-label="Clear chat"
                        >
                            <Trash2 size={18} />
                        </motion.button>
                    )}
                    <ThemeToggle />
                    <AuthButton />
                </div>
            </header>

            <main className="flex-1 overflow-y-auto scroll-smooth relative">
                <div className="mx-auto max-w-3xl px-4">
                    {/* Sticky file upload at top */}
                    <div className="sticky top-0 z-20 bg-white dark:bg-gray-950 pt-4 pb-2">
                        <FileUpload />
                    </div>

                    {/* Scrollable content area */}
                    <div className="px-4 pb-8">
                        {messages.length === 0 ? (
                            <div className="flex h-[60vh] flex-col items-center justify-center text-center">
                                <div className="mb-6 rounded-full bg-gray-50 p-4 dark:bg-gray-800/50">
                                    {user?.picture ? (
                                        <img
                                            src={user.picture}
                                            alt={user.name || 'User'}
                                            className="h-12 w-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                            <User className="h-6 w-6 text-white" />
                                        </div>
                                    )}
                                </div>
                                <h2 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">
                                    How can I help you today?
                                </h2>
                                <p className="mb-8 max-w-md text-gray-500 dark:text-gray-400">
                                    I can help you answer questions about your knowledge base, analyze documents, and more.
                                </p>

                                <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                                    {[
                                        "What is in the knowledge base?",
                                        "Summarize the uploaded document",
                                        "Explain the key concepts",
                                        "Help me write an email"
                                    ].map((prompt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSend(prompt)}
                                            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 text-left text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            <span>{prompt}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 pb-4">
                                {messages.map((msg, i) => (
                                    <MessageBubble
                                        key={i}
                                        message={msg}
                                        messageIndex={i}
                                        onEdit={handleEdit}
                                    />
                                ))}
                                {isLoading && (
                                    <div className="flex items-center gap-2 px-4 py-2 text-gray-400">
                                        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-600" />
                                        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-600 delay-75" />
                                        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-600 delay-150" />
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <div className="sticky bottom-0 bg-gradient-to-t from-white via-blue-50/30 to-transparent dark:from-gray-950 dark:via-blue-950/20 pb-4 pt-10 backdrop-blur-sm">
                <div className="relative">
                    {/* Animated blue glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 animate-pulse" />
                    <ChatInput
                        onSend={handleSend}
                        disabled={isLoading}
                        initialValue={editContent}
                        editing={editingIndex !== null}
                        onCancelEdit={() => {
                            // Cancel editing - restore original state
                            setEditingIndex(null);
                            setEditContent('');
                            // Note: Messages weren't removed in handleEdit, so nothing to restore
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

// Memoize to prevent unnecessary re-renders when parent re-renders
export default memo(ChatInterfaceComponent);
