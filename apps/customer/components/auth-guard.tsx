'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';

export function AuthGuard({ children }: { children: ReactNode }): ReactNode {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) router.replace('/login');
  }, [session, isPending, router]);

  if (isPending) return null;
  if (!session) return null;
  return children;
}
