'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { CACHE_KEY } from '@/components/app-shell/query-provider';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export function useIdleTimeout() {
  const router = useRouter();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function reset() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        localStorage.removeItem(CACHE_KEY);
        authClient.signOut().then(() => router.push('/login'));
      }, SESSION_TIMEOUT_MS);
    }
    const events = ['mousedown', 'keydown', 'mousemove', 'touchstart', 'scroll'] as const;
    for (const e of events) document.addEventListener(e, reset);
    reset();
    return () => {
      clearTimeout(timer);
      for (const e of events) document.removeEventListener(e, reset);
    };
  }, [router]);
}
