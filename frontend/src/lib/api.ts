import { env } from './env';

const BASE_URL = env.apiUrl;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface RequestOptions {
    body?: unknown;
    headers?: Record<string, string>;
    auth?: boolean;
}

function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('venti_token');
}

async function request<T>(
    method: HttpMethod,
    endpoint: string,
    options: RequestOptions = {},
): Promise<T> {
    const { body, headers = {}, auth = true } = options;

    const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
    };

    if (auth) {
        const token = getAuthToken();
        if (token) {
            requestHeaders['Authorization'] = `Bearer ${token}`;
        }
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            errorData.message || `Error ${response.status}: ${response.statusText}`,
        );
    }

    return response.json();
}

/** Unified API client */
export const api = {
    get: <T>(endpoint: string, options?: RequestOptions) =>
        request<T>('GET', endpoint, options),

    post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
        request<T>('POST', endpoint, { ...options, body }),

    put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
        request<T>('PUT', endpoint, { ...options, body }),

    delete: <T>(endpoint: string, options?: RequestOptions) =>
        request<T>('DELETE', endpoint, options),
} as const;

/* ─── Typed API endpoints ─── */

export interface LoginResponse {
    access_token: string;
    user: {
        id: string;
        name: string;
        email: string;
        avatar: string;
    };
}

export interface OptionItem {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    matchPercentage: number;
    tags: string[];
    date: string;
    time: string;
    location: string;
    price: string;
    category: string;
    enrolled: boolean;
    saved: boolean;
}

export interface LLMResponse {
    text?: string;
    options?: OptionItem[];
}

export const endpoints = {
    login: (email: string, password: string) =>
        api.post<LoginResponse>('/auth/login', { email, password }, { auth: false }),

    chat: (message: string) =>
        api.post<LLMResponse>('/conversation', { message }),

    clearSession: () => api.delete<{ message: string }>('/conversation/session'),

    enrollments: {
        getAll: () => api.get<{ events: OptionItem[]; count: number }>('/enrollments'),
        remove: (eventId: string) => api.delete<{ success: boolean; message: string }>(`/enrollments/${eventId}`),
    }
} as const;
