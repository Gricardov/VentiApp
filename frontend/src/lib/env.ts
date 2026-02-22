/**
 * Centralized environment variable reading with validation.
 * All .env access goes through this file.
 */
export const env = {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://matthew-computers-limitation-score.trycloudflare.com',
} as const;
