'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { useTenantFilter } from '../tenant-filter-context';

export function useDashboardBranches() {
  const { filterVersion } = useTenantFilter();
  return useQuery<{ id: string; name: string }[]>({
    queryKey: ['dashboard-branches', filterVersion],
    queryFn: () => api.get<{ id: string; name: string }[]>('/api/dashboard/branches'),
  });
}
