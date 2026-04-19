import { create } from 'zustand';

export type ThemePreference = 'auto' | 'light' | 'dark';

interface ThemeState {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'auto',
  setPreference: (preference) => set({ preference }),
}));
