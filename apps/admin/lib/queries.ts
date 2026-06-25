'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export function useBranches() {
  const { filterVersion } = useTenantFilter();
  return useQuery<ApiBranch[]>({
    queryKey: ['branches', filterVersion],
    queryFn: () => api.get<ApiBranch[]>('/api/branches'),
  });
}

export function useBranchesForTenant(tenantId: string) {
  return useQuery<ApiBranch[]>({
    queryKey: ['branches', 'tenant', tenantId],
    queryFn: () => api.getForTenant<ApiBranch[]>('/api/branches', tenantId),
    enabled: !!tenantId,
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

export function useCustomers() {
  return useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => api.get<Customer[]>('/api/customers'),
  });
}

// ─── Shipment queries ───────────────────────────────────────────────

export function useShipments() {
  const { filterVersion } = useTenantFilter();
  return useQuery<Shipment[]>({
    queryKey: ['shipments', filterVersion],
    queryFn: () => api.get<Shipment[]>('/api/shipments'),
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

export function useUsers() {
  const { filterVersion } = useTenantFilter();
  return useQuery<UserRecord[]>({
    queryKey: ['users', filterVersion],
    queryFn: () => api.get<UserRecord[]>('/api/users'),
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
  paidAt: string;
  createdAt: string;
}

export function useInvoices(search?: string) {
  const { filterVersion } = useTenantFilter();
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  return useQuery<Invoice[]>({
    queryKey: ['invoices', filterVersion, search],
    queryFn: () => api.get<Invoice[]>(`/api/invoices${params}`),
  });
}

export function useSendInvoice() {
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ sent: boolean; emailCount: number }>(`/api/invoices/${id}/send`),
  });
}

// ─── Quotation queries ───────────────────────────────────────────────

export interface Quotation {
  id: string;
  quoteNumber: string;
  customerId: string;
  customerName: string | null;
  totalAmount: number;
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

export function useQuotations() {
  const { filterVersion } = useTenantFilter();
  return useQuery<Quotation[]>({
    queryKey: ['quotations', filterVersion],
    queryFn: () => api.get<Quotation[]>('/api/quotations'),
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
    onSettled: () => qc.invalidateQueries({ queryKey: ['quotation'] }),
  });
}

export function useConvertQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Quotation>(`/api/quotations/${id}/convert`),
    onSettled: () => qc.invalidateQueries({ queryKey: ['quotation'] }),
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
