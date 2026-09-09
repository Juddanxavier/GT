'use client';

import { authClient } from '@/lib/auth-client';
import type { CustomerUser } from '@/lib/types';

export function useCustomerSession() {
  const { data: session, isPending, error } = authClient.useSession();

  const user: CustomerUser | null = session?.user
    ? {
        id: session.user.id,
        name: ((session.user as Record<string, unknown>).name as string) ?? '',
        email: ((session.user as Record<string, unknown>).email as string) ?? '',
        phone: (session.user as Record<string, unknown>).phone as string | undefined,
        branchId: (session.user as Record<string, unknown>).branchId as string | undefined,
        address: (session.user as Record<string, unknown>).address as CustomerUser['address'],
        tenantId: (session.user as Record<string, unknown>).tenantId as string | undefined,
        createdAt: session.user.createdAt,
        image: session.user.image,
      }
    : null;

  return { session, user, isPending, error };
}
