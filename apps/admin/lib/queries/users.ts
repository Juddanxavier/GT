'use client';

import { type UseQueryResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useTenantFilter } from '../tenant-filter-context';
import type { PaginatedResult, UserRecord } from './types';

export function useUsers(): UseQueryResult<UserRecord[], Error>;
export function useUsers(
  page: number,
  limit?: number,
  search?: string,
  role?: string,
  banned?: string,
): UseQueryResult<PaginatedResult<UserRecord>, Error>;
export function useUsers(
  page?: number,
  limit?: number,
  search?: string,
  role?: string,
  banned?: string,
) {
  const { filterVersion } = useTenantFilter();
  const hasPage = page !== undefined && page > 0;
  return useQuery<UserRecord[] | PaginatedResult<UserRecord>>({
    queryKey: ['users', filterVersion, page, limit, search, role, banned],
    queryFn: async () => {
      if (hasPage) {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit ?? 10));
        if (search) params.set('search', search);
        if (role) params.set('role', role);
        if (banned && banned !== 'all')
          params.set('banned', banned === 'banned' ? 'true' : 'false');
        return api.getFull<PaginatedResult<UserRecord>>(`/api/users?${params}`);
      }
      return api.get<UserRecord[]>('/api/users');
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      api.patch<UserRecord>(`/api/users/${id}`, data),
    onSettled: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/${id}`),
    onSettled: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
