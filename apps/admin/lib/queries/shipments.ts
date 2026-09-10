'use client';

import {
  keepPreviousData,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '../api';
import { useTenantFilter } from '../tenant-filter-context';
import type {
  CreateShipmentInput,
  PaginatedResult,
  Shipment,
  ShipmentDetail,
  TrackingEvent,
} from './types';

export function useShipments(): UseQueryResult<Shipment[], Error>;
export function useShipments(
  page: number,
  limit?: number,
  status?: string,
  search?: string,
  customerId?: string,
): UseQueryResult<PaginatedResult<Shipment>, Error>;
export function useShipments(
  page?: number,
  limit?: number,
  status?: string,
  search?: string,
  customerId?: string,
) {
  const { filterVersion } = useTenantFilter();
  const hasPage = page !== undefined && page > 0;
  return useQuery<Shipment[] | PaginatedResult<Shipment>>({
    queryKey: ['shipments', filterVersion, page, limit, status, search, customerId],
    queryFn: async () => {
      if (hasPage) {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit ?? 10));
        if (status && status !== 'all') params.set('status', status);
        if (search) params.set('search', search);
        if (customerId) params.set('customerId', customerId);
        return api.getFull<PaginatedResult<Shipment>>(`/api/shipments?${params}`);
      }
      return api.get<Shipment[]>('/api/shipments');
    },
    placeholderData: keepPreviousData,
  });
}

export function useShipmentTrend() {
  const { filterVersion } = useTenantFilter();
  return useQuery<
    {
      date: string;
      total: number;
      intransit: number;
      outfordelivery: number;
      delivered: number;
      pending: number;
      exception: number;
    }[]
  >({
    queryKey: ['shipment-trend', filterVersion],
    queryFn: () =>
      api.get<
        {
          date: string;
          total: number;
          intransit: number;
          outfordelivery: number;
          delivered: number;
          pending: number;
          exception: number;
        }[]
      >('/api/shipments/trend'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateShipmentInput) => api.post<Shipment>('/api/shipments', data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
}

export function useShipment(id: string) {
  return useQuery<ShipmentDetail>({
    queryKey: ['shipment', id],
    queryFn: () => api.get<ShipmentDetail>(`/api/shipments/${id}`),
    enabled: !!id,
  });
}

export function useShipmentTracking(id: string) {
  return useQuery<{ shipment: object; events: TrackingEvent[] }>({
    queryKey: ['shipment-tracking', id],
    queryFn: () =>
      api.get<{ shipment: object; events: TrackingEvent[] }>(`/api/shipments/${id}/tracking`),
    enabled: !!id,
  });
}

export function useTrackShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ newEvents: number; currentStatus: string }>(`/api/shipments/${id}/track`),
    onSettled: (_data, _err, id) => {
      qc.invalidateQueries({ queryKey: ['shipment', id] });
      qc.invalidateQueries({ queryKey: ['shipment-tracking', id] });
    },
  });
}

export function useStopTracking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/shipments/${id}/stop-tracking`),
    onSettled: (_data, _err, id) => {
      qc.invalidateQueries({ queryKey: ['shipment', id] });
    },
  });
}

export function useUpdateShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      api.patch<ShipmentDetail>(`/api/shipments/${id}`, data),
    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: ['shipment', id] });
      qc.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
}

export function useShipmentNotes(shipmentId: string) {
  return useQuery<Array<{ id: string; content: string; createdAt: string; createdBy: string }>>({
    queryKey: ['shipment-notes', shipmentId],
    queryFn: () => api.get(`/api/shipments/${shipmentId}/notes`),
    enabled: !!shipmentId,
  });
}

export function useDeleteShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/shipments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
}
