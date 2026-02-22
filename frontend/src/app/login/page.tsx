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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await endpoints.login(email, password);
            localStorage.setItem('venti_token', data.access_token);
            localStorage.setItem('venti_user', JSON.stringify(data.user));
            router.push('/chat');
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
                    <div className={styles.mascotWrapper}>
                        <Image
                            src="/venti_mascot.png"
                            alt="Venti Mascot"
                            width={160}
                            height={160}
                            className={styles.mascotImage}
                            priority
                        />
                    </div>
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
                    Prueba con <strong>ana@example.com</strong> / <strong>password123</strong>
                </p>
            </form>
        </div>
    );
}
