import { create } from 'zustand';
import api from '../lib/api';
import { setAccessToken } from '../lib/api';
import type { User, LoginCredentials, AuthResponse } from '../types';
import { hasPermission } from '../config/roleConfig';

interface AuthState {
    user: User | null;
    token: string | null;           // Access token (in memory only — NOT persisted)
    isAuthenticated: boolean;
    isInitializing: boolean;        // True until first checkAuth() completes
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (credentials: LoginCredentials) => Promise<boolean>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    clearError: () => void;
    hasPermission: (feature: string) => boolean;
}

/**
 * Auth Store — In-memory access token + httpOnly cookie refresh token
 *
 * Security model:
 * - Access token stored in Zustand state (memory only, no persistence)
 * - Refresh token stored as httpOnly cookie (managed by browser, inaccessible to JS)
 * - On page reload: checkAuth() calls /auth/refresh to get a new access token from cookie
 * - On 401 TOKEN_EXPIRED: api.ts interceptor auto-refreshes and retries
 */
export const useAuthStore = create<AuthState>()(
    (set, _get) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        isInitializing: true,
        isLoading: false,
        error: null,

        login: async (credentials) => {
            set({ isLoading: true, error: null });
            try {
                const { data } = await api.post<AuthResponse>('/auth/login', credentials);

                if (data.success) {
                    // Store access token in memory only (NEVER localStorage)
                    setAccessToken(data.token);
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

        logout: async () => {
            try {
                // Call backend to revoke refresh token family + clear cookie
                await api.post('/auth/logout');
            } catch {
                // Logout should succeed even if API fails
            }
            setAccessToken(null);
            set({
                user: null,
                token: null,
                isAuthenticated: false,
                error: null,
            });
        },

        checkAuth: async () => {
            // On page load, try to restore session using httpOnly refresh cookie
            try {
                const { data } = await api.post('/auth/refresh');
                if (data.success && data.token) {
                    setAccessToken(data.token);
                    set({
                        user: data.user,
                        token: data.token,
                        isAuthenticated: true,
                        isInitializing: false,
                    });
                    return;
                }
            } catch {
                // No valid refresh cookie — user needs to re-login
            }
            setAccessToken(null);
            set({ isAuthenticated: false, user: null, token: null, isInitializing: false });
        },

        hasPermission: (feature: string) => {
            const { user } = _get();
            if (!user) return false;
            // Import dynamically or move helper here? 
            // Better to rely on the roleConfig helper but we need to import it.
            // Since this is inside a hook, let's just duplicate the logic or import at top.
            // Let's import at top.
            return hasPermission(user.role, feature);
        },

        clearError: () => set({ error: null }),
    })
);
