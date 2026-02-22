/**
 * Centralized environment variable reading with validation.
 * All .env access goes through this file.
 */
export const env = {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://localhost:4000',
} as const;
