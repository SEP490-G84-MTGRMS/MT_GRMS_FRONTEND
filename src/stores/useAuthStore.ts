import { create } from 'zustand';
import type { UserProfile } from '../features/auth/authTypes';
import { authService } from '../features/auth/authService';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: UserProfile | null, token?: string) => void;
  updateUser: (patch: Partial<UserProfile>) => void;
  checkAuth: () => Promise<UserProfile | null>;
  logout: () => Promise<void>;
}

const getStoredUser = (): UserProfile | null => {
  try {
    // Dọn sạch tàn dư access_token nếu còn sót lại trong localStorage
    localStorage.removeItem('access_token');
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const initialUser = getStoredUser();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  token: null,
  isAuthenticated: Boolean(initialUser),
  isLoading: false,
  setAuth: (user, _token) => {
    // Tuyệt đối KHÔNG lưu token vào localStorage
    localStorage.removeItem('access_token');
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
      if (user.tenantId) {
        localStorage.setItem('tenant_id', user.tenantId);
      }
    } else {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('tenant_id');
    }
    set({ user: user || null, token: null, isAuthenticated: Boolean(user) });
  },
  updateUser: (patch) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...patch };
      try {
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      } catch {
        // Ignored in environments where localStorage is blocked
      }
      return { user: updatedUser };
    });
  },
  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const user = await authService.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
      return user;
    } catch {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('tenant_id');
      localStorage.removeItem('access_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
      return null;
    }
  },
  logout: async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('tenant_id');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },
}));
