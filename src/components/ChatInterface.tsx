'use client';

import React, { useState, useRef, useEffect, memo } from 'react';
import { useRouter } from 'next/navigation';
import FileUpload from './FileUpload';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import AuthButton from './AuthButton';
import ConfirmDialog from './ConfirmDialog';
import ConversationHistory from './ConversationHistory';
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
    const router = useRouter();
    
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
    
    // Additional safeguard: prevent navigation away from chat
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Function to check if URL is OAuth-related
            const isOAuthUrl = (url: string) => {
                return url.includes('accounts.google.com') || 
                       url.includes('oauth') || 
                       url.includes('signin') ||
                       url.includes('clerk.shared.lcl.dev/v1/oauth_callback');
            };

            // Function to ensure we're on chat page
            const ensureOnChat = () => {
                const currentUrl = window.location.href;
                const currentPath = window.location.pathname;
                
                // If we're on OAuth URL or not on chat, immediately redirect
                if (isOAuthUrl(currentUrl) || currentPath !== '/chat') {
                    window.history.replaceState({ page: 'chat' }, '', '/chat');
                    router.replace('/chat');
                    return true;
                }
                return false;
            };

            // Check immediately
            ensureOnChat();
            
            // Monitor location changes aggressively
            const checkLocation = () => {
                const currentUrl = window.location.href;
                const currentPath = window.location.pathname;
                
                if (isOAuthUrl(currentUrl) || (currentPath !== '/chat' && !currentPath.includes('/chat'))) {
                    ensureOnChat();
                }
            };
            
            // Check frequently
            const locationCheckInterval = setInterval(checkLocation, 100);
            
            // Monitor popstate events
            const handlePopState = () => {
                checkLocation();
            };
            
            window.addEventListener('popstate', handlePopState);
            
            return () => {
                clearInterval(locationCheckInterval);
                window.removeEventListener('popstate', handlePopState);
            };
        }
    }, []);
    const [isLoading, setIsLoading] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editContent, setEditContent] = useState<string>('');
    const [showClearDialog, setShowClearDialog] = useState(false);
    const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);
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
        setShowClearDialog(true);
    };

    const confirmClearChat = () => {
        setMessages([]);
        setEditingIndex(null);
        setEditContent('');
        setSelectedHistoryIndex(null);
        // Clear from localStorage
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('Error clearing messages from localStorage:', error);
        }
    };

    const handleEdit = (index: number, content: string) => {
        setEditingIndex(index);
        setEditContent(content);
        setSelectedHistoryIndex(index);
        // Scroll to input field when editing starts
        setTimeout(() => {
            const inputElement = document.querySelector('textarea');
            if (inputElement) {
                inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 200);
    };

    const handleHistoryClick = (index: number) => {
        setSelectedHistoryIndex(index);
        // Scroll to the selected message in the main chat area
        setTimeout(() => {
            const messageElement = document.querySelector(`[data-message-index="${index}"]`);
            if (messageElement) {
                messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
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
        <div className="chat-interface-container flex h-screen flex-col bg-white dark:bg-gray-950">
            {/* Navbar - Smaller */}
            <header className="chat-header border-b bg-white dark:bg-gray-900 dark:border-gray-800 px-4 py-2 shadow-sm flex justify-between items-center sticky top-0 z-20">
                <h1 className="chat-header-title text-lg font-semibold text-gray-800 dark:text-white">RAG Chatbot</h1>
                <div className="chat-header-actions flex items-center gap-2">
                    {messages.length > 0 && (
                        <motion.button
                            onClick={handleClearChat}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="clear-chat-button p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="Clear chat"
                            aria-label="Clear chat"
                        >
                            <Trash2 size={16} />
                        </motion.button>
                    )}
                    <AuthButton />
                </div>
            </header>

            {/* Content Area - History on Left, Chat on Right */}
            <div className="chat-content-area flex-1 flex overflow-hidden">
                {/* Chat History - Left Sidebar Below Navbar */}
                {messages.length > 0 && (
                    <div className="chat-history-sidebar hidden lg:flex w-80 shrink-0 flex-col border-r border-gray-200 dark:border-gray-800 h-full">
                        <ConversationHistory
                            messages={messages}
                            onMessageClick={handleHistoryClick}
                            selectedIndex={selectedHistoryIndex}
                        />
                    </div>
                )}

                {/* Main Chat Area */}
                <div className="main-chat-area flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* Clear Chat Confirmation Dialog */}
                    <ConfirmDialog
                        isOpen={showClearDialog}
                        onClose={() => setShowClearDialog(false)}
                        onConfirm={confirmClearChat}
                        title="Clear Chat History"
                        message="Are you sure you want to clear all chat messages? This cannot be undone."
                        confirmText="Clear All"
                        cancelText="Cancel"
                        confirmColor="red"
                    />

                    <main className="chat-main-content modern-scrollbar flex-1 overflow-y-auto scroll-smooth relative pb-32">
                        {/* Sticky file upload at top - Centered */}
                        <div className="file-upload-container sticky top-0 z-20 bg-white dark:bg-gray-950 pt-4 pb-2">
                            <div className="file-upload-wrapper flex justify-center px-2 sm:px-4 md:px-6 lg:px-8">
                                <FileUpload />
                            </div>
                        </div>

                        {/* Scrollable content area - Centered */}
                        <div className="chat-messages-wrapper px-2 sm:px-4 md:px-6 lg:px-8 pb-8">
                            {messages.length === 0 ? (
                                <div className="empty-state-container flex h-[60vh] flex-col items-center justify-center text-center">
                                    <div className="empty-state-avatar mb-6 rounded-full bg-gray-50 p-4 dark:bg-gray-800/50">
                                        {user?.picture ? (
                                            <img
                                                src={user.picture}
                                                alt={user.name || 'User'}
                                                className="h-12 w-12 rounded-full object-cover object-center"
                                                style={{ objectPosition: 'center center' }}
                                            />
                                        ) : (
                                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                                <User className="h-6 w-6 text-white flex-shrink-0" />
                                            </div>
                                        )}
                                    </div>
                                    <h2 className="empty-state-title mb-2 text-2xl font-semibold text-gray-900 dark:text-white">
                                        How can I help you today?
                                    </h2>
                                    <p className="empty-state-description mb-8 max-w-md text-gray-500 dark:text-gray-400">
                                        I can help you answer questions about your knowledge base, analyze documents, and more.
                                    </p>

                                    {/* Suggested Questions */}
                                    <div className="suggested-questions-container w-full max-w-6xl mx-auto">
                                        <h3 className="suggested-questions-title text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">
                                            Try asking questions like:
                                        </h3>
                                        <div className="suggested-questions-grid grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                                            {[
                                                {
                                                    category: "Document Analysis",
                                                    questions: [
                                                        "Summarize the main points of the uploaded document",
                                                        "What are the key concepts discussed?",
                                                        "Extract the most important information"
                                                    ]
                                                },
                                                {
                                                    category: "Specific Queries",
                                                    questions: [
                                                        "What does the document say about [topic]?",
                                                        "Find information related to [keyword]",
                                                        "Explain [concept] in detail"
                                                    ]
                                                },
                                                {
                                                    category: "Content Understanding",
                                                    questions: [
                                                        "What is the document about?",
                                                        "What are the main conclusions?",
                                                        "List the important dates or numbers mentioned"
                                                    ]
                                                },
                                                {
                                                    category: "Practical Use",
                                                    questions: [
                                                        "Help me write a summary based on the document",
                                                        "What should I know from this document?",
                                                        "Create a brief overview of the content"
                                                    ]
                                                }
                                            ].map((section, sectionIdx) => (
                                                <div 
                                                    key={sectionIdx} 
                                                    className={`suggested-questions-category space-y-2 ${sectionIdx >= 2 ? 'hidden sm:block' : ''}`}
                                                >
                                                    <h4 className="suggested-questions-category-title text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">
                                                        {section.category}
                                                    </h4>
                                                    {section.questions.map((question, qIdx) => (
                                                        <button
                                                            key={qIdx}
                                                            onClick={() => handleSend(question)}
                                                            className={`suggested-question-button w-full flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3 text-left text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-blue-950/20 dark:hover:border-blue-700 transition-all duration-200 group ${qIdx >= 1 ? 'hidden sm:flex' : ''}`}
                                                        >
                                                            <span className="text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform">→</span>
                                                            <span className="flex-1">{question}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="messages-list space-y-6 pb-4 max-w-[2560px] mx-auto">
                                    {messages.map((msg, i) => (
                                        <div
                                            key={i}
                                            data-message-index={i}
                                            className={`message-item ${selectedHistoryIndex === i ? 'ring-2 ring-blue-500 dark:ring-blue-400 rounded-lg p-1 -m-1' : ''}`}
                                        >
                                            <MessageBubble
                                                message={msg}
                                                messageIndex={i}
                                                onEdit={handleEdit}
                                            />
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="loading-indicator flex items-center gap-2 px-4 py-2 text-gray-400">
                                            <div className="loading-dot h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-600" />
                                            <div className="loading-dot h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-600 delay-75" />
                                            <div className="loading-dot h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-600 delay-150" />
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} className="messages-end-marker" />
                                </div>
                            )}
                        </div>
                    </main>

                    {/* Floating input container - Centered */}
                    <div className={`chat-input-container fixed bottom-0 left-0 ${messages.length > 0 ? 'lg:left-80' : ''} right-0 z-30 pb-4 pt-6`}>
                        <div className="chat-input-wrapper relative flex w-full justify-center px-2 sm:px-3 md:px-4 lg:px-6">
                            {/* Gradient backdrop with blur */}
                            <div className="chat-input-backdrop absolute inset-0 -top-6 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-gray-950 dark:via-gray-950/95 backdrop-blur-md" />

                            {/* Floating shadow effect */}
                            <div className="chat-input-shadow absolute inset-0 -top-2 bg-white/50 dark:bg-gray-950/50 rounded-t-3xl shadow-[0_-10px_40px_-10px_rgba(59,130,246,0.15)] dark:shadow-[0_-10px_40px_-10px_rgba(59,130,246,0.1)]" />

                            {/* Animated blue glow effect */}
                            <div className="chat-input-glow absolute inset-0 -top-6 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 animate-pulse" />

                            {/* Input container with floating effect */}
                            <div className="chat-input-inner-container relative w-full transform transition-transform duration-300 hover:scale-[1.01]">
                                <ChatInput
                                    onSend={handleSend}
                                    disabled={isLoading}
                                    initialValue={editContent}
                                    editing={editingIndex !== null}
                                    onCancelEdit={() => {
                                        // Cancel editing - restore original state
                                        setEditingIndex(null);
                                        setEditContent('');
                                        setSelectedHistoryIndex(null);
                                        // Note: Messages weren't removed in handleEdit, so nothing to restore
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Spacer to prevent content from being hidden behind floating input */}
                    <div className="chat-input-spacer h-32" />
                </div>
            </div>
        </div>
    );
}

// Memoize to prevent unnecessary re-renders when parent re-renders
export default memo(ChatInterfaceComponent);
