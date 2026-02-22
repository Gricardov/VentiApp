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
    const [listening, setListening] = useState(false);
    const [speakingId, setSpeakingId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

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

    // ─── Voice Input (Web Speech API) ───
    const toggleListening = () => {
        if (listening) {
            recognitionRef.current?.stop();
            setListening(false);
            return;
        }

        const SpeechRecognition =
            (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition })
                .SpeechRecognition ||
            (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition })
                .webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert('Tu navegador no soporta reconocimiento de voz.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
            setListening(false);
        };

        recognition.onerror = () => setListening(false);
        recognition.onend = () => setListening(false);

        recognitionRef.current = recognition;
        recognition.start();
        setListening(true);
    };

    // ─── TTS (SpeechSynthesis) ───
    const speakText = (messageId: string, text: string) => {
        if (speakingId === messageId) {
            window.speechSynthesis.cancel();
            setSpeakingId(null);
            return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 1;
        utterance.onend = () => setSpeakingId(null);
        utterance.onerror = () => setSpeakingId(null);

        setSpeakingId(messageId);
        window.speechSynthesis.speak(utterance);
    };

    // ─── Send Message ───
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
            const raw = await endpoints.chat(text.trim());

            // Safety parser: strip leaked JSON from text
            let finalText = raw.text || '';
            let finalOptions = raw.options || [];

            if (finalText.startsWith('{') && finalText.includes('"text"')) {
                try {
                    const parsed = JSON.parse(finalText);
                    if (parsed.text) finalText = parsed.text;
                    if (parsed.options?.length) finalOptions = parsed.options;
                } catch {
                    // Not valid JSON
                }
            }

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: finalText,
                options: finalOptions,
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
                            {msg.text && (
                                <div className={styles.messageTextRow}>
                                    <p className={styles.messageText}>{msg.text}</p>
                                    {msg.role === 'assistant' && (
                                        <button
                                            className={`${styles.ttsBtn} ${speakingId === msg.id ? styles.ttsBtnActive : ''}`}
                                            onClick={() => speakText(msg.id, msg.text)}
                                            title={speakingId === msg.id ? 'Detener' : 'Escuchar'}
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                                {speakingId === msg.id
                                                    ? <rect x="6" y="4" width="12" height="16" rx="1" />
                                                    : <polygon points="5,3 19,12 5,21" />
                                                }
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            )}
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
                <div className={styles.inputWrapper}>
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
                        className={`${styles.micBtn} ${listening ? styles.micBtnActive : ''}`}
                        onClick={toggleListening}
                        title={listening ? 'Detener grabación' : 'Hablar'}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {listening ? (
                                <rect x="6" y="6" width="12" height="12" rx="1" />
                            ) : (
                                <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></>
                            )}
                        </svg>
                    </button>
                </div>
                <button
                    type="button"
                    className={`btn btn-ghost ${styles.surpriseBtn}`}
                    onClick={handleSurprise}
                    disabled={loading}
                >
                    Sorpréndeme
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
