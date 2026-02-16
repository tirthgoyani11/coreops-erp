import axios, { AxiosError } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Environment-based API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ── In-memory access token (never persisted to localStorage) ──
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
    accessToken = token;
}

export function getAccessToken(): string | null {
    return accessToken;
}

// ── Refresh token queue (prevents multiple concurrent refresh calls) ──
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onTokenRefreshed(token: string) {
    refreshSubscribers.forEach((cb) => cb(token));
    refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string) => void) {
    refreshSubscribers.push(callback);
}

// Create axios instance with security defaults
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Send httpOnly cookies with every request
});

// Request ID generator for tracing
const generateRequestId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Request interceptor - add auth token and request ID
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Add access token from memory (NOT localStorage)
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Add request ID for tracing
        config.headers['X-Request-ID'] = generateRequestId();

        // Security: Prevent caching of API responses
        config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        config.headers['Pragma'] = 'no-cache';

        return config;
    },
    (error) => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor - handle errors globally with auto-refresh
api.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    async (error: AxiosError<{ message?: string; code?: string; errors?: Array<{ field: string; message: string }> }>) => {
        const { response, config } = error;
        const originalRequest = config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Log error for debugging (in development)
        if (import.meta.env.DEV) {
            console.error('[API Error]', {
                url: config?.url,
                method: config?.method,
                status: response?.status,
                message: response?.data?.message,
            });
        }

        // Handle specific status codes
        if (response) {
            switch (response.status) {
                case 401: {
                    const isTokenExpired = response.data?.code === 'TOKEN_EXPIRED';
                    const isRefreshUrl = originalRequest.url?.includes('/auth/refresh');
                    const isLoginUrl = originalRequest.url?.includes('/auth/login');

                    // If token expired and not already retrying, attempt refresh
                    if (isTokenExpired && !originalRequest._retry && !isRefreshUrl && !isLoginUrl) {
                        if (isRefreshing) {
                            // Another refresh is in progress — queue this request
                            return new Promise((resolve) => {
                                addRefreshSubscriber((newToken: string) => {
                                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                                    resolve(api(originalRequest));
                                });
                            });
                        }

                        originalRequest._retry = true;
                        isRefreshing = true;

                        try {
                            const { data } = await api.post('/auth/refresh');
                            const newToken = data.token;
                            setAccessToken(newToken);
                            isRefreshing = false;
                            onTokenRefreshed(newToken);

                            // Retry original request with new token
                            originalRequest.headers.Authorization = `Bearer ${newToken}`;
                            return api(originalRequest);
                        } catch (refreshError) {
                            isRefreshing = false;
                            refreshSubscribers = [];
                            setAccessToken(null);

                            // Refresh failed — redirect to login
                            if (!window.location.pathname.includes('/login')) {
                                window.location.href = '/login';
                            }
                            return Promise.reject(refreshError);
                        }
                    }

                    // Non-expired 401 or refresh failed — redirect to login
                    if (!isLoginUrl && !isRefreshUrl) {
                        setAccessToken(null);
                        if (!window.location.pathname.includes('/login')) {
                            window.location.href = '/login';
                        }
                    }
                    break;
                }

                case 403:
                    console.warn('[API] Access forbidden:', config?.url);
                    break;

                case 429:
                    console.warn('[API] Rate limited - too many requests');
                    break;

                case 500:
                case 502:
                case 503:
                case 504:
                    console.error('[API] Server error:', response.status);
                    break;
            }
        } else if (error.code === 'ECONNABORTED') {
            console.error('[API] Request timeout');
        } else if (!navigator.onLine) {
            console.error('[API] Network offline');
        }

        return Promise.reject(error);
    }
);

// Type-safe API helper functions
export const apiGet = async <T>(url: string, params?: Record<string, any>): Promise<T> => {
    const response = await api.get<T>(url, { params });
    return response.data;
};

export const apiPost = async <T>(url: string, data?: any): Promise<T> => {
    const response = await api.post<T>(url, data);
    return response.data;
};

export const apiPut = async <T>(url: string, data?: any): Promise<T> => {
    const response = await api.put<T>(url, data);
    return response.data;
};

export const apiPatch = async <T>(url: string, data?: any): Promise<T> => {
    const response = await api.patch<T>(url, data);
    return response.data;
};

export const apiDelete = async <T>(url: string): Promise<T> => {
    const response = await api.delete<T>(url);
    return response.data;
};

// Error message extractor
export const getErrorMessage = (error: unknown): string => {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.message || error.message || 'An error occurred';
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'An unexpected error occurred';
};

// Check if error is a specific status code
export const isStatusError = (error: unknown, status: number): boolean => {
    return axios.isAxiosError(error) && error.response?.status === status;
};

export default api;
