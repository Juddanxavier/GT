'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

/** Minimal shape for the View Transitions API, which older DOM lib versions
 * do not declare. */
type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

function readSaved(): ThemePreference | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'system' || saved === 'light' || saved === 'dark' ? saved : null;
}

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolve(pref: ThemePreference): ResolvedTheme {
  return pref === 'system' ? (prefersDark() ? 'dark' : 'light') : pref;
}

/** Cross-fade the whole surface while the theme swaps. The View Transitions
 * API snapshots the old and new states and fades between them; browsers
 * without it fall back to the plain attribute swap, which the global colour
 * transition in globals.css already animates. */
function commitTheme(next: ResolvedTheme, apply: () => void) {
  const doc = document as ViewTransitionDocument;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (doc.startViewTransition && !reducedMotion) {
    doc.startViewTransition(apply);
    return;
  }
  apply();
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>(() => readSaved() ?? 'light');
  const [resolved, setResolved] = useState<ResolvedTheme>('light');
  const resolvedRef = useRef(resolved);
  resolvedRef.current = resolved;

  useEffect(() => {
    const apply = () => {
      const next = resolve(theme);
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
    const nextResolved = resolve(next);
    const apply = () => {
      document.documentElement.setAttribute('data-theme', nextResolved);
      setResolved(nextResolved);
    };
    // Only animate an actual light/dark flip, never a no-op re-selection.
    if (nextResolved === resolvedRef.current) {
      setThemeState(next);
      localStorage.setItem(STORAGE_KEY, next);
      return;
    }
    commitTheme(nextResolved, apply);
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return { theme, resolved, setTheme };
}
