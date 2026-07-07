'use client';

import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { api } from './api';
import { useTenantFilter } from './tenant-filter-context';

// ─── Types ───────────────────────────────────────────────────────────

export interface Branch {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiBranch extends Branch {
  tenantId: string;
}

export interface Shipment {
  id: string;
  trackingNo: string;
  status: string;
  customerId: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  carrier: string;
  origin: string;
  destination: string;
  billAmount: string | null;
  labelCode: string | null;
  trackingRegistered: boolean;
  lastTrackedAt: string | null;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

// ─── Branch queries ──────────────────────────────────────────────────

export function useBranches(): UseQueryResult<ApiBranch[], Error>;
export function useBranches(page: number, limit?: number, search?: string): UseQueryResult<PaginatedResult<ApiBranch>, Error>;
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
  const { filterVersion } = useTenantFilter();
  return useMutation({
    mutationFn: (data: {
      name: string;
      phone?: string;
      email?: string;
      address?: string;
      tenantId?: string;
    }) => api.post<ApiBranch>('/api/branches', data),
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: ['branches'] });
      const prev = qc.getQueryData<ApiBranch[]>(['branches', filterVersion]);
      const optimistic: ApiBranch = {
        id: `temp-${Date.now()}`,
        name: data.name,
        phone: data.phone ?? null,
        email: data.email ?? null,
        address: data.address ?? null,
        tenantId: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueryData<ApiBranch[]>(['branches', filterVersion], (old) => [...(old ?? []), optimistic]);
      return { prev, optimistic };
    },
    onError: (_err, _data, context) => {
      if (context?.prev) qc.setQueryData(['branches', filterVersion], context.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}

export function useDeleteBranch() {
  const qc = useQueryClient();
  const { filterVersion } = useTenantFilter();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/branches/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['branches'] });
      const prev = qc.getQueryData<ApiBranch[]>(['branches', filterVersion]);
      qc.setQueryData<ApiBranch[]>(['branches', filterVersion], (old) => old?.filter((b) => b.id !== id) ?? []);
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) qc.setQueryData(['branches', filterVersion], context.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}

// ─── Tenant queries ──────────────────────────────────────────────────

export function useTenants() {
  return useQuery<{ id: string; name: string; country: string | null }[]>({
    queryKey: ['tenants'],
    queryFn: () => api.get<{ id: string; name: string; country: string | null }[]>('/api/tenants'),
  });
}

// ─── Dashboard queries ───────────────────────────────────────────────

export function useDashboardBranches() {
  const { filterVersion } = useTenantFilter();
  return useQuery<{ id: string; name: string }[]>({
    queryKey: ['dashboard-branches', filterVersion],
    queryFn: () => api.get<{ id: string; name: string }[]>('/api/dashboard/branches'),
  });
}

// ─── Customer queries ───────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  counts?: Record<string, number>;
}

export function useCustomers(): UseQueryResult<Customer[], Error>;
export function useCustomers(page: number, limit?: number): UseQueryResult<PaginatedResult<Customer>, Error>;
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

// ─── Shipment queries ───────────────────────────────────────────────

export function useShipments(): UseQueryResult<Shipment[], Error>;
export function useShipments(page: number, limit?: number, status?: string, search?: string): UseQueryResult<PaginatedResult<Shipment>, Error>;
export function useShipments(page?: number, limit?: number, status?: string, search?: string) {
  const { filterVersion } = useTenantFilter();
  const hasPage = page !== undefined && page > 0;
  return useQuery<Shipment[] | PaginatedResult<Shipment>>({
    queryKey: ['shipments', filterVersion, page, limit, status, search],
    queryFn: async () => {
      if (hasPage) {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit ?? 10));
        if (status && status !== 'all') params.set('status', status);
        if (search) params.set('search', search);
        return api.getFull<PaginatedResult<Shipment>>(`/api/shipments?${params}`);
      }
      return api.get<Shipment[]>('/api/shipments');
    },
  });
}

