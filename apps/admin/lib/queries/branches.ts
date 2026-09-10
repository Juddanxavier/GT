'use client';

import { type UseQueryResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useTenantFilter } from '../tenant-filter-context';
import type { ApiBranch, Branch, PaginatedResult } from './types';

export function useBranches(): UseQueryResult<ApiBranch[], Error>;
export function useBranches(
  page: number,
  limit?: number,
  search?: string,
): UseQueryResult<PaginatedResult<ApiBranch>, Error>;
export function useBranches(page?: number, limit?: number, search?: string) {
  const { filterVersion } = useTenantFilter();
  const hasPage = page !== undefined && page > 0;
  return useQuery<ApiBranch[] | PaginatedResult<ApiBranch>>({
    queryKey: ['branches', filterVersion, page, limit, search],
    queryFn: async () => {
      if (hasPage) {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit ?? 10));
        if (search) params.set('search', search);
        return api.getFull<PaginatedResult<ApiBranch>>(`/api/branches?${params}`);
      }
      return api.get<ApiBranch[]>('/api/branches');
    },
  });
}

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      phone?: string;
      email?: string;
      address?: string;
      tenantId?: string;
    }) => api.post<ApiBranch>('/api/branches', data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}

export function useDeleteBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/branches/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}

export function useBranch(id: string) {
  return useQuery<Branch>({
    queryKey: ['branch', id],
    queryFn: () => api.get<Branch>(`/api/branches/${id}`),
    enabled: !!id,
  });
}

export function useUpdateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      api.patch<Branch>(`/api/branches/${id}`, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      qc.invalidateQueries({ queryKey: ['branch'] });
    },
  });
}
