'use client';

import { usePageTitle } from '@/lib/use-page-title';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { OperationalDashboard } from '@/components/dashboard/operational-dashboard';
import { SuperadminDashboard } from '@/components/dashboard/superadmin-dashboard';
import { useDashboardData } from '@/components/dashboard/use-dashboard-data';

export default function DashboardPage() {
  usePageTitle('Dashboard');

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
    tenantCurrency,
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
      currencyCode={tenantCurrency ?? undefined}
    />
  );
}
