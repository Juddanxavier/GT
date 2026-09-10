'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { NotificationRecord } from './types';

export function useNotifications(params: {
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
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
  return useQuery({
    queryKey: ['unread-count'],
    queryFn: () => api.getFull<{ count: number }>('/api/notifications/unread-count'),
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
