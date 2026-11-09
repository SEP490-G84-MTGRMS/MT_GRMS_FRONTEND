import { create } from 'zustand';
import type { UserProfile } from '../features/auth/authTypes';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: UserProfile, token: string) => void;
  logout: () => void;
}

const getStoredUser = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: getStoredUser(),
  token: localStorage.getItem('access_token'),
  isAuthenticated: Boolean(localStorage.getItem('access_token')),
  setAuth: (user, token) => {
    localStorage.setItem('access_token', token);
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
      if (user.tenantId) {
        localStorage.setItem('tenant_id', user.tenantId);
      }
    }
    set({ user: user || null, token, isAuthenticated: Boolean(token) });
  },
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('tenant_id');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
