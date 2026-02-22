'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { endpoints, OptionItem } from '@/lib/api';
import ItineraryCard from '@/components/ItineraryCard';
import styles from './my-events.module.css';

export default function MyEventsPage() {
    const router = useRouter();
    const [events, setEvents] = useState<OptionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('venti_token');
        if (!token) {
            router.push('/login');
            return;
        }
        loadEvents();
    }, [router]);

    const loadEvents = async () => {
        try {
            setLoading(true);
            const data = await endpoints.enrollments.getAll();
            setEvents(data.events);
        } catch (err) {
            setError('No pudimos cargar tus eventos. Intenta de nuevo.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (eventId: string) => {
        if (!confirm('¿Estás seguro de que deseas cancelar tu inscripción?')) {
            return;
        }

        try {
            await endpoints.enrollments.remove(eventId);
            setEvents((prev) => prev.filter((e) => e.id !== eventId));
        } catch (err) {
            alert('Hubo un error al cancelar la inscripción.');
            console.error(err);
        }
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={`${styles.header} glass`}>
                <div className={styles.headerLeft}>
                    <span className={styles.logoIcon}>✦</span>
                    <button
                        className={styles.logoText}
                        onClick={() => router.push('/chat')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                        Venti
                    </button>
                </div>
                <div className={styles.headerRight}>
                    <button className="btn btn-primary" onClick={() => router.push('/chat')}>
                        Explorar
                    </button>
                    <button
                        className="btn btn-ghost"
                        onClick={() => {
                            localStorage.removeItem('venti_token');
                            localStorage.removeItem('venti_user');
                            router.push('/login');
                        }}
                    >
                        Salir
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className={styles.main}>
                <div className={styles.titleArea}>
                    <h1>Mis Eventos</h1>
                    <p>Eventos en los que estás inscrito o que has guardado.</p>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                {loading ? (
                    <div className={styles.loading}>Cargando eventos...</div>
                ) : events.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📅</div>
                        <h2>Aún no tienes eventos</h2>
                        <p>Explora sugerencias con el asistente y anótate a los que más te gusten.</p>
                        <button className="btn btn-primary" onClick={() => router.push('/chat')} style={{ marginTop: '16px' }}>
                            Descubrir Eventos
                        </button>
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {events.map((event, i) => (
                            <div key={event.id} className={styles.cardWrapper}>
                                <ItineraryCard
                                    option={event}
                                    index={i}
                                    onEnroll={() => { }}
                                />
                                <button
                                    className={`btn btn-ghost ${styles.cancelBtn}`}
                                    onClick={() => handleCancel(event.id)}
                                >
                                    Cancelar Inscripción
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
