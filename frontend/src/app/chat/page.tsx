'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { endpoints, LLMResponse } from '@/lib/api';
import ItineraryCard from '@/components/ItineraryCard';
import styles from './chat.module.css';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    options?: LLMResponse['options'];
    timestamp: Date;
}

export default function ChatPage() {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [userName, setUserName] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const token = localStorage.getItem('venti_token');
        if (!token) {
            router.push('/login');
            return;
        }
        const user = JSON.parse(localStorage.getItem('venti_user') || '{}');
        setUserName(user.name || 'Usuario');
    }, [router]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async (text: string) => {
        if (!text.trim() || loading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: text.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await endpoints.chat(text.trim());

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: response.text || '',
                options: response.options,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text:
                    error instanceof Error
                        ? `Error: ${error.message}`
                        : 'Ha ocurrido un error. Intenta de nuevo.',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    const handleSurprise = () => {
        sendMessage('Sorpréndeme con eventos increíbles que me encantarían');
    };

    const handleEnroll = (eventId: string) => {
        sendMessage(`Quiero inscribirme al evento ${eventId}`);
    };

    const handleLogout = () => {
        localStorage.removeItem('venti_token');
        localStorage.removeItem('venti_user');
        router.push('/login');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    return (
        <div className={styles.container}>
            {/* ─── Header ─── */}
            <header className={`${styles.header} glass`}>
                <div className={styles.headerLeft}>
                    <span className={styles.logoIcon}>✦</span>
                    <h1 className={styles.logoText}>Venti</h1>
                </div>
                <div className={styles.headerRight}>
                    <span className={styles.greeting}>Hola, {userName}</span>
                    <button className="btn btn-ghost" onClick={handleLogout} style={{ fontSize: '13px', padding: '6px 14px' }}>
                        Salir
                    </button>
                </div>
            </header>

            {/* ─── Messages ─── */}
            <main className={styles.messages}>
                {messages.length === 0 && (
                    <div className={styles.empty}>
                        <div className={styles.emptyIcon}>✦</div>
                        <h2>¡Bienvenido a Venti!</h2>
                        <p>
                            Cuéntame qué tipo de eventos te interesan o presiona{' '}
                            <strong>Sorpréndeme</strong> para descubrir algo nuevo.
                        </p>
                    </div>
                )}

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.assistantMessage
                            } animate-fade-in-up`}
                    >
                        {msg.role === 'assistant' && (
                            <div className={styles.avatar}>✦</div>
                        )}
                        <div className={styles.messageContent}>
                            {msg.text && <p className={styles.messageText}>{msg.text}</p>}
                            {msg.options && msg.options.length > 0 && (
                                <div className={styles.optionsGrid}>
                                    {msg.options.map((option, idx) => (
                                        <ItineraryCard
                                            key={option.id}
                                            option={option}
                                            index={idx}
                                            onEnroll={handleEnroll}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className={`${styles.message} ${styles.assistantMessage}`}>
                        <div className={styles.avatar}>✦</div>
                        <div className={styles.messageContent}>
                            <div className={styles.typing}>
                                <span />
                                <span />
                                <span />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </main>

            {/* ─── Input Bar ─── */}
            <form onSubmit={handleSubmit} className={`${styles.inputBar} glass`}>
                <input
                    type="text"
                    className={`input ${styles.chatInput}`}
                    placeholder="¿Qué eventos te gustaría descubrir?"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                />
                <button
                    type="button"
                    className={`btn btn-ghost ${styles.surpriseBtn}`}
                    onClick={handleSurprise}
                    disabled={loading}
                >
                    ✨ Sorpréndeme
                </button>
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || !input.trim()}
                >
                    Enviar
                </button>
            </form>
        </div>
    );
}
