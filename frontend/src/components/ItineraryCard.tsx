'use client';

import { OptionItem } from '@/lib/api';
import styles from './ItineraryCard.module.css';
import { useState } from 'react';

interface ItineraryCardProps {
    option: OptionItem;
    index: number;
    onEnroll?: (id: string) => void;
    onSave?: (id: string) => void;
}

export default function ItineraryCard({
    option,
    index,
    onEnroll,
    onSave,
}: ItineraryCardProps) {
    const [saved, setSaved] = useState(option.saved);
    const [enrolled, setEnrolled] = useState(option.enrolled);

    const handleSave = () => {
        setSaved(!saved);
        onSave?.(option.id);
    };

    const handleEnroll = () => {
        onEnroll?.(option.id);
    };

    const matchColor =
        option.matchPercentage >= 70
            ? 'var(--success)'
            : option.matchPercentage >= 40
                ? 'var(--warning)'
                : 'var(--text-secondary)';

    return (
        <div
            className={`${styles.card} glass animate-fade-in-up`}
            style={{ animationDelay: `${index * 100}ms` }}
        >
            <div className={styles.imageWrapper}>
                <img
                    src={option.imageUrl}
                    alt={option.title}
                    className={styles.image}
                />
                <div className={styles.matchBadge} style={{ color: matchColor }}>
                    <span className={styles.matchNumber}>{option.matchPercentage}%</span>
                    <span className={styles.matchLabel}>match</span>
                </div>
                <button
                    className={`${styles.saveBtn} ${saved ? styles.saved : ''}`}
                    onClick={handleSave}
                    aria-label={saved ? 'Quitar de guardados' : 'Guardar'}
                >
                    {saved ? '★' : '☆'}
                </button>
            </div>

            <div className={styles.content}>
                <div className={styles.meta}>
                    <span className={styles.category}>{option.category}</span>
                    <span className={styles.date}>
                        📅 {option.date} · {option.time}
                    </span>
                </div>

                <h3 className={styles.title}>{option.title}</h3>
                <p className={styles.description}>{option.description}</p>

                <div className={styles.location}>📍 {option.location}</div>

                <div className={styles.tags}>
                    {option.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="tag">
                            {tag}
                        </span>
                    ))}
                </div>

                <div className={styles.footer}>
                    <span className={styles.price}>{option.price}</span>
                    <button
                        className={`btn ${enrolled ? 'btn-ghost' : 'btn-success'}`}
                        onClick={handleEnroll}
                        disabled={enrolled}
                        style={{ fontSize: '13px', padding: '8px 18px' }}
                    >
                        {enrolled ? '✓ Inscrito' : 'Inscribirme'}
                    </button>
                </div>
            </div>
        </div>
    );
}
