'use client';

import { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Hourglass,
  Package,
  Truck,
  WifiOff,
} from 'lucide-react';
import { TrackQuotaCard } from '@/components/track-quota-card';
import { AlertsPanel } from './alerts-panel';
import { CommandHeader } from './command-header';
import { KpiGroup } from './kpi-stat-card';
import { PerEntityTable } from './per-entity-table';
import { ShipmentTrendChart } from './shipment-trend-chart';
import { StatusBreakdown } from './status-breakdown';
import { KPI_COLORS } from './kpi-colors';
import type { KpiItem, Stats, TickerItem } from './types';
import {
  chartVolumeData,
  formatCurrency,
  pctStr,
  periodTrend,
  resolveShipments,
  resolveSparklines,
  statusLabel,
  trendDir,
} from './utils';

export function SuperadminDashboard({
  stats,
  onRetry,
  isTenantScoped,
}: {
  stats: Stats;
  onRetry: () => void;
  isTenantScoped?: boolean;
}) {
  const t = stats.total!;
  const shipments = resolveShipments(stats);
  const rawPerDay = stats.perDay ?? shipments.perDay ?? [];
  const perDayForChart = chartVolumeData(rawPerDay, 30);
  const trendPct = useMemo(() => periodTrend(perDayForChart), [perDayForChart]);
  const sparks = useMemo(
    () => resolveSparklines(stats.shipmentTrend, rawPerDay),
    [stats.shipmentTrend, rawPerDay],
  );

  const ticker: TickerItem[] = [
    { label: 'in transit', value: t.shipments.inTransit },
    { label: 'delivered today', value: t.shipments.deliveredToday },
    { label: 'exceptions', value: t.shipments.exceptions },
    { label: 'revenue this month', value: formatCurrency(t?.invoices?.revenueThisMonth ?? '0') },
  ];

  const activeKpis: KpiItem[] = [
    {
      icon: <Truck size={18} />,
      label: 'In Transit',
      value: t.shipments.inTransit,
      color: KPI_COLORS.inTransit,
      trend: trendDir(trendPct),
      trendValue: pctStr(trendPct),
      spark: sparks.inTransit,
      chart: 'line',
    },
    {
      icon: <CheckCircle size={18} />,
      label: 'Delivered Today',
      value: t.shipments.deliveredToday,
      color: KPI_COLORS.delivered,
      trend: trendDir(trendPct),
      trendValue: pctStr(trendPct),
      spark: sparks.delivered,
      chart: 'bars',
    },
    {
      icon: <Package size={18} />,
      label: 'Total Shipments',
      value: t.shipments.total,
      color: KPI_COLORS.total,
      sublabel: isTenantScoped ? 'all branches' : 'all tenants',
      trend: 'neutral',
      trendValue: '—',
      spark: sparks.total,
      chart: 'line',
    },
  ];

  const problemKpis: KpiItem[] = [
    {
      icon: <AlertTriangle size={18} />,
      label: 'Exceptions',
      value: t.shipments.exceptions,
      color: KPI_COLORS.exceptions,
      trend: 'neutral',
      trendValue: '—',
      spark: sparks.exceptions,
      chart: 'bars',
    },
    {
      icon: <Hourglass size={18} />,
      label: 'Overdue',
      value: shipments.overdue,
      color: KPI_COLORS.overdue,
      sublabel: 'past ETA',
      trend: 'neutral',
      trendValue: '—',
      spark: [shipments.overdue, Math.max(t.shipments.total - shipments.overdue, 1)],
      chart: 'donut',
    },
    {
      icon: <WifiOff size={18} />,
      label: 'Not Tracked',
      value: shipments.notTracked,
      color: KPI_COLORS.notTracked,
      sublabel: 'not registered',
      trend: 'neutral',
      trendValue: '—',
      spark: [shipments.notTracked, Math.max(t.shipments.total - shipments.notTracked, 1)],
      chart: 'donut',
    },
  ];

  const donutData = Object.entries(shipments.byStatus)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: statusLabel(k), value: v }));

  const tableMode = isTenantScoped ? 'branch' : 'tenant';

  return (
    <div className="w-full space-y-5">
      <CommandHeader
        title={isTenantScoped ? 'Admin Overview' : 'Super Admin'}
        roleLabel={isTenantScoped ? 'tenant-admin' : 'superadmin'}
        ticker={ticker}
        onRefresh={onRetry}
      />

      <KpiGroup title="Active Shipments" items={activeKpis} />
      <KpiGroup title="Needs Attention" items={problemKpis} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <ShipmentTrendChart
            data={perDayForChart}
            title={isTenantScoped ? 'Shipments — All Branches' : 'Shipments — All Tenants'}
          />
        </div>
        <div className="lg:col-span-4">
          <StatusBreakdown data={donutData} />
        </div>
      </div>

      <PerEntityTable
        mode={tableMode}
        perBranch={stats.perBranch}
        perTenant={stats.perTenant}
      />

      <AlertsPanel alerts={stats.alerts ?? []} />

      <div className="max-w-md">
        <TrackQuotaCard />
      </div>
    </div>
  );
}
