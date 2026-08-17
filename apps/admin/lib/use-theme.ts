'use client';

import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

function readSaved(): ThemePreference | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'system' || saved === 'light' || saved === 'dark' ? saved : null;
}

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>(() => readSaved() ?? 'light');
  const [resolved, setResolved] = useState<ResolvedTheme>('light');

  useEffect(() => {
    const apply = () => {
      const next: ResolvedTheme = theme === 'system' ? (prefersDark() ? 'dark' : 'light') : theme;
      setResolved(next);
      document.documentElement.setAttribute('data-theme', next);
    };
    apply();
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return { theme, resolved, setTheme };
}