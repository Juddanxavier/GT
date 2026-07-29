import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';

interface RecentShipment {
  id: string;
  trackingNo: string;
  status: string;
  carrier: string | null;
  origin: string | null;
  destination: string | null;
  createdAt: string;
}

interface Alert {
  trackingNo: string;
  status: string;
  message: string;
}

export interface DashboardData {
  kpis: {
    total: number;
    inTransit: number;
    delivered: number;
    exception: number;
    pending: number;
  };
  recent: RecentShipment[];
  alerts: Alert[];
}

const API_BASE = '';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

// ── Notifications ──

export function useNotifications(): ReturnType<typeof useQuery<{ data: Notification[]; total: number }>> {
  return useQuery<{ data: Notification[]; total: number }>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/notifications?limit=50`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load notifications');
      return res.json();
    },
  });
}

export function useUnreadCount(): ReturnType<typeof useQuery<{ count: number }>> {
  return useQuery<{ count: number }>({
    queryKey: ['unread-count'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/notifications/unread-count`, { credentials: 'include' });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/api/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to mark as read');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/notifications/read-all`, { method: 'PATCH', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to mark all as read');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}

// ── Profile ──

interface Address {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name?: string;
      currentPassword?: string;
      newPassword?: string;
      phone?: string;
      branchId?: string;
      address?: Address;
    }) => {
      const res = await fetch(`${API_BASE}/api/customers/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) throw new Error((body as { error?: string }).error || 'Update failed');
      return body.data as { id: string; name: string; email: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await authClient.deleteUser();
      if (error) throw new Error(error.message || 'Failed to delete account');
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

// ── Dashboard ──

export function useCustomerDashboard(enabled = true): ReturnType<typeof useQuery<DashboardData>> {
  return useQuery<DashboardData>({
    queryKey: ['customer-dashboard'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/customers/my-dashboard`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load dashboard');
      return res.json();
    },
    enabled,
  });
}

// ── Shipments ──

export interface ShipmentRow {
  id: string;
  trackingNo: string;
  status: string;
  carrier: string | null;
  origin: string | null;
  destination: string | null;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  lastTrackedAt: string | null;
  labelCode: string | null;
  createdAt: string;
}

export interface ShipmentsResponse {
  data: ShipmentRow[];
  total: number;
  page: number;
  limit: number;
}

export function useMyShipments(page: number, limit: number, statusFilter: string) {
  return useQuery<ShipmentsResponse>({
    queryKey: ['my-shipments', page, limit, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${API_BASE}/api/customers/my-shipments?${params}`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) throw new Error('unauthorized');
        throw new Error('Failed to load shipments');
      }
      return res.json();
    },
    placeholderData: (prev) => prev,
  });
}

// ── Tracking ──

export interface TrackEvent {
  status: string;
  description: string | null;
  location: string | null;
  eventTime: string;
}

export interface TrackResult {
  trackingNo: string;
  status: string;
  carrier: string | null;
  origin: string | null;
  destination: string | null;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  lastTrackedAt: string | null;
  claimed: boolean;
  events: TrackEvent[];
}

export function useTrackShipment(trackingNo: string | undefined) {
  return useQuery<TrackResult>({
    queryKey: ['track-shipment', trackingNo],
    queryFn: async () => {
      if (!trackingNo) throw new Error('Tracking number required');
      const res = await fetch(`${API_BASE}/api/track/${encodeURIComponent(trackingNo)}`, { credentials: 'include' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || 'Shipment not found');
      }
      const body = await res.json();
      return body.data as TrackResult;
    },
    enabled: !!trackingNo,
  });
}

// ── Claim Shipment (mutation) ──

export function useClaimShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ trackingNo, email }: { trackingNo: string; email: string }) => {
      const res = await fetch(`${API_BASE}/api/track/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ trackingNo, email }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error((body as { error?: string }).error || 'Failed to claim');
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shipments'] });
    },
  });
}

