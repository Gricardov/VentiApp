'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { endpoints } from '@/lib/api';
import styles from './login.module.css';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const VAPID_PUBLIC_KEY = 'BJXV-EL_nwMBZ4vcpQ102a9JgqnWCuWHgkSBk6aYshNU4c3ln5CrrSCKfXB-WEWHjGk8akZitpxRA8Zh3y3Bh3o';

    const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const registerPushSubscription = async () => {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;

            const registration = await navigator.serviceWorker.register('/sw.js');
            await navigator.serviceWorker.ready;

            const subscription = await registration.pushManager.subscribe({
                userVisuallyIndicatesState: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            } as PushSubscriptionOptionsInit);

            const sub = subscription.toJSON();
            if (sub.endpoint && sub.keys) {
                await endpoints.notifications.subscribe(sub);
            }
        } catch (err) {
            console.warn('[Venti] Push registration failed:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await endpoints.login(email, password);
            localStorage.setItem('venti_token', data.access_token);
            localStorage.setItem('venti_user', JSON.stringify(data.user));

            // Request push notification permission
            await registerPushSubscription();

            // Route based on role
            if ((data.user as any).role === 'admin') {
                router.push('/admin');
            } else {
                router.push('/chat');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.bgOrbs}>
                <div className={styles.orb1} />
                <div className={styles.orb2} />
                <div className={styles.orb3} />
            </div>

            <form onSubmit={handleSubmit} className={`${styles.card} glass`}>
                <div className={styles.logo}>
                    <Image
                        src="/venti_logo.png"
                        alt="Venti"
                        width={180}
                        height={180}
                        priority
                    />
                </div>
                <p className={styles.subtitle}>Tu asistente inteligente de eventos</p>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.field}>
                    <label className={styles.label}>Email</label>
                    <input
                        type="email"
                        className="input"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className={styles.field}>
                    <label className={styles.label}>Contraseña</label>
                    <input
                        type="password"
                        className="input"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    style={{ width: '100%', padding: '14px', fontSize: '15px' }}
                >
                    {loading ? 'Entrando...' : 'Iniciar Sesión'}
                </button>

                <p className={styles.hint}>
                    Usuario: <strong>ana@example.com</strong> / <strong>password123</strong>
                    <br />
                    Admin: <strong>admin@venti.com</strong> / <strong>admin123</strong>
                </p>
            </form>
        </div>
    );
}