export function useShipmentTrend() {
  const { filterVersion } = useTenantFilter();
  return useQuery<{ date: string; total: number; intransit: number; delivered: number; pending: number }[]>({
    queryKey: ['shipment-trend', filterVersion],
    queryFn: () => api.get<{ date: string; total: number; intransit: number; delivered: number; pending: number }[]>('/api/shipments/trend'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<Shipment>('/api/shipments', data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
}

// ─── User queries ────────────────────────────────────────────────────

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string;
  banned: boolean | null;
  banReason: string | null;
  banExpires: string | null;
  tenantId: string | null;
  branchId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useUsers(): UseQueryResult<UserRecord[], Error>;
export function useUsers(page: number, limit?: number, search?: string, role?: string, banned?: string): UseQueryResult<PaginatedResult<UserRecord>, Error>;
export function useUsers(page?: number, limit?: number, search?: string, role?: string, banned?: string) {
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
        if (banned && banned !== 'all') params.set('banned', banned === 'banned' ? 'true' : 'false');
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

// ─── Invoice queries ─────────────────────────────────────────────────

export interface Invoice {
  id: string;
  invoiceNo: string;
  amount: string;
  status: string;
  emailCount: number;
  trackingNo: string;
  customerId: string;
  customerName: string | null;
  paidAt: string;
  createdAt: string;
}

export function useInvoices(search?: string): UseQueryResult<Invoice[], Error>;
export function useInvoices(search: string | undefined, page: number, limit?: number, status?: string): UseQueryResult<PaginatedResult<Invoice>, Error>;
export function useInvoices(search?: string, page?: number, limit?: number, status?: string) {
  const { filterVersion } = useTenantFilter();
  const hasPage = page !== undefined && page > 0;
  return useQuery<Invoice[] | PaginatedResult<Invoice>>({
    queryKey: ['invoices', filterVersion, search, page, limit, status],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (hasPage) {
        q.set('page', String(page));
        q.set('limit', String(limit ?? 10));
        if (status && status !== 'all') q.set('status', status);
      }
      const qs = q.toString();
      if (hasPage) {
        return api.getFull<PaginatedResult<Invoice>>(`/api/invoices?${qs}`);
      }
      return api.get<Invoice[]>(`/api/invoices${qs ? `?${qs}` : ''}`);
    },
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

// ─── Quotation queries ───────────────────────────────────────────────

export interface Quotation {
  id: string;
  quoteNo: string;
  customerId: string;
  customerName: string | null;
  total: number;
  status: string;
  validUntil: string | null;
  notes: string | null;
  items: LineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export function useQuotationTrend() {
  const { filterVersion } = useTenantFilter();
  return useQuery<{ date: string; total: number; draft: number; sent: number; accepted: number; rejected: number; converted: number }[]>({
    queryKey: ['quotation-trend', filterVersion],
    queryFn: () => api.get<{ date: string; total: number; draft: number; sent: number; accepted: number; rejected: number; converted: number }[]>('/api/quotations/trend'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useQuotations(): UseQueryResult<Quotation[], Error>;
export function useQuotations(page: number, limit?: number, status?: string, search?: string): UseQueryResult<PaginatedResult<Quotation>, Error>;
export function useQuotations(page?: number, limit?: number, status?: string, search?: string) {
  const { filterVersion } = useTenantFilter();
  const hasPage = page !== undefined && page > 0;
  return useQuery<Quotation[] | PaginatedResult<Quotation>>({
    queryKey: ['quotations', filterVersion, page, limit, status, search],
    queryFn: async () => {
      if (hasPage) {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit ?? 10));
        if (status && status !== 'all') params.set('status', status);
        if (search) params.set('search', search);
        return api.getFull<PaginatedResult<Quotation>>(`/api/quotations?${params}`);
      }
      return api.get<Quotation[]>('/api/quotations');
    },
  });
}

export function useQuotation(id: string) {
  return useQuery<Quotation>({
    queryKey: ['quotation', id],
    queryFn: () => api.get<Quotation>(`/api/quotations/${id}`),
    enabled: !!id,
  });
}

export function useCreateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<Quotation>('/api/quotations', data),
    onSettled: () => qc.invalidateQueries({ queryKey: ['quotations'] }),
  });
}

export function useUpdateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      api.patch<Quotation>(`/api/quotations/${id}`, data),
    onSettled: () => qc.invalidateQueries({ queryKey: ['quotations'] }),
  });
}

export function useDeleteQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/quotations/${id}`),
    onSettled: () => qc.invalidateQueries({ queryKey: ['quotations'] }),
  });
}

export function useUpdateQuotationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/quotations/${id}/status`, { status }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['quotation'] });
      qc.invalidateQueries({ queryKey: ['quotations'] });
    },
  });
}

