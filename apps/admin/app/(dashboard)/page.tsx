'use client';

import { useState } from 'react';
import { usePageTitle } from '@/lib/use-page-title';
import type { ChartRange } from '@/components/dashboard/types';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { OperationalDashboard } from '@/components/dashboard/operational-dashboard';
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
    branches,
    branchFilter,
    setBranchFilter,
    fetchStats,
    user,
  } = useDashboardData();

  if (isPending || (loading && !stats)) {
    return <DashboardSkeleton />;
  }

  if (!session || !user) return null;

  const role = user.role;
  const userName = user.name || user.email || 'User';
  const branchName = user.branchName;
  const isSuperadmin = role === 'superadmin';
  const isTenantAdmin = role === 'tenant-admin';
  const isStaff = role === 'staff';

  if (stats?.total) {
    return (
      <SuperadminDashboard
        stats={stats}
        onRetry={() => fetchStats()}
        isTenantScoped={!isSuperadmin}
        range={range}
        onRangeChange={setRange}
      />
    );
  }

  return (
    <OperationalDashboard
      stats={stats}
      loading={loading}
      error={error}
      role={role}
      isTenantAdmin={isTenantAdmin}
      isStaff={isStaff}
      userName={userName}
      branchName={branchName}
      branches={branches}
      branchFilter={branchFilter}
      onBranchChange={setBranchFilter}
      onRetry={() => fetchStats()}
      range={range}
      onRangeChange={setRange}
    />
  );
}
