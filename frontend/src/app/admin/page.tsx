'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { endpoints } from '@/lib/api';
import styles from './admin.module.css';

export default function AdminPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('venti_token');
        const user = localStorage.getItem('venti_user');
        if (!token || !user) {
            router.push('/login');
            return;
        }
        const parsed = JSON.parse(user);
        if (parsed.role !== 'admin') {
            router.push('/chat');
        }
    }, [router]);

    const handleSend = async () => {
        setLoading(true);
        setError('');
        setResult(null);

        try {
            const res = await endpoints.notifications.sendAll();
            setResult({ sent: res.sent, failed: res.failed });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al enviar notificaciones');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('venti_token');
        localStorage.removeItem('venti_user');
        router.push('/login');
    };

    return (
        <div className={styles.container}>
            <header className={`${styles.header} glass`}>
                <div className={styles.headerLeft}>
                    <Image src="/venti_logo.png" alt="Venti" width={40} height={40} />
                    <h1 className={styles.logoText}>Admin</h1>
                </div>
                <button className="btn btn-ghost" onClick={handleLogout} style={{ fontSize: '13px' }}>
                    Salir
                </button>
            </header>

            <main className={styles.main}>
                <div className={`${styles.card} glass`}>
                    <div className={styles.iconWrapper}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                    </div>
                    <h2>Notificaciones Personalizadas</h2>
                    <p className={styles.description}>
                        Envía una notificación web a cada usuario suscrito con un evento cercano
                        que coincida con sus intereses y ubicación.
                    </p>

                    <button
                        className="btn btn-primary"
                        onClick={handleSend}
                        disabled={loading}
                        style={{ width: '100%', padding: '16px', fontSize: '16px', marginTop: '24px' }}
                    >
                        {loading ? 'Enviando...' : 'Enviar Notificaciones'}
                    </button>

                    {error && <div className={styles.error}>{error}</div>}

                    {result && (
                        <div className={styles.resultCard}>
                            <div className={styles.stat}>
                                <span className={styles.statNumber}>{result.sent}</span>
                                <span className={styles.statLabel}>Enviadas</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={`${styles.statNumber} ${result.failed > 0 ? styles.statFailed : ''}`}>
                                    {result.failed}
                                </span>
                                <span className={styles.statLabel}>Fallidas</span>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
