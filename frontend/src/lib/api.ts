import axios, { AxiosError } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Environment-based API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance with security defaults
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 second timeout
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: false, // Set to true if using cookies
});

// Request ID generator for tracing
const generateRequestId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Request interceptor - add auth token and request ID
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Add auth token
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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

// Response interceptor - handle errors globally
api.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    (error: AxiosError<{ message?: string; errors?: Array<{ field: string; message: string }> }>) => {
        const { response, config } = error;

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
                case 401:
                    // Unauthorized - clear token and redirect to login
                    localStorage.removeItem('token');
                    // Only redirect if not already on login page
                    if (!window.location.pathname.includes('/login')) {
                        window.location.href = '/login';
                    }
                    break;

                case 403:
                    // Forbidden - user doesn't have permission
                    console.warn('[API] Access forbidden:', config?.url);
                    break;

                case 429:
                    // Rate limited
                    console.warn('[API] Rate limited - too many requests');
                    break;

                case 500:
                case 502:
                case 503:
                case 504:
                    // Server error
                    console.error('[API] Server error:', response.status);
                    break;
            }
        } else if (error.code === 'ECONNABORTED') {
            // Timeout
            console.error('[API] Request timeout');
        } else if (!navigator.onLine) {
            // Network offline
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
