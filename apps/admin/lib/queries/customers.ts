'use client';

import { type UseQueryResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useTenantFilter } from '../tenant-filter-context';
import type { Customer, PaginatedResult } from './types';

export function useCustomers(): UseQueryResult<Customer[], Error>;
export function useCustomers(
  page: number,
  limit?: number,
): UseQueryResult<PaginatedResult<Customer>, Error>;
export function useCustomers(page?: number, limit?: number) {
  const { filterVersion } = useTenantFilter();
  const hasPage = page !== undefined && page > 0;
  return useQuery<Customer[] | PaginatedResult<Customer>>({
    queryKey: ['customers', filterVersion, page, limit],
    queryFn: async () => {
      if (hasPage) {
        const params = new URLSearchParams({ page: String(page), limit: String(limit ?? 50) });
        return api.getFull<PaginatedResult<Customer>>(`/api/customers?${params}`);
      }
      return api.get<Customer[]>('/api/customers');
    },
  });
}

export function useCustomerSearch(search: string) {
  const { filterVersion } = useTenantFilter();
  return useQuery<Customer[]>({
    queryKey: ['customer-search', filterVersion, search],
    queryFn: () => api.get<Customer[]>(`/api/customers?search=${encodeURIComponent(search)}`),
    enabled: search.length >= 2,
  });
}

export function useAssignShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ shipmentId, customerId }: { shipmentId: string; customerId: string | null }) =>
      api.put(`/api/shipments/${shipmentId}/assign`, { customerId }),
    onSuccess: (_, { shipmentId }) => {
      qc.invalidateQueries({ queryKey: ['shipment', shipmentId] });
      qc.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
}
