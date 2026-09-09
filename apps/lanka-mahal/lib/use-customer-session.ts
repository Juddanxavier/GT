'use client';

import { useMemo } from 'react';
import { authClient } from '@/lib/auth-client';
import type { CustomerUser } from '@/lib/types';

export function useCustomerSession() {
  const { data: session, isPending, error } = authClient.useSession();

  const user = useMemo((): CustomerUser | null => {
    if (!session?.user) return null;
    const raw = session.user as Record<string, unknown>;
    return {
      id: session.user.id,
      name: (raw.name as string) ?? '',
      email: (raw.email as string) ?? '',
      phone: raw.phone as string | undefined,
      branchId: raw.branchId as string | undefined,
      address: raw.address as CustomerUser['address'],
      tenantId: raw.tenantId as string | undefined,
      createdAt: session.user.createdAt,
      image: session.user.image,
    };
  }, [
    session?.user?.id,
    session?.user?.name,
    session?.user?.email,
    session?.user?.createdAt,
    session?.user?.image,
    (session?.user as Record<string, unknown> | undefined)?.phone,
    (session?.user as Record<string, unknown> | undefined)?.branchId,
    (session?.user as Record<string, unknown> | undefined)?.tenantId,
    JSON.stringify((session?.user as Record<string, unknown> | undefined)?.address ?? null),
  ]);

  return { session, user, isPending, error };
}
