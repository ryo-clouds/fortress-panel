import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'reseller';
  status: 'active' | 'inactive' | 'suspended';
  mfa_enabled: boolean;
  permissions: Record<string, any>;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  accessToken: string | null;
  refreshToken: string | null;
}

interface AuthActions {
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  initializeAuth: () => void;
  clearError: () => void;
  setError: (error: string) => void;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      accessToken: null,
      refreshToken: null,

      // Actions
      login: async (username: string, password: string, rememberMe = false) => {
        set({ loading: true, error: null });
        
        try {
          const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password, rememberMe }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Login failed');
          }

          set({
            user: data.user,
            isAuthenticated: true,
            loading: false,
            error: null,
            accessToken: data.tokens.access_token,
            refreshToken: data.tokens.refresh_token,
          });
        } catch (error) {
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Login failed',
            user: null,
            isAuthenticated: false,
            accessToken: null,
            refreshToken: null,
          });
          throw error;
        }
      },

      logout: () => {
        const { refreshToken } = get();
        
        // Call logout endpoint if we have a refresh token
        if (refreshToken) {
          fetch(`${API_BASE}/api/v1/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${get().accessToken}`,
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          }).catch(() => {
            // Ignore logout API errors
          });
        }

        set({
          user: null,
          isAuthenticated: false,
          loading: false,
          error: null,
          accessToken: null,
          refreshToken: null,
        });
      },

      refreshToken: async () => {
        const { refreshToken } = get();
        
        if (!refreshToken) {
          get().logout();
          return;
        }

        try {
          const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Token refresh failed');
          }

          set({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            error: null,
          });
        } catch (error) {
          console.error('Token refresh failed:', error);
          get().logout();
        }
      },

      initializeAuth: () => {
        const { accessToken, refreshToken, user } = get();
        
        if (accessToken && refreshToken && user) {
          set({
            isAuthenticated: true,
            loading: false,
          });
          
          // Set up token refresh timer
          setInterval(() => {
            get().refreshToken();
          }, 14 * 60 * 1000); // Refresh every 14 minutes
        } else {
          set({
            isAuthenticated: false,
            loading: false,
            user: null,
            accessToken: null,
            refreshToken: null,
          });
        }
      },

      clearError: () => set({ error: null }),
      
      setError: (error: string) => set({ error }),
    }),
    {
      name: 'fortress-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);