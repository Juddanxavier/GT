'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'portal-ops-theme';

export type PortalTheme = 'light' | 'dark';

export function usePortalTheme(enabled: boolean) {
  const [theme, setTheme] = useState<PortalTheme>('light');

  useEffect(() => {
    if (!enabled) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') setTheme(stored);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      document.documentElement.classList.remove('portal-ops-dark');
      return;
    }
    document.documentElement.classList.toggle('portal-ops-dark', theme === 'dark');
    localStorage.setItem(STORAGE_KEY, theme);
  }, [enabled, theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme, resolved: theme };
}
