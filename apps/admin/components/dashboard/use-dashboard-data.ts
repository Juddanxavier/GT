'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { api, ApiError } from '@/lib/api';
import { useTenantFilter } from '@/lib/tenant-filter-context';
import { useTenants } from '@/lib/queries';
import { connectSocket } from '@/lib/socket';
import { dashboardStatsSchema } from '@/lib/validation';
import { getUser } from '@/types/auth';
import type { Branch, Stats } from './types';

export function useDashboardData() {
  const { data: session, isPending } = authClient.useSession();
  const { tenantFilter, branchFilter, filterVersion, setBranch } = useTenantFilter();
  const { data: tenantsData = [] } = useTenants();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);

  const sessionUser = getUser(session);
  const tenantCurrency = useMemo(() => {
    const tid = tenantFilter || sessionUser?.tenantId || '';
    return tenantsData.find((t) => t.id === tid)?.currency;
  }, [tenantFilter, sessionUser?.tenantId, tenantsData]);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (branchFilter) params.set('branchId', branchFilter);
      const res = await api.get(
        `/api/dashboard/stats${params.toString() ? `?${params.toString()}` : ''}`,
        { schema: dashboardStatsSchema },
      );
      setStats(res as Stats);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [branchFilter, filterVersion, tenantFilter]);

  useEffect(() => {
    if (isPending || !session) return;
    const tenantId = getUser(session)?.tenantId;
    const role = getUser(session)?.role;

    fetchStats();

    if (role === 'tenant-admin' || role === 'staff') {
      api
        .get<Branch[]>('/api/dashboard/branches')
        .then((b) => setBranches(b ?? []))
        .catch((e) => console.error('[dashboard] branches fetch failed:', e));
    }

    if (!tenantId) return;
    const socket = connectSocket(tenantId);
    socket.on('dashboard:update', () => fetchStats());
    return () => {
      socket.off('dashboard:update');
    };
  }, [session, isPending, fetchStats]);

  return {
    session,
    isPending,
    stats,
    loading,
    error,
    branches,
    branchFilter,
    setBranchFilter: setBranch,
    fetchStats,
    tenantCurrency,
    user: sessionUser,
  };
}
