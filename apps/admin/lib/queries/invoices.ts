'use client';

import { type UseQueryResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useTenantFilter } from '../tenant-filter-context';
import type { Invoice, PaginatedResult } from './types';

export function useInvoices(search?: string): UseQueryResult<Invoice[], Error>;
export function useInvoices(
  search: string | undefined,
  page: number,
  limit?: number,
  status?: string,
  userId?: string,
): UseQueryResult<PaginatedResult<Invoice>, Error>;
export function useInvoices(
  search?: string,
  page?: number,
  limit?: number,
  status?: string,
  userId?: string,
) {
  const { filterVersion } = useTenantFilter();
  const hasPage = page !== undefined && page > 0;
  return useQuery<Invoice[] | PaginatedResult<Invoice>>({
    queryKey: ['invoices', filterVersion, search, page, limit, status, userId],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (hasPage) {
        q.set('page', String(page));
        q.set('limit', String(limit ?? 10));
        if (status && status !== 'all') q.set('status', status);
        if (userId) q.set('userId', userId);
      }
      const qs = q.toString();
      if (hasPage) {
        return api.getFull<PaginatedResult<Invoice>>(`/api/invoices?${qs}`);
      }
      return api.get<Invoice[]>(`/api/invoices${qs ? `?${qs}` : ''}`);
    },
  });
}

export function useInvoiceTrend() {
  const { filterVersion } = useTenantFilter();
  return useQuery<{ date: string; total: number; paid: number; unpaid: number }[]>({
    queryKey: ['invoice-trend', filterVersion],
    queryFn: () =>
      api.get<{ date: string; total: number; paid: number; unpaid: number }[]>(
        '/api/invoices/trend',
      ),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSendInvoice() {
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ sent: boolean; emailCount: number }>(`/api/invoices/${id}/send`),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ success: boolean }>(`/api/invoices/${id}`),
    onSettled: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

export function useShipmentInvoice(shipmentId: string) {
  return useQuery<{
    id: string;
    invoiceNo: string;
    amount: string;
    emailCount: number;
    createdAt: string;
  } | null>({
    queryKey: ['shipment-invoice', shipmentId],
    queryFn: () =>
      api.get<{
        id: string;
        invoiceNo: string;
        amount: string;
        emailCount: number;
        createdAt: string;
      } | null>(`/api/invoices/shipment/${shipmentId}`),
    enabled: !!shipmentId,
  });
}

export function useGenerateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shipmentId: string) =>
      api.post<{
        id: string;
        invoiceNo: string;
        amount: string;
        emailCount: number;
        createdAt: string;
      }>(`/api/invoices/shipment/${shipmentId}`),
    onSettled: (_data, _err, shipmentId) => {
      qc.invalidateQueries({ queryKey: ['shipment-invoice', shipmentId] });
    },
  });
}
