'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useTenantFilter } from '../tenant-filter-context';
import type { PaginatedResult, RateCard } from './types';

export function useRateCards(page?: number, limit?: number, search?: string) {
  const { filterVersion } = useTenantFilter();
  const hasPage = page !== undefined && page > 0;
  return useQuery<PaginatedResult<RateCard>>({
    queryKey: ['rate-cards', filterVersion, page, limit, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (hasPage) {
        params.set('page', String(page));
        params.set('limit', String(limit ?? 10));
      }
      if (search) params.set('search', search);
      return api.getFull<PaginatedResult<RateCard>>(`/api/rate-cards?${params}`);
    },
  });
}

export function useRateCard(id: string) {
  return useQuery<{ data: RateCard }>({
    queryKey: ['rate-cards', id],
    queryFn: () => api.getFull<{ data: RateCard }>(`/api/rate-cards/${id}`),
    enabled: !!id,
  });
}

export function useCreateRateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      destinationCountry: string;
      currency?: string;
      rates: Array<{
        serviceType: string;
        weightFrom: string;
        weightTo: string;
        rate: string;
      }>;
    }) => api.post<RateCard>('/api/rate-cards', data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['rate-cards'] });
    },
  });
}

export function useUpdateRateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch<RateCard>(`/api/rate-cards/${id}`, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['rate-cards'] });
    },
  });
}

export function useDeleteRateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/rate-cards/${id}`),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['rate-cards'] });
    },
  });
}
