'use client';

import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@heroui/react';
import { usePageTitle } from '@/lib/use-page-title';
import type { ChartRange } from '@/components/dashboard/types';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { SuperadminDashboard } from '@/components/dashboard/superadmin-dashboard';
import { useDashboardData } from '@/components/dashboard/use-dashboard-data';

export default function DashboardPage() {
  usePageTitle('Dashboard');

  // AC-10: one window, held here, driving the sparklines, the deltas, and the trend chart.
  const [range, setRange] = useState<ChartRange>('2w');

  const {
    session,
    isPending,
    stats,
    loading,
    error,
    fetchStats,
    user,
    tenantCurrency,
    resolvedTenantId,
  } = useDashboardData();

  if (isPending || (loading && !stats)) {
    return <DashboardSkeleton />;
  }

  if (!session || !user) return null;

  // A failed stats read leaves the page with nothing to draw, so it says so and
  // offers a retry instead of holding the skeleton forever.
  if (error && !stats) {
    return (
      <div className="w-full flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-sm content-panel p-8">
          <AlertTriangle size={28} className="text-danger-soft-foreground mx-auto mb-3" />
          <h1 className="text-lg font-semibold mb-2 tracking-tight">Something went wrong</h1>
          <p className="text-sm text-muted mb-4">{error}</p>
          <Button variant="primary" onPress={() => fetchStats()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  // Every server builder returns the aggregate `total` block, so a single
  // dashboard renders for every role. A payload without it is still loading, or
  // arrived from a cache written before a deploy, so the skeleton holds.
  if (!stats?.total) {
    return <DashboardSkeleton />;
  }

  return (
    <SuperadminDashboard
      stats={stats}
      onRetry={() => fetchStats()}
      isTenantScoped={user.role !== 'superadmin'}
      range={range}
      onRangeChange={setRange}
      tenantCurrency={tenantCurrency}
      isSingleTenant={!!resolvedTenantId}
    />
  );
}
