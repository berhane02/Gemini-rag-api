'use client';

import React, { useState, useRef, useEffect } from 'react';
import FileUpload from './FileUpload';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import AuthButton from './AuthButton';
import ThemeToggle from './ThemeToggle';

interface Message {
    role: 'user' | 'model';
    content: string;
}

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editContent, setEditContent] = useState<string>('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleEdit = (index: number, content: string) => {
        setEditingIndex(index);
        setEditContent(content);
        // Remove the user message and all subsequent messages (including AI response)
        setMessages((prev) => prev.slice(0, index));
    };

    const handleSend = async (content: string) => {
        // If editing, remove the old message and its response
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

            if (!response.ok) throw new Error('Failed to fetch response');

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
            setMessages((prev) => [
                ...prev,
                { role: 'model', content: 'Sorry, I encountered an error. Please try again.' },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen flex-col bg-white dark:bg-gray-950">
            <header className="border-b bg-white dark:bg-gray-900 dark:border-gray-800 p-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
                <h1 className="text-xl font-semibold text-gray-800 dark:text-white">RAG Chatbot</h1>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <AuthButton />
                </div>
            </header>

            <main className="flex-1 overflow-y-auto scroll-smooth">
                <div className="mx-auto max-w-3xl px-4 py-8">
                    <FileUpload /> {/* Render FileUpload component here */}
                    {messages.length === 0 ? (
                        <div className="flex h-[60vh] flex-col items-center justify-center text-center">
                            <div className="mb-6 rounded-full bg-gray-50 p-4 dark:bg-gray-800/50">
                                <div className="h-12 w-12 text-gray-400 dark:text-gray-500" />
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
                            setEditingIndex(null);
                            setEditContent('');
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
