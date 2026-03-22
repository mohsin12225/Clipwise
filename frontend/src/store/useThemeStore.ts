import { create } from 'zustand';
import type { Theme } from '@/types';
import { THEME_STORAGE_KEY } from '@/lib/constants';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initializeTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',

  setTheme: (theme: Theme) => {
    set({ theme });
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      applyThemeToDOM(theme);
    }
  },

  toggleTheme: () => {
    const current = get().theme;
    const next = current === 'light' ? 'dark' : 'light';
    get().setTheme(next);
  },

  initializeTheme: () => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');

    set({ theme });
    applyThemeToDOM(theme);

    // Remove the loading class that prevents transition flicker
    document.documentElement.classList.remove('theme-loading');
  },
}));

function applyThemeToDOM(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}