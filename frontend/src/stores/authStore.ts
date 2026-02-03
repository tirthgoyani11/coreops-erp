import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';
import type { User, LoginCredentials, AuthResponse } from '../types';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (credentials: LoginCredentials) => Promise<boolean>;
    logout: () => void;
    checkAuth: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, _get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            login: async (credentials) => {
                set({ isLoading: true, error: null });
                try {
                    const { data } = await api.post<AuthResponse>('/auth/login', credentials);

                    if (data.success) {
                        localStorage.setItem('token', data.token);
                        set({
                            user: data.user,
                            token: data.token,
                            isAuthenticated: true,
                            isLoading: false,
                        });
                        return true;
                    }

                    set({ isLoading: false, error: data.message });
                    return false;
                } catch (error: any) {
                    const message = error.response?.data?.message || 'Login failed';
                    set({ isLoading: false, error: message });
                    return false;
                }
            },

            logout: () => {
                localStorage.removeItem('token');
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    error: null,
                });
            },

            checkAuth: async () => {
                const token = localStorage.getItem('token');
                if (!token) {
                    set({ isAuthenticated: false, user: null });
                    return;
                }

                try {
                    const { data } = await api.get('/auth/me');
                    if (data.success) {
                        set({
                            user: data.data,
                            token,
                            isAuthenticated: true,
                        });
                    }
                } catch {
                    localStorage.removeItem('token');
                    set({ isAuthenticated: false, user: null, token: null });
                }
            },

            clearError: () => set({ error: null }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ token: state.token }),
        }
    )
);
