import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string | null;
  subscriptionTier: 'FREE' | 'PRO';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isHydrated: boolean;
  setAuth: (user: AuthUser, tokens: AuthTokens) => void;
  updateTokens: (tokens: AuthTokens) => void;
  setHydrated: (value: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tokens: null,
  isHydrated: false,
  setAuth: (user, tokens) => set({ user, tokens }),
  updateTokens: (tokens) => set({ tokens }),
  setHydrated: (value) => set({ isHydrated: value }),
  clearAuth: () => set({ user: null, tokens: null }),
}));