export function useConvertQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, trackingNo }: { id: string; trackingNo: string }) =>
      api.post<Quotation>(`/api/quotations/${id}/convert`, { trackingNo }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['quotation'] }),
  });
}

// ─── Notification queries ────────────────────────────────────────────

export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

export function useNotifications(params: { type?: string; status?: string; page?: number; limit?: number }) {
  const { type, status, page = 1, limit = 20 } = params;
  return useQuery<{ data: NotificationRecord[]; total: number }>({
    queryKey: ['notifications', type, status, page, limit],
    queryFn: async () => {
      const q = new URLSearchParams();
      q.set('limit', String(limit));
      q.set('offset', String((page - 1) * limit));
      // ponytail: type/status filtering is client-side; backend only supports limit/offset/unread
      return api.getFull<{ data: NotificationRecord[]; total: number }>(`/api/notifications?${q}`);
    },
  });
}

export function useUnreadCount() {
  return useQuery<{ count: number }>({
    queryKey: ['unread-count'],
    queryFn: () => api.get<{ count: number }>('/api/notifications/unread-count'),
    refetchInterval: 30_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids }: { ids: string[] }) =>
      Promise.all(ids.map((id) => api.patch(`/api/notifications/${id}/read`, {}))),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/api/notifications/read-all', {}),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}

// ─── Single branch queries ───────────────────────────────────────────

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

// ─── Single shipment queries ─────────────────────────────────────────

export interface ShipmentDetail extends Shipment {
  trackingProvider: string | null;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  updatedAt: string;
}

export interface TrackingEvent {
  id: string;
  status: string;
  subStatus: string | null;
  description: string | null;
  location: string | null;
  carrier: string | null;
  eventTime: string;
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
    queryFn: () => api.get<{ shipment: object; events: TrackingEvent[] }>(`/api/shipments/${id}/tracking`),
    enabled: !!id,
  });
}

export function useTrackShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ newEvents: number; currentStatus: string }>(`/api/shipments/${id}/track`),
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

// ─── Invoice per shipment ────────────────────────────────────────────

export function useShipmentInvoice(shipmentId: string) {
  return useQuery<{ id: string; invoiceNo: string; amount: string; emailCount: number; createdAt: string } | null>({
    queryKey: ['shipment-invoice', shipmentId],
    queryFn: () => api.get<{ id: string; invoiceNo: string; amount: string; emailCount: number; createdAt: string } | null>(`/api/invoices/shipment/${shipmentId}`),
    enabled: !!shipmentId,
  });
}

export function useGenerateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shipmentId: string) =>
      api.post<{ id: string; invoiceNo: string; amount: string; emailCount: number; createdAt: string }>(`/api/invoices/shipment/${shipmentId}`),
    onSettled: (_data, _err, shipmentId) => {
      qc.invalidateQueries({ queryKey: ['shipment-invoice', shipmentId] });
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
  const { filterVersion } = useTenantFilter();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/shipments/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['shipments'] });
      const prev = qc.getQueryData<Shipment[]>(['shipments', filterVersion]);
      qc.setQueryData<Shipment[]>(['shipments', filterVersion], (old) => old?.filter((s) => s.id !== id) ?? []);
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) qc.setQueryData(['shipments', filterVersion], context.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
}
