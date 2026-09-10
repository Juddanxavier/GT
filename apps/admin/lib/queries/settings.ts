'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useTenantFilter } from '../tenant-filter-context';
import type { NotificationPrefs } from './types';

export function useIntegrations() {
  return useQuery<{
    email: { configured: boolean; provider: string | null };
    whatsapp: { configured: boolean };
    track17: { configured: boolean };
  }>({
    queryKey: ['settings-integrations'],
    queryFn: () => api.get('/api/settings/integrations'),
  });
}

export function useTemplatePreviews() {
  return useQuery<
    {
      event: string;
      title: string;
      emailHtml: string;
      whatsapp: { templateId: string; variables: Record<string, string> } | null;
    }[]
  >({
    queryKey: ['settings-template-previews'],
    queryFn: () => api.get('/api/settings/template-previews'),
  });
}

export function useNotificationPrefs() {
  const { filterVersion } = useTenantFilter();
  return useQuery<Partial<NotificationPrefs>>({
    queryKey: ['notification-prefs', filterVersion],
    queryFn: () => api.getFull<Partial<NotificationPrefs>>('/api/notification-preferences'),
  });
}

export function useUpdateNotificationPrefs() {
  const queryClient = useQueryClient();
  const { filterVersion } = useTenantFilter();
  return useMutation({
    mutationFn: (prefs: Partial<NotificationPrefs>) =>
      api.getFull<NotificationPrefs>('/api/notification-preferences', {
        method: 'PUT',
        body: JSON.stringify(prefs),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-prefs', filterVersion] });
    },
  });
}
