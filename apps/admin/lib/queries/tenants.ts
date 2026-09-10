'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export function useTenants() {
  return useQuery<{ id: string; name: string; country: string | null; currency: string | null }[]>({
    queryKey: ['tenants'],
    queryFn: () =>
      api.get<{ id: string; name: string; country: string | null; currency: string | null }[]>(
        '/api/tenants',
      ),
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; name: string; country: string; currency: string }) =>
      api.patch<void>(`/api/tenants/${input.id}`, {
        name: input.name,
        country: input.country,
        currency: input.currency,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}
